'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Bus,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Navigation,
  FileSpreadsheet,
  X
} from 'lucide-react'

export default function AdminFixturesPage() {
  const supabase = createClient()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  // Release Modal State
  const [selectedFixture, setSelectedFixture] = useState<any | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [departureTime, setDepartureTime] = useState<string>('09:30')
  const [coachCapacity, setCoachCapacity] = useState<number>(53)
  const [adultPrice, setAdultPrice] = useState<number>(20)
  const [memberPrice, setMemberPrice] = useState<number>(18)
  const [releasing, setReleasing] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)

    // 1. Fetch Fixtures
    const { data: fixData } = await supabase
      .from('fixtures')
      .select(`
        id,
        opponent,
        venue,
        match_date,
        kickoff_time,
        departure_time,
        is_active,
        is_released,
        coaches (
          id,
          coach_number,
          seat_capacity,
          bookings (id, payment_status)
        )
      `)
      .order('match_date', { ascending: true })

    if (fixData) setFixtures(fixData)

    // 2. Fetch Preset Routes & Master Stops
    const { data: routeData } = await supabase
      .from('pickup_routes')
      .select(`
        id,
        name,
        description,
        master_pickup_stops (
          id,
          location_name,
          minute_offset,
          sort_order
        )
      `)

    if (routeData) {
      setRoutes(routeData)
      if (routeData.length > 0) setSelectedRouteId(routeData[0].id)
    }

    setLoading(false)
  }

  const handleTriggerSync = async () => {
    setSyncing(true)
    setSyncStatus(null)
    try {
      const res = await fetch('/api/sync-fixtures')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sync')
      setSyncStatus(data.message || 'Fixtures synced successfully!')
      loadDashboard()
    } catch (err: any) {
      setSyncStatus(err.message || 'Failed to sync remote fixture feed.')
    } finally {
      setSyncing(false)
    }
  }

  const openReleaseModal = (fixture: any) => {
    setSelectedFixture(fixture)
    setDepartureTime(fixture.departure_time?.slice(0, 5) || '09:30')
  }

  const handleConfirmRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFixture || !selectedRouteId) return

    setReleasing(true)

    try {
      // Execute Atomic Database Release RPC
      const { error } = await supabase.rpc('release_fixture_travel', {
        p_fixture_id: selectedFixture.id,
        p_route_id: selectedRouteId,
        p_departure_time: `${departureTime}:00`,
        p_coach_capacity: coachCapacity,
        p_adult_standard: adultPrice,
        p_adult_member: memberPrice
      })

      if (error) throw error

      setSelectedFixture(null)
      loadDashboard()
    } catch (err: any) {
      alert('Error releasing fixture: ' + err.message)
    } finally {
      setReleasing(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header with Auto-Sync Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2742] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
                ← Main Site
              </Link>
            </div>
            <h1 className="text-3xl font-black text-white mt-1 flex items-center gap-2.5">
              <ShieldCheck className="h-7 w-7 text-[#ffc72c]" />
              Matchday Travel Operations
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Manage coach manifests, auto-sync league fixtures, and release away coach bookings.
            </p>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0e1726] border border-[#1a2742] px-4 py-2.5 text-xs font-bold text-[#ffc72c] hover:bg-[#1a2742] transition shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Fixtures...' : 'Auto-Sync League Fixtures'}
          </button>
        </div>

        {syncStatus && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Fixtures List */}
        <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-[#1a2742] flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#ffc72c]" />
              Season Away Schedule
            </h2>
            <span className="text-xs text-slate-400">{fixtures.length} fixtures in database</span>
          </div>

          <div className="divide-y divide-[#1a2742]">
            {fixtures.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No fixtures in database. Click "Auto-Sync League Fixtures" above to import the schedule!
              </div>
            ) : (
              fixtures.map((f) => {
                const totalBooked = (f.coaches || []).reduce(
                  (sum: number, c: any) =>
                    sum + (c.bookings?.filter((b: any) => b.payment_status !== 'cancelled').length || 0),
                  0
                )
                const coachCount = f.coaches?.length || 0

                return (
                  <div key={f.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#0e1726]/40 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">{f.opponent}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          f.is_released
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-[#ffc72c] border border-[#ffc72c]/30'
                        }`}>
                          {f.is_released ? '✓ Travel Released' : 'Draft / Unreleased'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                        <span>{f.venue}</span>
                        <span>•</span>
                        <span>
                          {new Date(f.match_date).toLocaleDateString('en-GB', {
                            timeZone: 'Europe/London',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span>KO: {f.kickoff_time?.slice(0, 5)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {f.is_released ? (
                        <>
                          <div className="text-right text-xs pr-2 hidden sm:block">
                            <span className="text-slate-400 block">{coachCount} Coach(es)</span>
                            <strong className="text-emerald-400">{totalBooked} Booked</strong>
                          </div>

                          {f.coaches?.[0]?.id && (
                            <Link
                              href={`/admin/manifest/${f.coaches[0].id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a2742] bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1a2742] transition"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                              Manifest
                            </Link>
                          )}

                          <Link
                            href={`/admin/fixtures/${f.id}/pickups`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a2742] bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-[#ffc72c] hover:bg-[#1a2742] transition"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Stops
                          </Link>
                        </>
                      ) : (
                        <button
                          onClick={() => openReleaseModal(f)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffc72c] px-4 py-2 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Release Coach Travel
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Release Modal */}
        {selectedFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-[#1a2742] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase text-[#ffc72c]">Publish Away Travel</span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    vs {selectedFixture.opponent}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFixture(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRelease} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Select Directional Route Preset *
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.master_pickup_stops?.length || 0} stops)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Main Departure Time
                    </label>
                    <input
                      type="time"
                      required
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Coach 1 Size
                    </label>
                    <input
                      type="number"
                      required
                      min={20}
                      max={70}
                      value={coachCapacity}
                      onChange={(e) => setCoachCapacity(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Adult Standard (£)
                    </label>
                    <input
                      type="number"
                      required
                      value={adultPrice}
                      onChange={(e) => setAdultPrice(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Member Price (£)
                    </label>
                    <input
                      type="number"
                      required
                      value={memberPrice}
                      onChange={(e) => setMemberPrice(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1a2742] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFixture(null)}
                    className="rounded-xl border border-[#1a2742] bg-[#0e1726] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={releasing}
                    className="rounded-xl bg-[#ffc72c] px-5 py-2 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg disabled:opacity-50"
                  >
                    {releasing ? 'Publishing...' : 'Publish to Supporters'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
