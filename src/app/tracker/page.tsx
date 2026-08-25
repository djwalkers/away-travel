import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { STADIUMS_92, calculateRoundTripMiles } from '@/lib/data/grounds92'
import GroundsMapWrapper from '@/components/GroundsMapWrapper'
import {
  ArrowLeft,
  Compass,
  CheckCircle2,
  Navigation,
  User,
  Bus,
  Lock
} from 'lucide-react'

export const revalidate = 0

interface Props {
  searchParams: Promise<{ view?: string }>
}

export default async function TrackerPage({ searchParams }: Props) {
  const supabase = await createClient()
  const params = await searchParams
  const requestedView = params?.view

  // 1. Get Current Logged-in Supporter
  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Default to personal view if logged in, otherwise club view
  const currentView = user ? (requestedView === 'club' ? 'club' : 'personal') : 'club'

  // 2. Fetch All Club Fixtures (Club-Wide Total)
  const { data: allFixtures } = await supabase
    .from('fixtures')
    .select('opponent, match_date')

  const clubOpponents = (allFixtures || []).map((f) => f.opponent)

  // 3. Fetch Personal Bookings (If User is Logged In)
  let personalOpponents: string[] = []
  if (user) {
    const { data: userBookings } = await supabase
      .from('bookings')
      .select(`
        payment_status,
        fixtures (
          opponent
        )
      `)
      .eq('user_id', user.id)
      .neq('payment_status', 'cancelled')

    personalOpponents = (userBookings || [])
      .map((b: any) => b.fixtures?.opponent)
      .filter(Boolean)
  }

  // Active dataset based on view
  const activeOpponents = currentView === 'personal' ? personalOpponents : clubOpponents

  // 4. Compute 92 Club Progress & Mileage
  const visitedStadiums = STADIUMS_92.filter((s) =>
    activeOpponents.some(
      (v) =>
        s.club.toLowerCase().includes(v.toLowerCase()) ||
        v.toLowerCase().includes(s.club.toLowerCase())
    )
  )

  const visitedCount = visitedStadiums.length
  const totalStadiums = 92
  const progressPercent = Math.round((visitedCount / totalStadiums) * 100)

  const totalMilesTraveled = visitedStadiums.reduce(
    (sum, s) => sum + calculateRoundTripMiles(s.lat, s.lng),
    0
  )

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Fixtures
            </Link>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
              <Compass className="h-8 w-8 text-emerald-400" />
              92 Club Stadium Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {currentView === 'personal'
                ? 'Your individual supporter away passport, personal grounds, and mileage.'
                : 'Collective away journeys and mileage logged by the Travel Club fleet.'}
            </p>
          </div>

          {/* Personal vs Club Toggle */}
          {user ? (
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
              <Link
                href="/tracker?view=personal"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  currentView === 'personal'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                My Personal 92
              </Link>
              <Link
                href="/tracker?view=club"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  currentView === 'club'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bus className="h-3.5 w-3.5" />
                Club Fleet 92
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              Sign in to track your personal 92
            </Link>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 block">
              {currentView === 'personal' ? 'Your Grounds Visited' : 'Club Grounds Visited'}
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              {visitedCount} <span className="text-sm font-normal text-slate-500">/ {totalStadiums}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">The 92 Club Target</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 block">92 Completion</span>
            <div className="text-3xl font-extrabold text-white mt-1">{progressPercent}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 block">
              {currentView === 'personal' ? 'Your Away Miles' : 'Total Club Miles'}
            </span>
            <div className="text-3xl font-extrabold text-blue-400 mt-1">
              {totalMilesTraveled.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Round-trip road miles</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 block">Tracking Mode</span>
            <div className="text-2xl font-bold text-white mt-1 capitalize">
              {currentView === 'personal' ? 'Individual' : 'All Supporters'}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Live Database Sync</span>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-400" />
              {currentView === 'personal' ? 'Your Personal Visited Map' : 'Club Fleet Route Map'}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
                Visited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span>
                Unvisited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                Home HQ
              </span>
            </div>
          </div>

          <GroundsMapWrapper stadiums={STADIUMS_92} visitedOpponents={activeOpponents} />
        </div>

        {/* Checklist Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              {currentView === 'personal' ? 'Your Completed Ground Passport' : 'Club Visited Grounds'}
            </h3>
            <span className="text-xs text-slate-400">{visitedStadiums.length} grounds logged</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                <th className="py-3 px-4">Club</th>
                <th className="py-3 px-4">Stadium</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4 text-right">Round-Trip Distance</th>
                <th className="py-3 px-4 text-center">92 Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 text-xs">
              {visitedStadiums.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    {currentView === 'personal'
                      ? 'You have not booked any away matches yet. Book your first coach seat to start ticking off the 92!'
                      : 'No club away matches logged yet.'}
                  </td>
                </tr>
              ) : (
                visitedStadiums.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{s.club}</td>
                    <td className="py-3 px-4 text-slate-400">{s.stadium}</td>
                    <td className="py-3 px-4">{s.league}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">
                      ~{calculateRoundTripMiles(s.lat, s.lng)} miles
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Ticked Off
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}
