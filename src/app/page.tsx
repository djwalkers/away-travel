import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  User,
  ShieldAlert,
  Compass
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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Away Travel Club
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Official supporter coach travel. Book online or reserve your seat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/tracker"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition shadow-sm"
            >
              <Compass className="h-3.5 w-3.5" />
              92 Stadium Tracker
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin/fixtures"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition shadow-sm"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Admin Portal
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  My Account
                </Link>
                <SignOutButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow-lg"
                >
                  Join Club
                </Link>
              </div>
            )}
          </div>
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-200">Upcoming Away Fixtures</h2>

          {!fixtures || fixtures.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
              No away travel currently scheduled. Check back soon!
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
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg transition hover:border-slate-700"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                            Away Match
                          </span>
                          <h3 className="text-2xl font-bold text-white mt-1">
                            {fixture.opponent}
                          </h3>
                          <p className="text-sm text-slate-400">{fixture.venue}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            seatsRemaining === 0
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : seatsRemaining <= 10
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {seatsRemaining === 0
                            ? 'Sold Out'
                            : `${seatsRemaining} seats left`}
                        </span>
                      </div>

                      <div className="mt-6 space-y-2.5 text-sm text-slate-300">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>
                            {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>
                            Departs:{' '}
                            <strong className="text-white">
                              {fixture.departure_time.slice(0, 5)}
                            </strong>{' '}
                            (KO: {fixture.kickoff_time.slice(0, 5)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>Pickup: {fixture.pickup_location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-4">
                      <div>
                        <span className="text-xs text-slate-400 block">From</span>
                        <span className="text-lg font-bold text-white">
                          £{adultPrice?.member_price ? Number(adultPrice.member_price).toFixed(2) : '20.00'}
                        </span>
                        <span className="text-xs text-emerald-400 ml-1.5">(Member)</span>
                      </div>

                      {seatsRemaining > 0 ? (
                        <Link
                          href={`/fixture/${fixture.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          Book Seats
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
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
