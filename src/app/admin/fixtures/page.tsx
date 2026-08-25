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
  ShieldCheck,
  Send,
  Navigation,
  FileSpreadsheet,
  Plus,
  Trash2,
  X,
  Users,
  Banknote,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Phone,
  Mail
} from 'lucide-react'

const MASTER_PICKUP_STOPS = [
  { name: 'Croud Meadow (Main Stand)', minuteOffset: 0, defaultChecked: true },
  { name: 'Harlescott (Tesco Express / Layby)', minuteOffset: 15, defaultChecked: true },
  { name: 'Bayston Hill (Foxholes)', minuteOffset: 10, defaultChecked: false },
  { name: 'Telford Services (M54 J4)', minuteOffset: 25, defaultChecked: false },
  { name: 'Whitchurch (Bypass Layby)', minuteOffset: 30, defaultChecked: false },
  { name: 'Oswestry (Bus Station / Mile End)', minuteOffset: 30, defaultChecked: false }
]

export default function AdminFixturesPage() {
  const supabase = createClient()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  // Modals & Drawers
  const [selectedFixture, setSelectedFixture] = useState<any | null>(null)
  const [departureTime, setDepartureTime] = useState<string>('09:30')
  const [coachCapacity, setCoachCapacity] = useState<number>(53)
  const [releasing, setReleasing] = useState(false)

  // Waiting List Modal State
  const [viewingWaitingListFixture, setViewingWaitingListFixture] = useState<any | null>(null)
  const [waitingList, setWaitingList] = useState<any[]>([])
  const [loadingWaitlist, setLoadingWaitlist] = useState(false)

  // Add Coach Modal State
  const [addingCoachFixture, setAddingCoachFixture] = useState<any | null>(null)
  const [newCoachCapacity, setNewCoachCapacity] = useState<number>(53)
  const [addingCoach, setAddingCoach] = useState(false)

  // Pricing Tiers State
  const [pricingTiers, setPricingTiers] = useState([
    { tier_name: 'Adult', standard_price: 20, member_price: 18, enabled: true },
    { tier_name: 'Concession (65+ / Student)', standard_price: 16, member_price: 14, enabled: true },
    { tier_name: 'Junior (Under 18)', standard_price: 12, member_price: 10, enabled: true }
  ])

  const [pickupOptions, setPickupOptions] = useState<any[]>([])
  const [customStopName, setCustomStopName] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
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
          is_active,
          bookings (id, payment_status)
        ),
        waiting_list (
          id,
          seats_requested
        )
      `)
      .order('match_date', { ascending: true })

    if (fixData) setFixtures(fixData)
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

  const calculateOffsetTime = (baseTime: string, offsetMinutes: number) => {
    const [h, m] = baseTime.split(':').map(Number)
    const date = new Date()
    date.setHours(h, m + offsetMinutes, 0)
    return date.toTimeString().slice(0, 5)
  }

  const openReleaseModal = (fixture: any) => {
    setSelectedFixture(fixture)
    const baseDep = fixture.departure_time?.slice(0, 5) || '09:30'
    setDepartureTime(baseDep)

    const initialPickups = MASTER_PICKUP_STOPS.map((stop, idx) => ({
      id: `stop_${idx}`,
      name: stop.name,
      time: calculateOffsetTime(baseDep, stop.minuteOffset),
      checked: stop.defaultChecked
    }))
    setPickupOptions(initialPickups)
  }

  const handleDepartureChange = (newBaseTime: string) => {
    setDepartureTime(newBaseTime)
    setPickupOptions((prev) =>
      prev.map((stop, idx) => {
        const master = MASTER_PICKUP_STOPS[idx]
        return {
          ...stop,
          time: master ? calculateOffsetTime(newBaseTime, master.minuteOffset) : stop.time
        }
      })
    )
  }

  const handleAddCustomStop = () => {
    if (!customStopName.trim()) return
    setPickupOptions([
      ...pickupOptions,
      {
        id: `custom_${Date.now()}`,
        name: customStopName.trim(),
        time: departureTime,
        checked: true
      }
    ])
    setCustomStopName('')
  }

  const handleConfirmRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFixture) return

    const activeTiers = pricingTiers
      .filter((t) => t.enabled)
      .map((t) => ({
        tier_name: t.tier_name,
        standard_price: Number(t.standard_price),
        member_price: Number(t.member_price)
      }))

    if (activeTiers.length === 0) {
      alert('Please enable at least one pricing tier.')
      return
    }

    const activePickups = pickupOptions
      .filter((p) => p.checked)
      .map((p, idx) => ({
        location_name: p.name,
        pickup_time: `${p.time}:00`,
        sort_order: idx + 1
      }))

    if (activePickups.length === 0) {
      alert('Please select at least one pickup location for supporters.')
      return
    }

    setReleasing(true)

    try {
      const { error } = await supabase.rpc('release_fixture_travel', {
        p_fixture_id: selectedFixture.id,
        p_departure_time: `${departureTime}:00`,
        p_coach_capacity: coachCapacity,
        p_pricing_tiers: activeTiers,
        p_pickup_locations: activePickups
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

  // Add Additional Coach (Coach 2, 3...)
  const handleAddNewCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addingCoachFixture) return

    setAddingCoach(true)
    try {
      const { error } = await supabase.rpc('add_fixture_coach', {
        p_fixture_id: addingCoachFixture.id,
        p_seat_capacity: newCoachCapacity
      })

      if (error) throw error

      setAddingCoachFixture(null)
      loadDashboard()
    } catch (err: any) {
      alert('Error adding coach: ' + err.message)
    } finally {
      setAddingCoach(false)
    }
  }

  // Load Waiting List for a Fixture
  const openWaitingList = async (fixture: any) => {
    setViewingWaitingListFixture(fixture)
    setLoadingWaitlist(true)
    const { data } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('fixture_id', fixture.id)
      .order('created_at', { ascending: true })

    setWaitingList(data || [])
    setLoadingWaitlist(false)
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
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
              Manage coach manifests, add extra coaches, monitor waiting lists, and auto-sync fixtures.
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
                No fixtures found. Click &quot;Auto-Sync League Fixtures&quot; above to import!
              </div>
            ) : (
              fixtures.map((f) => {
                const activeCoaches = (f.coaches || []).filter((c: any) => c.is_active)
                const totalCapacity = activeCoaches.reduce((sum: number, c: any) => sum + c.seat_capacity, 0)
                const totalBooked = activeCoaches.reduce(
                  (sum: number, c: any) =>
                    sum + (c.bookings?.filter((b: any) => b.payment_status !== 'cancelled').length || 0),
                  0
                )
                const waitlistTotalSeats = (f.waiting_list || []).reduce(
                  (sum: number, w: any) => sum + (w.seats_requested || 1),
                  0
                )

                return (
                  <div key={f.id} className="p-5 flex flex-col gap-4 hover:bg-[#0e1726]/30 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                      <div className="flex flex-wrap items-center gap-2.5">
                        {f.is_released ? (
                          <>
                            {/* Waiting List Badge / Button */}
                            {waitlistTotalSeats > 0 && (
                              <button
                                onClick={() => openWaitingList(f)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-[#ffc72c] hover:bg-amber-500/20 transition"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Waitlist ({waitlistTotalSeats})
                              </button>
                            )}

                            {/* Add Additional Coach Button */}
                            <button
                              onClick={() => setAddingCoachFixture(f)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a2742] bg-[#0e1726] px-3 py-2 text-xs font-bold text-white hover:bg-[#1a2742] transition"
                            >
                              <Plus className="h-3.5 w-3.5 text-[#ffc72c]" />
                              Add Coach
                            </button>

                            {/* Stops Management Button */}
                            <Link
                              href={`/admin/fixtures/${f.id}/pickups`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a2742] bg-[#0e1726] px-3 py-2 text-xs font-bold text-[#ffc72c] hover:bg-[#1a2742] transition"
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

                    {/* Multi-Coach Fleet Overview for Released Matches */}
                    {f.is_released && activeCoaches.length > 0 && (
                      <div className="pt-3 border-t border-[#1a2742]/60 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {activeCoaches.map((c: any) => {
                          const coachBooked = (c.bookings || []).filter(
                            (b: any) => b.payment_status !== 'cancelled'
                          ).length
                          const coachLeft = Math.max(0, c.seat_capacity - coachBooked)

                          return (
                            <div key={c.id} className="rounded-xl border border-[#1a2742] bg-[#070b14] p-3 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                  <Bus className="h-3.5 w-3.5 text-[#ffc72c]" />
                                  Coach {c.coach_number}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {coachBooked} / {c.seat_capacity} Booked •{' '}
                                  <strong className={coachLeft === 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                    {coachLeft === 0 ? 'FULL' : `${coachLeft} left`}
                                  </strong>
                                </div>
                              </div>

                              <Link
                                href={`/admin/manifest/${c.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#0e1726] border border-[#1a2742] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1a2742] transition"
                              >
                                <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                                Manifest
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Release Modal */}
        {selectedFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl my-8 rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-[#1a2742] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ffc72c]">Configure & Release Travel</span>
                  <h3 className="text-2xl font-black text-white mt-0.5">
                    vs {selectedFixture.opponent}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedFixture.venue}</p>
                </div>
                <button
                  onClick={() => setSelectedFixture(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e1726]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRelease} className="space-y-6">
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#1a2742] bg-[#0e1726] p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#ffc72c]" />
                      HQ Departure Time
                    </label>
                    <input
                      type="time"
                      required
                      value={departureTime}
                      onChange={(e) => handleDepartureChange(e.target.value)}
                      className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Bus className="h-3.5 w-3.5 text-[#ffc72c]" />
                      Coach 1 Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={20}
                      max={80}
                      value={coachCapacity}
                      onChange={(e) => setCoachCapacity(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-4 space-y-3">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                    <Banknote className="h-3.5 w-3.5 text-[#ffc72c]" />
                    Pricing Tiers (Standard vs Member)
                  </label>

                  <div className="space-y-2.5">
                    {pricingTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border border-[#1a2742] bg-[#070b14] p-2.5">
                        <input
                          type="checkbox"
                          checked={tier.enabled}
                          onChange={(e) => {
                            const updated = [...pricingTiers]
                            updated[idx].enabled = e.target.checked
                            setPricingTiers(updated)
                          }}
                          className="h-4 w-4 rounded border-slate-700 text-[#ffc72c] focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white flex-1 min-w-[130px]">{tier.tier_name}</span>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Std £</span>
                            <input
                              type="number"
                              disabled={!tier.enabled}
                              value={tier.standard_price}
                              onChange={(e) => {
                                const updated = [...pricingTiers]
                                updated[idx].standard_price = Number(e.target.value)
                                setPricingTiers(updated)
                              }}
                              className="w-16 rounded-md border border-[#1a2742] bg-[#0a1220] px-2 py-1 text-xs text-white disabled:opacity-40"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[#ffc72c]">Mem £</span>
                            <input
                              type="number"
                              disabled={!tier.enabled}
                              value={tier.member_price}
                              onChange={(e) => {
                                const updated = [...pricingTiers]
                                updated[idx].member_price = Number(e.target.value)
                                setPricingTiers(updated)
                              }}
                              className="w-16 rounded-md border border-[#1a2742] bg-[#0a1220] px-2 py-1 text-xs text-white disabled:opacity-40 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5 text-[#ffc72c]" />
                      Select Available Pickup Stops for this Trip
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {pickupOptions.filter((p) => p.checked).length} selected
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {pickupOptions.map((stop, idx) => (
                      <div
                        key={stop.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                          stop.checked
                            ? 'border-[#ffc72c]/40 bg-[#ffc72c]/5'
                            : 'border-[#1a2742] bg-[#070b14] opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={stop.checked}
                            onChange={(e) => {
                              const updated = [...pickupOptions]
                              updated[idx].checked = e.target.checked
                              setPickupOptions(updated)
                            }}
                            className="h-4 w-4 rounded border-slate-700 text-[#ffc72c] focus:ring-0 cursor-pointer"
                          />
                          <span className={`text-xs ${stop.checked ? 'font-bold text-white' : 'text-slate-400'}`}>
                            {stop.name}
                          </span>
                        </label>

                        {stop.checked && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Departs:</span>
                            <input
                              type="time"
                              value={stop.time}
                              onChange={(e) => {
                                const updated = [...pickupOptions]
                                updated[idx].time = e.target.value
                                setPickupOptions(updated)
                              }}
                              className="rounded border border-[#1a2742] bg-[#0a1220] px-1.5 py-0.5 text-xs text-[#ffc72c] font-bold"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add another pickup stop..."
                      value={customStopName}
                      onChange={(e) => setCustomStopName(e.target.value)}
                      className="flex-1 rounded-lg border border-[#1a2742] bg-[#070b14] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ffc72c]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomStop}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#0a1220] border border-[#1a2742] px-3 py-1.5 text-xs font-bold text-[#ffc72c] hover:bg-[#1a2742] transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Stop
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1a2742] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedFixture(null)}
                    className="rounded-xl border border-[#1a2742] bg-[#0e1726] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={releasing}
                    className="rounded-xl bg-[#ffc72c] px-6 py-2.5 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg disabled:opacity-50"
                  >
                    {releasing ? 'Publishing Fixture...' : 'Publish to Supporters'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Additional Coach Modal */}
        {addingCoachFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1a2742] pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-[#ffc72c]">Fleet Expansion</span>
                  <h3 className="text-lg font-black text-white">Add Extra Coach (vs {addingCoachFixture.opponent})</h3>
                </div>
                <button
                  onClick={() => setAddingCoachFixture(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewCoach} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Coach Seat Capacity (e.g. 53-seater)
                  </label>
                  <input
                    type="number"
                    required
                    min={16}
                    max={85}
                    value={newCoachCapacity}
                    onChange={(e) => setNewCoachCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                  />
                </div>

                <div className="pt-2 border-t border-[#1a2742] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddingCoachFixture(null)}
                    className="rounded-xl border border-[#1a2742] bg-[#0e1726] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingCoach}
                    className="rounded-xl bg-[#ffc72c] px-5 py-2 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg"
                  >
                    {addingCoach ? 'Adding Coach...' : 'Add Coach to Fleet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Waiting List Viewer Drawer / Modal */}
        {viewingWaitingListFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#1a2742] pb-3 shrink-0">
                <div>
                  <span className="text-xs font-bold uppercase text-[#ffc72c]">Matchday Waiting List</span>
                  <h3 className="text-xl font-black text-white">vs {viewingWaitingListFixture.opponent}</h3>
                </div>
                <button
                  onClick={() => setViewingWaitingListFixture(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#1a2742]">
                {loadingWaitlist ? (
                  <div className="p-8 text-center text-slate-400">Loading waiting list...</div>
                ) : waitingList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No supporters on the waiting list yet.</div>
                ) : (
                  waitingList.map((item, idx) => (
                    <div key={item.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {idx + 1}. {item.supporter_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#ffc72c]/10 text-[#ffc72c] border border-[#ffc72c]/30 text-[10px] font-bold">
                            {item.seats_requested} seat(s) requested
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-400" />
                            {item.contact_phone}
                          </span>
                          {item.contact_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-blue-400" />
                              {item.contact_email}
                            </span>
                          )}
                          <span>Pickup: {item.pickup_point}</span>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-[#1a2742] flex justify-between items-center shrink-0">
                <span className="text-xs text-slate-400">
                  Total waiting:{' '}
                  <strong className="text-[#ffc72c]">
                    {waitingList.reduce((s, w) => s + (w.seats_requested || 1), 0)} seats
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAddingCoachFixture(viewingWaitingListFixture)
                    setViewingWaitingListFixture(null)
                  }}
                  className="rounded-xl bg-[#ffc72c] px-4 py-2 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg"
                >
                  + Add Next Coach
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
