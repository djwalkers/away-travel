'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import SignOutButton from '@/components/SignOutButton'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Bus,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CreditCard,
  Banknote,
  Sparkles,
  UserPlus
} from 'lucide-react'

export default function FixtureBookingPage() {
  const params = useParams()
  const router = useRouter()
  const fixtureId = params?.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fixture, setFixture] = useState<any>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [pickupLocations, setPickupLocations] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Booking Form State
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [passengerName, setPassengerName] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [selectedTier, setSelectedTier] = useState<string>('Adult')
  const [selectedPickup, setSelectedPickup] = useState<string>('Croud Meadow (Main Stand)')
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Waiting List State
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistSeats, setWaitlistSeats] = useState(1)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)

  useEffect(() => {
    if (!fixtureId) return
    loadFixtureData()
  }, [fixtureId])

  async function loadFixtureData() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)

    if (authUser) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (prof) {
        setProfile(prof)
        setPassengerName(prof.full_name || '')
        setPhoneNumber(prof.phone_number || '')
        if (prof.preferred_pickup) setSelectedPickup(prof.preferred_pickup)
      }
    }

    // 1. Fetch Fixture Details & Tiers
    const { data: fixData } = await supabase
      .from('fixtures')
      .select(`
        *,
        pricing_tiers (*),
        pickup_locations (*)
      `)
      .eq('id', fixtureId)
      .single()

    if (fixData) {
      setFixture(fixData)
      setPricingTiers(fixData.pricing_tiers || [])
      setPickupLocations(fixData.pickup_locations || [])
    }

    // 2. Fetch Coach Availability from public view (protects hire_cost P&L)
    const { data: capacityData } = await supabase
      .from('coach_capacity')
      .select('*')
      .eq('fixture_id', fixtureId)
      .eq('is_active', true)
      .order('coach_number', { ascending: true })

    if (capacityData) {
      setCoaches(capacityData)
      const available = capacityData.find((c) => c.seat_capacity - c.booked_count > 0)
      if (available) setSelectedCoachId(available.id)
      else if (capacityData.length > 0) setSelectedCoachId(capacityData[0].id)
    }

    setLoading(false)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      if (!selectedCoachId) throw new Error('Please select an available coach.')
      if (!passengerName.trim()) throw new Error('Please enter passenger full name.')
      if (!phoneNumber.trim()) throw new Error('Please provide a contact mobile number for matchday roll call.')

      // Atomic Server-Side Booking RPC
      const { data, error } = await supabase.rpc('create_booking_atomic', {
        p_fixture_id: fixtureId,
        p_coach_id: selectedCoachId,
        p_passenger_name: passengerName.trim(),
        p_phone_number: phoneNumber.trim(),
        p_tier_name: selectedTier,
        p_pickup_point: selectedPickup,
        p_payment_method: 'pay_on_coach'
      })

      if (error) throw error

      setBookingSuccess(data)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete booking reservation.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.from('waiting_list').insert({
        fixture_id: fixtureId,
        user_id: user?.id || null,
        supporter_name: passengerName.trim(),
        contact_phone: phoneNumber.trim(),
        seats_requested: waitlistSeats,
        pickup_point: selectedPickup,
        status: 'waiting'
      })

      if (error) throw error

      setWaitlistSuccess(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join waiting list.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-salop-night text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-salop-gold" />
      </div>
    )
  }

  const selectedCoach = coaches.find((c) => c.id === selectedCoachId)
  const seatsLeft = selectedCoach ? Math.max(0, selectedCoach.seat_capacity - selectedCoach.booked_count) : 0
  const isMember = Boolean(profile?.membership_number && profile.membership_number.trim() !== '')

  const currentTier = pricingTiers.find((t) => t.tier_name === selectedTier)
  const priceToPay = isMember && currentTier?.member_price
    ? Number(currentTier.member_price)
    : Number(currentTier?.standard_price || 20)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-salop-night text-slate-900 dark:text-slate-100 p-6 md:p-12 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-salop-border pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fixtures
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && <SignOutButton />}
          </div>
        </div>

        {/* Fixture Summary Banner */}
        <div className="rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-salop-blue dark:text-salop-gold">
                Official Supporter Away Coach
              </span>
              <h1 className="text-3xl font-black text-white mt-0.5">
                vs {fixture?.opponent}
              </h1>
              <p className="text-xs text-slate-400">{fixture?.venue}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                seatsLeft > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {seatsLeft > 0 ? `${seatsLeft} seats remaining` : 'Coaches Full'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-salop-border text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-salop-gold" />
              <span>
                {new Date(fixture?.match_date).toLocaleDateString('en-GB', {
                  timeZone: 'Europe/London',
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-salop-blue" />
              <span>Departs: {fixture?.departure_time?.slice(0, 5) || '09:30'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>KO: {fixture?.kickoff_time?.slice(0, 5) || '15:00'}</span>
            </div>
          </div>
        </div>

        {/* SUCCESS STATE */}
        {bookingSuccess ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-salop-card p-8 text-center space-y-4 shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Seat Reserved Successfully!</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your seat is confirmed for <strong>vs {fixture.opponent}</strong> on Coach {selectedCoach?.coach_number || 1}.
              Your booking reference is <strong className="font-mono text-salop-gold">{bookingSuccess.booking_reference}</strong>.
            </p>
            <div className="p-4 rounded-xl bg-salop-surface border border-salop-border text-xs text-slate-300 space-y-1 max-w-md mx-auto">
              <div>Passenger: <strong>{passengerName}</strong></div>
              <div>Pickup Stop: <strong>{selectedPickup}</strong></div>
              <div>Fare: <strong>£{Number(bookingSuccess.amount).toFixed(2)}</strong> (Pay Cash on Coach)</div>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/account"
                className="rounded-xl bg-salop-gold px-6 py-2.5 text-xs font-black text-salop-night hover:opacity-90 transition shadow-lg"
              >
                View Matchday Pass
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-salop-border bg-salop-surface px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Done
              </Link>
            </div>
          </div>
        ) : seatsLeft === 0 ? (
          /* SOLD OUT / WAITLIST STATE */
          <div className="rounded-2xl border border-amber-500/30 bg-salop-card p-8 text-center space-y-4 shadow-xl">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 text-salop-gold flex items-center justify-center mx-auto">
              <UserPlus className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-white">Coach Travel Currently Full</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All seats on active coaches are currently reserved. Join the official waiting list to get 1st priority when cancellations happen or extra coaches are added!
            </p>

            {waitlistSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                ✓ You have joined the priority waiting list! The committee will reach out via WhatsApp/SMS if a seat opens.
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto space-y-3 pt-2">
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-salop-gold"
                />
                <input
                  type="tel"
                  required
                  placeholder="Mobile Phone (for WhatsApp notification)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-salop-gold"
                />
                <div className="flex gap-2">
                  <select
                    value={waitlistSeats}
                    onChange={(e) => setWaitlistSeats(Number(e.target.value))}
                    className="rounded-xl border border-salop-border bg-salop-night px-3 py-2.5 text-xs text-white"
                  >
                    <option value={1}>1 Seat</option>
                    <option value={2}>2 Seats</option>
                    <option value={3}>3 Seats</option>
                    <option value={4}>4 Seats</option>
                  </select>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-salop-gold px-4 py-2.5 text-xs font-black text-salop-night hover:opacity-90 transition shadow"
                  >
                    {submitting ? 'Joining...' : 'Join Priority Waiting List'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleBookingSubmit} className="rounded-2xl border border-salop-border bg-salop-card p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Supporter Coach Booking</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reserve your seat now. Pay cash on board the coach on matchday.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Coach Selector */}
            {coaches.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Bus className="h-3.5 w-3.5 text-salop-gold" />
                  Select Coach
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {coaches.map((c) => {
                    const left = Math.max(0, c.seat_capacity - c.booked_count)
                    return (
                      <button
                        type="button"
                        key={c.id}
                        disabled={left === 0}
                        onClick={() => setSelectedCoachId(c.id)}
                        className={`p-3 rounded-xl border text-left text-xs transition ${
                          selectedCoachId === c.id
                            ? 'border-salop-gold bg-salop-gold/10 text-salop-gold font-bold'
                            : left === 0
                            ? 'border-salop-border bg-salop-night opacity-40 cursor-not-allowed'
                            : 'border-salop-border bg-salop-surface text-slate-300'
                        }`}
                      >
                        <div className="font-bold">Coach {c.coach_number}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{left} seats left</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Passenger Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Passenger Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Andy Walker"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-salop-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="07123 456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-salop-gold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">For matchday roll call & coach departure updates.</span>
              </div>
            </div>

            {/* Pricing Tier Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Fare Category</label>
              <div className="grid sm:grid-cols-3 gap-2.5">
                {pricingTiers.map((tier) => {
                  const fare = isMember && tier.member_price ? tier.member_price : tier.standard_price
                  return (
                    <button
                      type="button"
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.tier_name)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedTier === tier.tier_name
                          ? 'border-salop-gold bg-salop-gold/10 text-salop-gold'
                          : 'border-salop-border bg-salop-surface text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{tier.tier_name}</div>
                      <div className="text-sm font-black text-white mt-0.5">
                        £{Number(fare).toFixed(2)}
                        {isMember && <span className="text-[10px] text-salop-gold font-normal ml-1">(Member)</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pickup Location Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-salop-gold" />
                Select Pickup Location
              </label>
              <select
                value={selectedPickup}
                onChange={(e) => setSelectedPickup(e.target.value)}
                className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-salop-gold"
              >
                {pickupLocations.length > 0 ? (
                  pickupLocations.map((loc) => (
                    <option key={loc.id} value={loc.location_name}>
                      {loc.location_name} (Departs: {loc.pickup_time?.slice(0, 5)})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Croud Meadow (Main Stand)">Croud Meadow (Main Stand)</option>
                    <option value="Harlescott (Tesco Express / Layby)">Harlescott (Tesco Express / Layby)</option>
                    <option value="Telford Services (M54 J4)">Telford Services (M54 J4)</option>
                    <option value="Whitchurch (Bypass Layby)">Whitchurch (Bypass Layby)</option>
                    <option value="Oswestry (Bus Station / Mile End)">Oswestry (Bus Station / Mile End)</option>
                  </>
                )}
              </select>
            </div>

            {/* Payment Method Notice */}
            <div className="rounded-xl border border-salop-border bg-salop-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-salop-gold/10 text-salop-gold flex items-center justify-center">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Reserve Seat • Pay Cash on Coach</div>
                  <div className="text-[11px] text-slate-400">Pay your fare to the coach steward upon boarding.</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total Due</span>
                <span className="text-lg font-black text-salop-gold">£{priceToPay.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-salop-gold py-3 text-xs font-black text-salop-night hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming Reservation...
                </>
              ) : (
                'Confirm Seat Reservation'
              )}
            </button>
          </form>
        )}

      </div>
    </main>
  )
}
