'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Loader2
} from 'lucide-react'

interface PickupLocation {
  id: string
  fixture_id: string
  location_name: string
  pickup_time: string
  sort_order: number
}

interface Fixture {
  id: string
  opponent: string
  match_date: string
  venue: string
}

export default function ManagePickupsPage() {
  const params = useParams()
  const fixtureId = params?.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fixture, setFixture] = useState<Fixture | null>(null)
  const [pickups, setPickups] = useState<PickupLocation[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [locationName, setLocationName] = useState('')
  const [pickupTime, setPickupTime] = useState('10:00')

  useEffect(() => {
    if (!fixtureId) return
    loadData()
  }, [fixtureId])

  async function loadData() {
    setLoading(true)
    setErrorMsg(null)

    const { data: fixData } = await supabase
      .from('fixtures')
      .select('id, opponent, match_date, venue')
      .eq('id', fixtureId)
      .single()

    if (fixData) setFixture(fixData)

    const { data: pickupData, error } = await supabase
      .from('pickup_locations')
      .select('*')
      .eq('fixture_id', fixtureId)
      .order('sort_order', { ascending: true })

    if (error) {
      setErrorMsg('Could not load pickup locations.')
    } else {
      setPickups(pickupData || [])
    }
    setLoading(false)
  }

  const handleAddPickup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationName.trim()) return

    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const nextOrder = pickups.length + 1
    const { data, error } = await supabase
      .from('pickup_locations')
      .insert({
        fixture_id: fixtureId,
        location_name: locationName.trim(),
        pickup_time: `${pickupTime}:00`,
        sort_order: nextOrder
      })
      .select()
      .single()

    if (error) {
      setErrorMsg(error.message)
    } else {
      setPickups([...pickups, data])
      setLocationName('')
      setSuccessMsg('Pickup stop added successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
    setSaving(false)
  }

  const handleDeletePickup = async (id: string) => {
    if (!confirm('Remove this pickup location?')) return

    const { error } = await supabase
      .from('pickup_locations')
      .delete()
      .eq('id', id)

    if (error) {
      setErrorMsg(error.message)
    } else {
      setPickups(pickups.filter((p) => p.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-400 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#ffc72c]" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/admin/fixtures"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Fixtures
        </Link>

        <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ffc72c]">
            Coach Route Builder
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Pickup Stops: vs {fixture?.opponent}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure departure spots and times for this away fixture.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="rounded-2xl border border-[#1a2742] bg-[#0e1726] p-6 shadow-lg">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-[#ffc72c]" />
            Add Pickup Stop
          </h2>

          <form onSubmit={handleAddPickup} className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Stop / Landmark Name
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Croud Meadow (Main Stand)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#ffc72c]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Departure Time
              </label>
              <div className="relative">
                <Clock className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="time"
                  required
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffc72c]"
                />
              </div>
            </div>

            <div className="sm:col-span-3 mt-1">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffc72c] px-6 py-2.5 text-xs font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg disabled:opacity-50"
              >
                {saving ? 'Adding Stop...' : 'Add Pickup Location'}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] overflow-hidden shadow-lg">
          <div className="p-4 border-b border-[#1a2742] flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Navigation className="h-4 w-4 text-[#ffc72c]" />
              Scheduled Pickup Route
            </h3>
            <span className="text-xs text-slate-400">{pickups.length} stops active</span>
          </div>

          <div className="divide-y divide-[#1a2742]">
            {pickups.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No custom pickup locations defined for this fixture yet.
              </div>
            ) : (
              pickups.map((pickup, index) => (
                <div key={pickup.id} className="p-4 flex items-center justify-between hover:bg-[#0e1726]/50">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-lg bg-[#0e1726] border border-[#1a2742] flex items-center justify-center font-bold text-xs text-[#ffc72c]">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white text-sm">{pickup.location_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-[#1e6fe0]" />
                        Departs: {pickup.pickup_time.slice(0, 5)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePickup(pickup.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete stop"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
