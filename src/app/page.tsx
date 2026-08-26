import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import ThemeToggle from '@/components/ThemeToggle'
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  User,
  ShieldAlert,
  Compass,
  Bus,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react'

export const revalidate = 0

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    isAdmin = !!profile?.is_admin
  }

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select(`
      id,
      opponent,
      venue,
      match_date,
      kickoff_time,
      departure_time,
      pickup_location,
      coaches (
        id,
        coach_number,
        seat_capacity,
        is_active,
        bookings (id, payment_status)
      ),
      pricing_tiers (
        tier_name,
        standard_price,
        member_price
      )
    `)
    .eq('is_active', true)
    .order('match_date', { ascending: true })

  return (
    <main className="min-h-screen bg-salop-night text-slate-900 dark:text-slate-100 p-6 md:p-12 transition-colors">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header with Shrewsbury Town Crest & Theme Toggle */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-salop-border pb-6">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 flex items-center justify-center p-0.5 rounded-2xl bg-salop-surface border border-salop-border shadow-xl overflow-hidden">
              <img
                src="/crest.webp"
                alt="Shrewsbury Town FC Crest"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Away Travel Club
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-[#ffc72c] uppercase tracking-wider">
                  Official Travel
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Official supporter coach travel • Floreat Salopia
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/tracker"
              className="inline-flex items-center gap-1.5 rounded-xl bg-salop-surface border border-salop-border px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-[#ffc72c] hover:bg-slate-100 dark:hover:bg-salop-border/80 transition shadow-sm"
            >
              <Compass className="h-3.5 w-3.5 text-salop-blue" />
              92 Stadium Tracker
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin/fixtures"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition shadow-sm"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Admin Portal
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-salop-surface border border-salop-border px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-salop-border/80 transition shadow-sm"
                >
                  <User className="h-3.5 w-3.5 text-salop-blue dark:text-[#ffc72c]" />
                  My Account
                </Link>
                <SignOutButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-salop-border bg-salop-surface px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-salop-border/80 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-[#0057b8] dark:bg-[#ffc72c] px-4 py-2 text-xs font-black text-white dark:text-[#070b14] hover:opacity-90 transition shadow-lg"
                >
                  Join Club
                </Link>
              </div>
            )}

            <ThemeToggle />
          </div>
        </header>

        {/* HERO / WELCOME & HOW IT WORKS OVERVIEW */}
        <section className="rounded-3xl border border-salop-border bg-salop-card p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-salop-blue dark:text-[#ffc72c] uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                Follow Salop On The Road
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                Hassle-Free Official Supporter Travel
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Reliable executive coach travel for every Shrewsbury Town away fixture. Direct stadium drop-offs, convenient Shropshire pickup points, and zero booking fees.
              </p>
            </div>

            {!user && (
              <Link
                href="/register"
                className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-salop-blue dark:bg-[#ffc72c] px-5 py-3 text-xs font-black text-white dark:text-[#070b14] hover:opacity-90 transition shadow-lg"
              >
                Join & Save on Fares
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* 3 Step Process */}
          <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-salop-border">
            <div className="rounded-2xl border border-salop-border bg-salop-surface p-4 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-salop-blue flex items-center justify-center font-black text-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pick Stop & Seats</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your local stop across Shropshire (Croud Meadow, Harlescott, Telford, Whitchurch, Oswestry).
              </p>
            </div>

            <div className="rounded-2xl border border-salop-border bg-salop-surface p-4 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#ffc72c] flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Flexible Payments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pay securely online with card or simply reserve your seat and pay cash to the steward on matchday.
              </p>
            </div>

            <div className="rounded-2xl border border-salop-border bg-salop-surface p-4 space-y-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Track the 92</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Show your instant digital boarding pass, travel with fellow fans, and log stadiums on your 92 passport map.
              </p>
            </div>
          </div>
        </section>

        {/* FIXTURES SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bus className="h-5 w-5 text-salop-blue dark:text-[#ffc72c]" />
              Upcoming Away Fixtures
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Departing from Shropshire</span>
          </div>

          {!fixtures || fixtures.length === 0 ? (
            <div className="rounded-2xl border border-salop-border bg-salop-card p-10 text-center text-slate-500 dark:text-slate-400">
              No upcoming away coaches currently scheduled. Check back soon!
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {fixtures.map((fixture) => {
                let totalCapacity = 0
                let totalBooked = 0

                fixture.coaches?.forEach((coach: any) => {
                  if (coach.is_active) {
                    totalCapacity += coach.seat_capacity
                    const activeBookings =
                      coach.bookings?.filter(
                        (b: any) => b.payment_status !== 'cancelled'
                      ) || []
                    totalBooked += activeBookings.length
                  }
                })

                const seatsRemaining = Math.max(0, totalCapacity - totalBooked)
                const adultPrice = fixture.pricing_tiers?.find(
                  (p: any) => p.tier_name === 'Adult'
                )

                return (
                  <div
                    key={fixture.id}
                    className="flex flex-col justify-between rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl transition hover:border-salop-blue"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-salop-blue dark:text-[#ffc72c]">
                            Away Fixture
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {fixture.opponent}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{fixture.venue}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            seatsRemaining === 0
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : seatsRemaining <= 10
                              ? 'bg-amber-500/10 text-amber-600 dark:text-[#ffc72c] border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {seatsRemaining === 0
                            ? 'Sold Out'
                            : `${seatsRemaining} seats left`}
                        </span>
                      </div>

                      <div className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="h-4 w-4 text-salop-blue dark:text-[#ffc72c]" />
                          <span>
                            {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                              timeZone: 'Europe/London',
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-4 w-4 text-salop-blue" />
                          <span>
                            Departs:{' '}
                            <strong className="text-slate-900 dark:text-white">
                              {fixture.departure_time?.slice(0, 5) || 'TBD'}
                            </strong>{' '}
                            (KO: {fixture.kickoff_time?.slice(0, 5) || 'TBD'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>Pickup: {fixture.pickup_location || 'Main Stadium'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-salop-border pt-4">
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">From</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-900 dark:text-white">
                            £{adultPrice?.member_price ? Number(adultPrice.member_price).toFixed(2) : '20.00'}
                          </span>
                          <span className="text-xs font-bold text-salop-blue dark:text-[#ffc72c]">(Member)</span>
                        </div>
                      </div>

                      {seatsRemaining > 0 ? (
                        <Link
                          href={`/fixture/${fixture.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0057b8] dark:bg-[#ffc72c] px-5 py-2.5 text-sm font-black text-white dark:text-[#070b14] hover:opacity-90 transition shadow-lg"
                        >
                          Book Seats
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="rounded-xl bg-slate-200 dark:bg-salop-border px-4 py-2.5 text-sm font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                        >
                          Sold Out
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
