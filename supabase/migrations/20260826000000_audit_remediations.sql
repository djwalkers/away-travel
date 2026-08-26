-- ====================================================================
-- AWAY TRAVEL CLUB: PRODUCTION SECURITY & CONCURRENCY MIGRATION
-- ====================================================================

-- 1. Helper function: Admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 2. Trigger: Prevent non-admins from self-escalating is_admin or is_member
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_member := OLD.is_member;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_privileged_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_privileged_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- 3. Profiles RLS: Self or Admin
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 4. Bookings RLS: Self or Admin
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "bookings_update_admin" ON public.bookings;
CREATE POLICY "bookings_update_admin" ON public.bookings FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Coaches RLS & Public Capacity View (Hides hire_cost P&L from public)
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaches_select" ON public.coaches;
DROP POLICY IF EXISTS "coaches_select_admin_only" ON public.coaches;
CREATE POLICY "coaches_select_admin_only" ON public.coaches FOR SELECT
  USING (public.is_admin());

-- View used by public booking page to read coach availability without exposing hire_cost
CREATE OR REPLACE VIEW public.coach_capacity AS
  SELECT 
    c.id, 
    c.fixture_id, 
    c.coach_number, 
    c.seat_capacity, 
    c.is_active,
    COUNT(b.id) FILTER (WHERE b.payment_status <> 'cancelled')::int AS booked_count
  FROM public.coaches c
  LEFT JOIN public.bookings b ON b.coach_id = c.id
  GROUP BY c.id;

GRANT SELECT ON public.coach_capacity TO anon, authenticated;

-- 6. Backstop Capacity Trigger: Prevents overbooking even under high concurrency
CREATE OR REPLACE FUNCTION public.enforce_coach_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_capacity INT;
  v_count INT;
BEGIN
  SELECT seat_capacity INTO v_capacity FROM public.coaches WHERE id = NEW.coach_id;
  SELECT COUNT(*) INTO v_count FROM public.bookings
  WHERE coach_id = NEW.coach_id AND payment_status <> 'cancelled';

  IF v_count > v_capacity THEN
    RAISE EXCEPTION 'Coach capacity exceeded (% / % seats)', v_count, v_capacity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_coach_capacity ON public.bookings;
CREATE TRIGGER trg_enforce_coach_capacity
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_capacity();

-- 7. Dual-Lock Waitlist Promotion RPC
CREATE OR REPLACE FUNCTION public.promote_waitlist_supporter(
  p_waitlist_id UUID,
  p_coach_id UUID,
  p_tier_name TEXT DEFAULT 'Adult'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry RECORD;
  v_coach RECORD;
  v_booked INT;
  v_tier RECORD;
  v_amount NUMERIC;
  v_reference TEXT := 'TC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
BEGIN
  -- Dual row lock
  SELECT * INTO v_entry FROM public.waiting_list
    WHERE id = p_waitlist_id AND status = 'waiting' FOR UPDATE;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Waitlist entry already actioned or not found'; 
  END IF;

  SELECT * INTO v_coach FROM public.coaches WHERE id = p_coach_id FOR UPDATE;
  IF NOT FOUND OR NOT v_coach.is_active THEN 
    RAISE EXCEPTION 'Target coach unavailable'; 
  END IF;

  SELECT COUNT(*) INTO v_booked FROM public.bookings
    WHERE coach_id = p_coach_id AND payment_status <> 'cancelled';
  IF v_booked + COALESCE(v_entry.seats_requested, 1) > v_coach.seat_capacity THEN
    RAISE EXCEPTION 'Not enough seats on Coach % (% remaining)',
      v_coach.coach_number, v_coach.seat_capacity - v_booked;
  END IF;

  SELECT * INTO v_tier FROM public.pricing_tiers
    WHERE fixture_id = v_entry.fixture_id AND tier_name = p_tier_name;
  v_amount := COALESCE(v_tier.standard_price, 20.00) * COALESCE(v_entry.seats_requested, 1);

  INSERT INTO public.bookings (
    fixture_id, coach_id, user_id, passenger_name, phone_number, tier_name,
    amount_paid, payment_method, payment_status, pickup_point, stripe_session_id
  ) VALUES (
    v_entry.fixture_id, p_coach_id, v_entry.user_id, v_entry.supporter_name, v_entry.contact_phone, p_tier_name,
    v_amount, 'pay_on_coach', 'reserved', COALESCE(v_entry.pickup_point, 'Croud Meadow (Main Stand)'), v_reference
  );

  UPDATE public.waiting_list SET status = 'promoted'
    WHERE id = p_waitlist_id;

  RETURN jsonb_build_object(
    'success', true,
    'supporter_name', v_entry.supporter_name,
    'coach_number', v_coach.coach_number,
    'booking_reference', v_reference,
    'total_amount', v_amount,
    'phone', v_entry.contact_phone
  );
END;
$$;

-- 8. Secure Steward Manifest RPC (Verifies Admin status before returning phone numbers)
CREATE OR REPLACE FUNCTION public.get_steward_manifest(p_coach_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_coach JSONB;
  v_fixture JSONB;
  v_bookings JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  SELECT to_jsonb(c) INTO v_coach FROM public.coaches c WHERE c.id = p_coach_id;
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'Coach not found.';
  END IF;

  SELECT to_jsonb(f) INTO v_fixture 
  FROM public.fixtures f 
  WHERE f.id = (v_coach->>'fixture_id')::UUID;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'passenger_name', b.passenger_name,
      'phone_number', COALESCE(b.phone_number, p.phone_number, 'N/A'),
      'email', p.email,
      'tier_name', b.tier_name,
      'amount_paid', b.amount_paid,
      'payment_method', b.payment_method,
      'payment_status', b.payment_status,
      'pickup_point', b.pickup_point,
      'is_boarded', b.is_boarded,
      'created_at', b.created_at,
      'user_id', b.user_id
    ) ORDER BY b.passenger_name ASC
  ) INTO v_bookings
  FROM public.bookings b
  LEFT JOIN public.profiles p ON b.user_id = p.id
  WHERE b.coach_id = p_coach_id AND b.payment_status <> 'cancelled';

  RETURN jsonb_build_object(
    'coach', v_coach,
    'fixture', v_fixture,
    'bookings', COALESCE(v_bookings, '[]'::jsonb)
  );
END;
$$;

-- 9. Atomic Booking Creation Function (Server-priced + Locked capacity)
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_fixture_id UUID,
  p_coach_id UUID,
  p_passenger_name TEXT,
  p_phone_number TEXT,
  p_tier_name TEXT,
  p_pickup_point TEXT,
  p_payment_method TEXT DEFAULT 'pay_on_coach'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coach RECORD;
  v_booked_count INT;
  v_price NUMERIC;
  v_user_id UUID := auth.uid();
  v_is_member BOOLEAN := false;
  v_booking_id UUID;
  v_ref TEXT := 'TC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
BEGIN
  -- Lock coach row
  SELECT * INTO v_coach FROM public.coaches WHERE id = p_coach_id AND fixture_id = p_fixture_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected coach does not exist for this fixture.';
  END IF;

  SELECT COUNT(*) INTO v_booked_count 
  FROM public.bookings 
  WHERE coach_id = p_coach_id AND payment_status <> 'cancelled';

  IF v_booked_count >= v_coach.seat_capacity THEN
    RAISE EXCEPTION 'This coach is now full. Please join the waiting list.';
  END IF;

  -- Server-side membership verification
  IF v_user_id IS NOT NULL THEN
    SELECT (membership_number IS NOT NULL AND TRIM(membership_number) <> '') INTO v_is_member 
    FROM public.profiles WHERE id = v_user_id;
  END IF;

  -- Server-side pricing calculation
  IF v_is_member THEN
    SELECT COALESCE(member_price, standard_price) INTO v_price
    FROM public.pricing_tiers
    WHERE fixture_id = p_fixture_id AND tier_name = p_tier_name;
  ELSE
    SELECT standard_price INTO v_price
    FROM public.pricing_tiers
    WHERE fixture_id = p_fixture_id AND tier_name = p_tier_name;
  END IF;

  IF v_price IS NULL THEN
    v_price := 20.00;
  END IF;

  INSERT INTO public.bookings (
    fixture_id, coach_id, user_id, passenger_name, phone_number,
    tier_name, amount_paid, payment_method, payment_status, pickup_point, stripe_session_id
  ) VALUES (
    p_fixture_id, p_coach_id, v_user_id, TRIM(p_passenger_name), TRIM(p_phone_number),
    p_tier_name, v_price, 'pay_on_coach', 'reserved', p_pickup_point, v_ref
  ) RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_reference', v_ref,
    'amount', v_price
  );
END;
$$;

-- 10. Phone constraints & format helper
CREATE OR REPLACE FUNCTION public.normalize_uk_phone(raw TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN raw IS NULL OR raw = '' THEN NULL
    WHEN regexp_replace(raw, '[^0-9]', '', 'g') ~ '^0' THEN
      '+44' || substring(regexp_replace(raw, '[^0-9]', '', 'g') from 2)
    WHEN regexp_replace(raw, '[^0-9]', '', 'g') ~ '^44' THEN
      '+' || regexp_replace(raw, '[^0-9]', '', 'g')
    ELSE raw
  END;
$$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format
  CHECK (phone_number IS NULL OR phone_number ~ '^\+?[0-9 ]{10,16}$');
