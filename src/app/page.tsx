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
  Sparkles,
  UserPlus
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
      is_active,
      is_released,
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
    .order('match_date', { ascending: true })

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 p-6 md:p-12 transition-colors">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1a2742] pb-6">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 flex items-center justify-center p-0.5 rounded-2xl bg-white dark:bg-[#0e1726] border border-slate-200 dark:border-[#1a2742] shadow-xl overflow-hidden">
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
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-700 dark:text-[#ffc72c] uppercase tracking-wider">
                  Official Travel
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Official supporter coach travel • Floreat Salopia
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/tracker"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#0e1726] border border-slate-200 dark:border-[#1a2742] px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-[#ffc72c] hover:bg-slate-100 dark:hover:bg-[#1a2742] transition shadow-sm"
            >
              <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-[#ffc72c]" />
              92 Stadium Tracker
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin/fixtures"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition shadow-sm"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Admin Portal
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#0e1726] border border-slate-200 dark:border-[#1a2742] px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-[#1a2742] transition shadow-sm"
                >
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-[#ffc72c]" />
                  My Account
                </Link>
                <SignOutButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0e1726] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2742] transition"
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

        {/* Hero Section */}
        <section className="rounded-3xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-[#ffc72c] uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                Follow Salop On The Road
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                Official Season Away Travel Schedule
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                Reliable supporter coach travel for every Shrewsbury Town away match. View upcoming fixtures, live seat availability, and book online.
              </p>
            </div>

            {!user && (
              <Link
                href="/register"
                className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-[#0057b8] dark:bg-[#ffc72c] px-5 py-3 text-xs font-black text-white dark:text-[#070b14] hover:opacity-90 transition shadow-lg"
              >
                Join & Save on Fares
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {/* Fixtures Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600 dark:text-[#ffc72c]" />
              Away Fixtures & Travel Status
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fixtures?.length || 0} fixtures on calendar
            </span>
          </div>

          {!fixtures || fixtures.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] p-10 text-center text-slate-500 dark:text-slate-400">
              No away fixtures scheduled.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {fixtures.map((fixture) => {
                const activeCoaches = fixture.coaches?.filter((c: any) => c.is_active) || []
                const isReleased = Boolean(fixture.is_released && fixture.is_active && activeCoaches.length > 0)

                let totalCapacity = 0
                let totalBooked = 0

                activeCoaches.forEach((coach: any) => {
                  totalCapacity += coach.seat_capacity
                  const booked = coach.bookings?.filter((b: any) => b.payment_status !== 'cancelled') || []
                  totalBooked += booked.length
                })

                const seatsRemaining = Math.max(0, totalCapacity - totalBooked)
                const adultPrice = fixture.pricing_tiers?.find((p: any) => p.tier_name === 'Adult')

                return (
                  <div
                    key={fixture.id}
                    className={`flex flex-col justify-between rounded-2xl border p-6 shadow-xl transition ${
                      isReleased
                        ? 'border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] hover:border-blue-500 dark:hover:border-blue-600'
                        : 'border-slate-200/60 dark:border-[#1a2742]/60 bg-white/70 dark:bg-[#0a1220]/70'
                    }`}
                  >
                    <div>
                      {/* Top Header & Status Badge */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-[#ffc72c]">
                            Away Match
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {fixture.opponent}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{fixture.venue}</p>
                        </div>

                        {/* Status Badges */}
                        {!isReleased ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0">
                            Travel TBC
                          </span>
                        ) : seatsRemaining === 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                            Sold Out
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                              seatsRemaining <= 10
                                ? 'bg-amber-500/10 text-amber-700 dark:text-[#ffc72c] border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {seatsRemaining} seats left
                          </span>
                        )}
                      </div>

                      {/* Match Details */}
                      <div className="mt-6 space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-[#ffc72c]" />
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
                          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>
                            {isReleased ? (
                              <>
                                Departs:{' '}
                                <strong className="text-slate-900 dark:text-white">
                                  {fixture.departure_time?.slice(0, 5) || 'TBD'}
                                </strong>{' '}
                                (KO: {fixture.kickoff_time?.slice(0, 5) || 'TBD'})
                              </>
                            ) : (
                              <>Kickoff: {fixture.kickoff_time?.slice(0, 5) || 'TBD'} • Departure TBC</>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Pickup: {isReleased ? fixture.pickup_location || 'Shropshire Stops' : 'Stops Announced on Release'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Booking Action Bar */}
                    <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-[#1a2742] pt-4">
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          {isReleased ? 'From' : 'Fare'}
                        </span>
                        <div className="flex items-baseline gap-1">
                          {isReleased && adultPrice?.member_price ? (
                            <>
                              <span className="text-xl font-black text-slate-900 dark:text-white">
                                £{Number(adultPrice.member_price).toFixed(2)}
                              </span>
                              <span className="text-xs font-bold text-blue-600 dark:text-[#ffc72c]">(Member)</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Pricing TBC</span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {!isReleased ? (
                        <span className="rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-100 dark:bg-[#0e1726] px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-default">
                          Travel Details Soon
                        </span>
                      ) : seatsRemaining > 0 ? (
                        <Link
                          href={`/fixture/${fixture.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0057b8] dark:bg-[#ffc72c] px-5 py-2.5 text-sm font-black text-white dark:text-[#070b14] hover:opacity-90 transition shadow-lg"
                        >
                          Book Seats
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          href={`/fixture/${fixture.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-black text-amber-700 dark:text-[#ffc72c] hover:bg-amber-500/20 transition"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Join Waitlist
                        </Link>
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
