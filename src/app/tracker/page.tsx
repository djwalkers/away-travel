'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Compass,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Bus,
  ShieldAlert,
  Loader2,
  Navigation,
  Globe,
  Trophy,
  Filter
} from 'lucide-react'

// Dynamically import map with SSR disabled (prevents Next.js window rendering errors)
const StadiumMap = dynamic(() => import('@/components/StadiumMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] md:h-[480px] rounded-2xl border border-[#1a2742] bg-[#0a1220] flex items-center justify-center text-slate-400 text-xs font-bold gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-[#ffc72c]" />
      Loading Interactive 92 Stadium Map...
    </div>
  )
})

const STADIUM_DISTANCES: Record<string, { stadium: string; league: string; roundTripMiles: number }> = {
  'rochdale': { stadium: 'Crown Oil Arena', league: 'League Two', roundTripMiles: 168 },
  'fleetwood town': { stadium: 'Highbury Stadium', league: 'League Two', roundTripMiles: 210 },
  'wrexham': { stadium: 'STōK Cae Ras', league: 'League One', roundTripMiles: 64 },
  'wrexham afc': { stadium: 'STōK Cae Ras', league: 'League One', roundTripMiles: 64 },
  'stockport county': { stadium: 'Edgeley Park', league: 'League One', roundTripMiles: 140 },
  'crewe alexandra': { stadium: 'Mornflake Stadium', league: 'League Two', roundTripMiles: 72 },
  'port vale': { stadium: 'Vale Park', league: 'League Two', roundTripMiles: 92 },
  'walsall': { stadium: 'Poundland Bescot Stadium', league: 'League Two', roundTripMiles: 78 },
  'bristol rovers': { stadium: 'Memorial Stadium', league: 'League One', roundTripMiles: 214 },
  'reading': { stadium: 'Select Car Leasing Stadium', league: 'League One', roundTripMiles: 276 },
  'blackpool': { stadium: 'Bloomfield Road', league: 'League One', roundTripMiles: 202 },
  'exeter city': { stadium: 'St James Park', league: 'League One', roundTripMiles: 340 },
  'carlisle united': { stadium: 'Brunton Park', league: 'League Two', roundTripMiles: 330 }
}

export default function StadiumTrackerPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [bookedGrounds, setBookedGrounds] = useState<any[]>([])

  // Map Filter State: 'all' | 'league' | 'visited'
  const [mapFilter, setMapFilter] = useState<'all' | 'league' | 'visited'>('all')

  useEffect(() => {
    loadTrackerData()
  }, [])

  async function loadTrackerData() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)

    if (authUser) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          passenger_name,
          payment_status,
          is_boarded,
          created_at,
          fixtures (
            id,
            opponent,
            venue,
            match_date,
            kickoff_time
          )
        `)
        .eq('user_id', authUser.id)
        .neq('payment_status', 'cancelled')
        .order('created_at', { ascending: false })

      if (bookings) {
        const todayStr = new Date().toISOString().split('T')[0]
        const groundsMap = new Map<string, any>()

        bookings.forEach((b: any) => {
          const fix = b.fixtures
          if (!fix) return

          const opponentKey = fix.opponent.toLowerCase().trim()
          const info = STADIUM_DISTANCES[opponentKey] || {
            stadium: fix.venue,
            league: 'EFL',
            roundTripMiles: 150
          }

          const isPast = fix.match_date < todayStr || b.is_boarded

          if (!groundsMap.has(opponentKey)) {
            groundsMap.set(opponentKey, {
              opponent: fix.opponent,
              stadium: info.stadium,
              league: info.league,
              roundTripMiles: info.roundTripMiles,
              matchDate: fix.match_date,
              kickoff: fix.kickoff_time,
              isCompleted: isPast,
              isUpcoming: !isPast
            })
          }
        })

        setBookedGrounds(Array.from(groundsMap.values()))
      }
    }

    setLoading(false)
  }

  const completedClubs = bookedGrounds.filter((g) => g.isCompleted).map((g) => g.opponent)
  const upcomingClubs = bookedGrounds.filter((g) => g.isUpcoming).map((g) => g.opponent)
  const completedCount = completedClubs.length
  const upcomingCount = upcomingClubs.length
  const totalMiles = bookedGrounds.reduce((sum, g) => sum + g.roundTripMiles, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#ffc72c]" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-[#1a2742] pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fixtures
          </Link>
          <span className="text-xs font-bold text-[#ffc72c]">Shrewsbury Town FC Away Club</span>
        </div>

        {/* Header & Stats Dashboard */}
        <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffc72c]/10 text-[#ffc72c] border border-[#ffc72c]/30 text-xs font-bold">
                <Compass className="h-4 w-4" />
                92 Stadium Passport
              </span>
              <h1 className="text-3xl font-black text-white mt-3">
                Away Grounds Tracker
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Explore every English league ground and track your journey following Salop across the country.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-4 text-center min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visited</span>
                <span className="text-2xl font-black text-emerald-400">{completedCount}</span>
                <span className="text-[10px] text-slate-500 block">/ 92 Grounds</span>
              </div>

              <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-4 text-center min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Booked</span>
                <span className="text-2xl font-black text-[#ffc72c]">{upcomingCount}</span>
                <span className="text-[10px] text-slate-500 block">Upcoming</span>
              </div>

              <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-4 text-center min-w-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coach Miles</span>
                <span className="text-2xl font-black text-white">{totalMiles}</span>
                <span className="text-[10px] text-slate-500 block">Round-Trip</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Map Section with 3-Way Filter */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-[#ffc72c]" />
              <h2 className="text-base font-bold text-white">Interactive Stadium Map</h2>
            </div>

            {/* 3-Way Filter Buttons */}
            <div className="flex items-center p-1 rounded-xl bg-[#0e1726] border border-[#1a2742] w-fit">
              <button
                type="button"
                onClick={() => setMapFilter('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mapFilter === 'all'
                    ? 'bg-[#ffc72c] text-[#070b14] shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                All 92 Grounds
              </button>

              <button
                type="button"
                onClick={() => setMapFilter('league')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mapFilter === 'league'
                    ? 'bg-[#0057b8] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                League Grounds
              </button>

              <button
                type="button"
                onClick={() => setMapFilter('visited')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mapFilter === 'visited'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Visited & Booked ({completedCount + upcomingCount})
              </button>
            </div>
          </div>

          {/* Map Component */}
          <StadiumMap
            filterMode={mapFilter}
            visitedClubs={completedClubs}
            bookedClubs={upcomingClubs}
          />

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#0057b8] border border-white inline-block"></span>

http://googleusercontent.com/map_location_reference/1
                [The Croud Meadow](http://googleusercontent.com/map_location_reference/0) (HQ)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white inline-block"></span>
                Visited
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ffc72c] border border-white inline-block"></span>
                Booked Upcoming
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-600 border border-white inline-block"></span>
                Unvisited
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 sm:mt-0">Click any pin to view club, stadium, and league details</span>
          </div>
        </div>

        {/* Passport Table Log */}
        <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#1a2742] flex items-center justify-between">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#ffc72c]" />
              Your Ground Passport Log
            </h2>
            <span className="text-xs text-slate-400">
              {bookedGrounds.length} ground(s) logged
            </span>
          </div>

          {!user ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-400">Please sign in to view your personalized 92 Stadium Passport.</p>
              <Link
                href="/login"
                className="inline-flex rounded-xl bg-[#ffc72c] px-4 py-2 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition"
              >
                Sign In
              </Link>
            </div>
          ) : bookedGrounds.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm space-y-2">
              <Bus className="h-8 w-8 text-slate-600 mx-auto" />
              <p>You have not booked any away matches yet.</p>
              <p className="text-xs text-slate-600">Book your first coach seat on the home page to start ticking off the 92!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1a2742] bg-[#0e1726]/60 text-slate-400">
                    <th className="p-3.5 font-bold">Club</th>
                    <th className="p-3.5 font-bold">Stadium</th>
                    <th className="p-3.5 font-bold">Match Date</th>
                    <th className="p-3.5 font-bold">Round-Trip</th>
                    <th className="p-3.5 font-bold text-right">92 Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2742]">
                  {bookedGrounds.map((ground, idx) => (
                    <tr key={idx} className="hover:bg-[#0e1726]/40 transition">
                      <td className="p-3.5 font-bold text-white text-sm">{ground.opponent}</td>
                      <td className="p-3.5 text-slate-300">{ground.stadium}</td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(ground.matchDate).toLocaleDateString('en-GB', {
                          timeZone: 'Europe/London',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-3.5 text-slate-300 font-mono">~{ground.roundTripMiles} miles</td>
                      <td className="p-3.5 text-right">
                        {ground.isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Ground Visited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-[#ffc72c] border border-[#ffc72c]/30">
                            <Clock className="h-3 w-3" /> Booked / Upcoming
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
