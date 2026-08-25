'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Bus,
  FileText,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  LogOut
} from 'lucide-react'

interface PickupStop {
  location_name: string
  pickup_time: string
}

interface FixtureRecord {
  id: string
  opponent: string
  venue: string
  match_date: string
  kickoff_time: string
  departure_time: string
  pickup_location: string
  is_active: boolean
  coaches: {
    id: string
    coach_number: number
    seat_capacity: number
    is_active: boolean
    bookings: { id: string; payment_status: string }[]
  }[]
  pickup_locations: {
    id: string
    location_name: string
    pickup_time: string
    sort_order: number
  }[]
  pricing_tiers: {
    tier_name: string
    standard_price: number
    member_price: number
  }[]
}

export default function AdminFixturesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fixtures, setFixtures] = useState<FixtureRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form State
  const [opponent, setOpponent] = useState('')
  const [venue, setVenue] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [kickoffTime, setKickoffTime] = useState('15:00')
  const [defaultDeparture, setDefaultDeparture] = useState('10:00')
  const [defaultPickup, setDefaultPickup] = useState('Main Stadium (Club Car Park)')

  // Initial Coaches
  const [initialCoachCapacity, setInitialCoachCapacity] = useState(53)

  // Pickup Stops
  const [pickupStops, setPickupStops] = useState<PickupStop[]>([
    { location_name: 'Main Stadium (Club Car Park)', pickup_time: '10:00' },
    { location_name: 'Town Centre (Bus Station)', pickup_time: '10:20' },
    { location_name: 'Motorway Services (J7)', pickup_time: '11:00' }
  ])

  // Pricing Defaults
  const [adultStandard, setAdultStandard] = useState('22.00')
  const [adultMember, setAdultMember] = useState('18.00')
  const [seniorStandard, setSeniorStandard] = useState('18.00')
  const [seniorMember, setSeniorMember] = useState('14.00')
  const [juniorStandard, setJuniorStandard] = useState('14.00')
  const [juniorMember, setJuniorMember] = useState('10.00')

  useEffect(() => {
    loadAdminFixtures()
  }, [])

  async function loadAdminFixtures() {
    setLoading(true)
    const { data, error } = await supabase
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
        coaches (
          id,
          coach_number,
          seat_capacity,
          is_active,
          bookings (id, payment_status)
        ),
        pickup_locations (
          id,
          location_name,
          pickup_time,
          sort_order
        ),
        pricing_tiers (
          tier_name,
          standard_price,
          member_price
        )
      `)
      .order('match_date', { ascending: true })

    if (error) {
      setErrorMessage('Failed to load fixtures: ' + error.message)
    } else {
      setFixtures((data as any) || [])
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleAddStop = () => {
    setPickupStops([...pickupStops, { location_name: '', pickup_time: '10:30' }])
  }

  const handleRemoveStop = (idx: number) => {
    if (pickupStops.length <= 1) return
    setPickupStops(pickupStops.filter((_, i) => i !== idx))
  }

  const handleStopChange = (idx: number, field: keyof PickupStop, val: string) => {
    const updated = [...pickupStops]
    updated[idx][field] = val
    setPickupStops(updated)
  }

  const handleCreateFixture = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage(null)

    try {
      const { data: fixData, error: fixErr } = await supabase
        .from('fixtures')
        .insert({
          opponent,
          venue,
          match_date: matchDate,
          kickoff_time: `${kickoffTime}:00`,
          departure_time: `${defaultDeparture}:00`,
          pickup_location: defaultPickup,
          is_active: true
        })
        .select()
        .single()

      if (fixErr) throw fixErr
      const fixtureId = fixData.id

      const { error: coachErr } = await supabase.from('coaches').insert({
        fixture_id: fixtureId,
        coach_number: 1,
        seat_capacity: Number(initialCoachCapacity),
        is_active: true
      })
      if (coachErr) throw coachErr

      const pricingPayload = [
        {
          fixture_id: fixtureId,
          tier_name: 'Adult',
          standard_price: parseFloat(adultStandard),
          member_price: parseFloat(adultMember)
        },
        {
          fixture_id: fixtureId,
          tier_name: 'Senior (65+)',
          standard_price: parseFloat(seniorStandard),
          member_price: parseFloat(seniorMember)
        },
        {
          fixture_id: fixtureId,
          tier_name: 'Junior (U16)',
          standard_price: parseFloat(juniorStandard),
          member_price: parseFloat(juniorMember)
        }
      ]
      const { error: priceErr } = await supabase.from('pricing_tiers').insert(pricingPayload)
      if (priceErr) throw priceErr

      const stopPayload = pickupStops
        .filter((s) => s.location_name.trim() !== '')
        .map((s, idx) => ({
          fixture_id: fixtureId,
          location_name: s.location_name.trim(),
          pickup_time: `${s.pickup_time}:00`,
          sort_order: idx + 1
        }))

      if (stopPayload.length > 0) {
        const { error: stopErr } = await supabase.from('pickup_locations').insert(stopPayload)
        if (stopErr) throw stopErr
      }

      setSuccessMessage(`Fixture against ${opponent} created successfully!`)
      setShowModal(false)
      loadAdminFixtures()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save fixture.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleCoach = async (coachId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('coaches')
      .update({ is_active: !currentStatus })
      .eq('id', coachId)

    if (error) alert('Error updating coach: ' + error.message)
    else loadAdminFixtures()
  }

  const handleAddExtraCoach = async (fixtureId: string, existingCoachCount: number) => {
    const capacityInput = prompt('Enter seat capacity for this extra coach:', '49')
    if (!capacityInput) return

    const capacity = parseInt(capacityInput, 10)
    if (isNaN(capacity) || capacity < 1) {
      alert('Invalid capacity number.')
      return
    }

    const nextCoachNumber = existingCoachCount + 1

    const { error } = await supabase.from('coaches').insert({
      fixture_id: fixtureId,
      coach_number: nextCoachNumber,
      seat_capacity: capacity,
      is_active: true
    })

    if (error) alert('Failed to add coach: ' + error.message)
    else {
      setSuccessMessage(`Coach ${nextCoachNumber} (${capacity} seats) added and activated!`)
      loadAdminFixtures()
    }
  }

  const handleToggleFixture = async (fixtureId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('fixtures')
      .update({ is_active: !currentStatus })
      .eq('id', fixtureId)

    if (error) alert('Error toggling fixture: ' + error.message)
    else loadAdminFixtures()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header with Sign Out */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Main Site
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Fixture & Fleet Management</h1>
            <p className="text-slate-400 text-sm">Control away games, adjust pickup routes, and deploy extra coaches.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 shadow-lg transition"
            >
              <Plus className="h-4 w-4" />
              Add New Fixture
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Fixtures List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading travel schedule...</div>
        ) : fixtures.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            No fixtures found. Click &quot;Add New Fixture&quot; above to create your first away travel schedule.
          </div>
        ) : (
          <div className="space-y-6">
            {fixtures.map((fix) => {
              const sortedCoaches = (fix.coaches || []).sort((a, b) => a.coach_number - b.coach_number)

              return (
                <div
                  key={fix.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">{fix.opponent}</h2>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          fix.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {fix.is_active ? 'Bookings Open' : 'Closed / Off-Sale'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{fix.venue}</p>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-slate-300 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{fix.match_date}</span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>KO {fix.kickoff_time.slice(0, 5)}</span>
                      </div>
                      <button
                        onClick={() => handleToggleFixture(fix.id, fix.is_active)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition text-slate-200"
                      >
                        {fix.is_active ? 'Close Bookings' : 'Reopen Bookings'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 block mb-2">
                      Pickup Route Stops ({fix.pickup_locations?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(fix.pickup_locations || []).map((loc) => (
                        <div key={loc.id} className="flex items-center gap-2 rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
                          <MapPin className="h-3 w-3 text-blue-400" />
                          <span>{loc.location_name}</span>
                          <span className="font-bold text-white">({loc.pickup_time.slice(0, 5)})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase font-bold text-slate-400">
                        Coach Fleet Allocation ({sortedCoaches.length} Coaches)
                      </span>
                      <button
                        onClick={() => handleAddExtraCoach(fix.id, sortedCoaches.length)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-lg transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Extra Coach (Coach {sortedCoaches.length + 1})
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sortedCoaches.map((c) => {
                        const activeBookings = (c.bookings || []).filter((b) => b.payment_status !== 'cancelled').length
                        const remaining = Math.max(0, c.seat_capacity - activeBookings)

                        return (
                          <div
                            key={c.id}
                            className={`flex flex-col justify-between p-4 rounded-xl border ${
                              c.is_active ? 'border-slate-800 bg-slate-950/60' : 'border-slate-800 bg-slate-950/20 opacity-60'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <Bus className={`h-5 w-5 ${c.is_active ? 'text-blue-400' : 'text-slate-600'}`} />
                                <div>
                                  <div className="font-bold text-white text-sm">Coach {c.coach_number}</div>
                                  <div className="text-xs text-slate-400">{c.seat_capacity} Seater</div>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                remaining === 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {activeBookings}/{c.seat_capacity} Booked
                              </span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleToggleCoach(c.id, c.is_active)}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                              >
                                {c.is_active ? (
                                  <>
                                    <ToggleRight className="h-4 w-4 text-emerald-400" /> Active
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="h-4 w-4 text-slate-500" /> Standby
                                  </>
                                )}
                              </button>

                              <Link
                                href={`/admin/manifest/${c.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Steward Manifest
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* CREATE FIXTURE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Create Away Fixture & Travel</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateFixture} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Opponent Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stockport County"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Venue / Stadium *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Edgeley Park"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Match Date *</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kickoff Time *</label>
                  <input
                    type="time"
                    required
                    value={kickoffTime}
                    onChange={(e) => setKickoffTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">Initial Coach 1 Capacity (Seats)</label>
                <input
                  type="number"
                  min="20"
                  max="100"
                  required
                  value={initialCoachCapacity}
                  onChange={(e) => setInitialCoachCapacity(Number(e.target.value))}
                  className="w-full sm:w-48 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">Pickup Stops & Scheduled Times</label>
                  <button
                    type="button"
                    onClick={handleAddStop}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Stop
                  </button>
                </div>

                {pickupStops.map((stop, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={`Stop ${idx + 1} Name`}
                      value={stop.location_name}
                      onChange={(e) => handleStopChange(idx, 'location_name', e.target.value)}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="time"
                      value={stop.pickup_time}
                      onChange={(e) => handleStopChange(idx, 'pickup_time', e.target.value)}
                      className="w-32 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    {pickupStops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-300">Pricing Matrix (Standard vs Member)</label>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-white block">Adult</span>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Standard (£)</span>
                      <input type="number" step="0.5" value={adultStandard} onChange={(e) => setAdultStandard(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" />
                    </div>
                    <div>
                      <span className="text-emerald-400 block text-[10px]">Member (£)</span>
                      <input type="number" step="0.5" value={adultMember} onChange={(e) => setAdultMember(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-white block">Senior (65+)</span>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Standard (£)</span>
                      <input type="number" step="0.5" value={seniorStandard} onChange={(e) => setSeniorStandard(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" />
                    </div>
                    <div>
                      <span className="text-emerald-400 block text-[10px]">Member (£)</span>
                      <input type="number" step="0.5" value={seniorMember} onChange={(e) => setSeniorMember(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-white block">Junior (U16)</span>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Standard (£)</span>
                      <input type="number" step="0.5" value={juniorStandard} onChange={(e) => setJuniorStandard(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" />
                    </div>
                    <div>
                      <span className="text-emerald-400 block text-[10px]">Member (£)</span>
                      <input type="number" step="0.5" value={juniorMember} onChange={(e) => setJuniorMember(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500 transition shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Publish Fixture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
