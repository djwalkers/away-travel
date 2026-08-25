import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  User,
  ArrowLeft,
  Ticket
} from 'lucide-react'

export const revalidate = 0

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      passenger_name,
      tier_name,
      amount_paid,
      payment_method,
      payment_status,
      pickup_point,
      created_at,
      coaches (
        coach_number,
        seat_capacity
      ),
      fixtures (
        id,
        opponent,
        venue,
        match_date,
        kickoff_time,
        departure_time,
        pickup_location
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const allBookings = (bookings as any[]) || []
  const today = new Date().toISOString().split('T')[0]

  const upcomingBookings = allBookings.filter(
    (b) => b.fixtures && b.fixtures.match_date >= today && b.payment_status !== 'cancelled'
  )
  const pastBookings = allBookings.filter(
    (b) => b.fixtures && (b.fixtures.match_date < today || b.payment_status === 'cancelled')
  )

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Fixtures
            </Link>
            <h1 className="text-3xl font-extrabold text-white">Supporter Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage your coach seats, pickup points, and matchday passes.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-lg transition"
            >
              Book Travel
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{profile?.full_name || user.email}</h2>
                {profile?.is_member && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> Member
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user.email} {profile?.phone && `• ${profile.phone}`}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Total Bookings</span>
              <strong className="text-lg text-white font-bold">{allBookings.length} Seats</strong>
            </div>
            {profile?.membership_number && (
              <div>
                <span className="text-xs text-slate-500 block">Member Number</span>
                <strong className="text-sm text-emerald-400 font-mono">{profile.membership_number}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Trips */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-400" />
            Upcoming Away Trips ({upcomingBookings.length})
          </h2>

          {upcomingBookings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              You have no upcoming coach trips booked.
              <div className="mt-3">
                <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
                  Browse Upcoming Away Fixtures →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Away Fixture</span>
                      <h3 className="text-2xl font-extrabold text-white mt-0.5">{b.fixtures?.opponent}</h3>
                      <p className="text-sm text-slate-400">{b.fixtures?.venue}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        b.payment_status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {b.payment_status === 'paid' ? 'Paid & Confirmed' : 'Reserved (Pay on Coach)'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-slate-300">
                    <div>
                      <span className="text-xs text-slate-500 block">Passenger</span>
                      <strong className="text-white">{b.passenger_name}</strong>
                      <span className="text-xs text-slate-400 block">({b.tier_name})</span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block">Coach Allocation</span>
                      <strong className="text-blue-400">Coach {b.coaches?.coach_number || 1}</strong>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block">Match Date & KO</span>
                      <span className="text-white">{b.fixtures?.match_date}</span>
                      <span className="text-xs text-slate-400 block">KO {b.fixtures?.kickoff_time?.slice(0, 5)}</span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block">Amount</span>
                      <strong className="text-white">£{Number(b.amount_paid).toFixed(2)}</strong>
                      <span className="text-xs text-slate-400 block">via {b.payment_method === 'card' ? 'Card' : 'Cash'}</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>Pickup Stop: <strong className="text-white">{b.pickup_point || b.fixtures?.pickup_location}</strong></span>
                    </div>
                    {b.payment_method === 'pay_on_coach' && (
                      <span className="text-amber-400 font-medium">Please bring £{Number(b.amount_paid).toFixed(2)} cash</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Travel History */}
        {pastBookings.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <h2 className="text-lg font-bold text-slate-400">Past Travel History</h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-500 uppercase">
                    <th className="py-3 px-4">Match</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Passenger</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 text-xs">
                  {pastBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="py-3 px-4 font-semibold text-white">{b.fixtures?.opponent}</td>
                      <td className="py-3 px-4 text-slate-400">{b.fixtures?.match_date}</td>
                      <td className="py-3 px-4">{b.passenger_name} ({b.tier_name})</td>
                      <td className="py-3 px-4 text-right">£{Number(b.amount_paid).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
