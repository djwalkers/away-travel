'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  Circle,
  Banknote,
  Users,
  Search,
  SlidersHorizontal,
  Smartphone,
  FileText,
  Loader2
} from 'lucide-react'

interface Booking {
  id: string
  passenger_name: string
  tier_name: string
  amount_paid: number
  payment_method: string
  payment_status: string
  pickup_point: string
  is_boarded: boolean
  created_at: string
}

export default function StewardManifestPage() {
  const params = useParams()
  const coachId = params?.coach_id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [coach, setCoach] = useState<any>(null)
  const [fixture, setFixture] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [digitalMode, setDigitalMode] = useState(true) // Feature Toggle: Digital vs Print Mode

  useEffect(() => {
    if (!coachId) return

    loadManifest()

    // Real-time synchronization across stewards' phones
    const channel = supabase
      .channel(`coach_bookings_${coachId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `coach_id=eq.${coachId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setBookings((prev) =>
              prev.map((b) => (b.id === payload.new.id ? { ...b, ...payload.new } : b))
            )
          } else if (payload.eventType === 'INSERT') {
            setBookings((prev) => [...prev, payload.new as Booking])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [coachId])

  async function loadManifest() {
    setLoading(true)

    const { data: coachData } = await supabase
      .from('coaches')
      .select('*, fixtures(*)')
      .eq('id', coachId)
      .single()

    if (coachData) {
      setCoach(coachData)
      setFixture(coachData.fixtures)
    }

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('coach_id', coachId)
      .neq('payment_status', 'cancelled')
      .order('passenger_name', { ascending: true })

    if (bookingsData) {
      setBookings(bookingsData)
    }

    setLoading(false)
  }

  // Toggle passenger boarding status in database
  const toggleBoarding = async (booking: Booking) => {
    const updatedStatus = !booking.is_boarded
    const now = updatedStatus ? new Date().toISOString() : null

    // Optimistic UI update
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, is_boarded: updatedStatus } : b))
    )

    await supabase
      .from('bookings')
      .update({ is_boarded: updatedStatus, boarded_at: now })
      .eq('id', booking.id)
  }

  // Mark Pay on Coach cash as collected
  const markCashPaid = async (booking: Booking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, payment_status: 'paid' } : b))
    )

    await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', booking.id)
  }

  // Filtered list based on search
  const filteredBookings = bookings.filter((b) =>
    b.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.pickup_point.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSeats = coach?.seat_capacity || 53
  const boardedCount = bookings.filter((b) => b.is_boarded).length
  const totalBooked = bookings.length
  const cashDueTotal = bookings
    .filter((b) => b.payment_method === 'pay_on_coach' && b.payment_status !== 'paid')
    .reduce((sum, b) => sum + Number(b.amount_paid), 0)

  // Export CSV for Excel
  const exportCSV = () => {
    const headers = ['Passenger Name,Tier,Pickup Point,Payment Method,Payment Status,Amount Due,Boarded']
    const rows = bookings.map((b) =>
      `"${b.passenger_name}","${b.tier_name}","${b.pickup_point}","${b.payment_method}","${b.payment_status}","£${Number(b.amount_paid).toFixed(2)}","${b.is_boarded ? 'YES' : 'NO'}"`
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Manifest_Coach_${coach?.coach_number}_vs_${fixture?.opponent}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#ffc72c]" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-8 print:p-0 print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Navigation & Feature Switch Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-[#1a2742] pb-4">
          <Link
            href="/admin/fixtures"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fixtures
          </Link>

          {/* Mode Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-xl bg-[#0e1726] border border-[#1a2742]">
              <button
                type="button"
                onClick={() => setDigitalMode(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  digitalMode
                    ? 'bg-[#ffc72c] text-[#070b14] shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Digital Boarding
              </button>
              <button
                type="button"
                onClick={() => setDigitalMode(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  !digitalMode
                    ? 'bg-[#0057b8] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Print / Paper View
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a2742] bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1a2742] transition"
              title="Print Manifest"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a2742] bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-[#1a2742] transition"
              title="Export to Excel / CSV"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Coach Header & Tallies */}
        <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-xl print:border-black print:bg-white print:p-4 print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ffc72c] print:text-black">
                Official Matchday Steward Manifest
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white print:text-black mt-1">
                Coach {coach?.coach_number} • vs {fixture?.opponent}
              </h1>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                {fixture?.venue} • Match Date:{' '}
                {fixture?.match_date
                  ? new Date(fixture.match_date).toLocaleDateString('en-GB', {
                      timeZone: 'Europe/London',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  : ''}
              </p>
            </div>

            {/* Status Tallies */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-3 text-center print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black block">Boarded</span>
                <span className="text-lg font-black text-emerald-400 print:text-black">
                  {boardedCount} / {totalBooked}
                </span>
              </div>

              <div className="rounded-xl border border-[#1a2742] bg-[#0e1726] p-3 text-center print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-black block">Cash Due</span>
                <span className="text-lg font-black text-[#ffc72c] print:text-black">
                  £{cashDueTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Search Filter (Digital Mode only) */}
          {digitalMode && (
            <div className="mt-6 pt-4 border-t border-[#1a2742] print:hidden">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search passenger name or pickup point..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ffc72c]"
                />
              </div>
            </div>
          )}
        </div>

        {/* MODE 1: DIGITAL BOARDING VIEW (Interactive Touch Targets for Stewards) */}
        {digitalMode ? (
          <div className="space-y-3 print:hidden">
            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-8 text-center text-slate-500 text-sm">
                No passengers found matching search.
              </div>
            ) : (
              filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                    b.is_boarded
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-[#1a2742] bg-[#0a1220]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* 1-Tap Boarding Checkbox Button */}
                    <button
                      type="button"
                      onClick={() => toggleBoarding(b)}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition shrink-0 ${
                        b.is_boarded
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'border-2 border-slate-700 bg-[#070b14] text-slate-600 hover:border-[#ffc72c]'
                      }`}
                    >
                      <CheckCircle2 className={`h-6 w-6 ${b.is_boarded ? 'text-slate-950' : 'text-slate-700'}`} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{b.passenger_name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0e1726] border border-[#1a2742] text-slate-400">
                          {b.tier_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Pickup: <strong className="text-slate-200">{b.pickup_point}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Badge & Cash Action */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {b.payment_method === 'pay_on_coach' && b.payment_status !== 'paid' ? (
                      <button
                        type="button"
                        onClick={() => markCashPaid(b)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#ffc72c] px-2.5 py-1 text-[11px] font-black text-[#070b14] hover:bg-[#e6b022] shadow transition"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        Collect £{Number(b.amount_paid).toFixed(2)}
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✓ Paid (£{Number(b.amount_paid).toFixed(2)})
                      </span>
                    )}

                    <span className="text-[10px] text-slate-500">
                      {b.is_boarded ? '✓ On Board' : 'Awaiting Boarding'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* MODE 2: COMPACT PRINT / PAPER TABLE (Optimized for Printer & Paper Manifests) */
          <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] overflow-hidden shadow-lg print:border-black print:bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a2742] bg-[#0e1726] print:bg-slate-100 print:border-black">
                  <th className="p-3 font-bold text-white print:text-black w-10">#</th>
                  <th className="p-3 font-bold text-white print:text-black">Passenger Name</th>
                  <th className="p-3 font-bold text-white print:text-black">Tier</th>
                  <th className="p-3 font-bold text-white print:text-black">Pickup Location</th>
                  <th className="p-3 font-bold text-white print:text-black text-right">Payment</th>
                  <th className="p-3 font-bold text-white print:text-black text-center w-20">Boarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2742] print:divide-slate-300">
                {bookings.map((b, index) => (
                  <tr key={b.id} className="hover:bg-[#0e1726]/30 print:hover:bg-transparent">
                    <td className="p-3 text-slate-500 print:text-slate-700 font-mono">{index + 1}</td>
                    <td className="p-3 font-bold text-white print:text-black">{b.passenger_name}</td>
                    <td className="p-3 text-slate-400 print:text-slate-700">{b.tier_name}</td>
                    <td className="p-3 text-slate-300 print:text-slate-800">{b.pickup_point}</td>
                    <td className="p-3 text-right">
                      {b.payment_status === 'paid' ? (
                        <span className="text-emerald-400 print:text-slate-900 font-semibold">Paid (£{Number(b.amount_paid).toFixed(2)})</span>
                      ) : (
                        <span className="text-[#ffc72c] print:text-black font-bold">CASH: £{Number(b.amount_paid).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="h-5 w-5 border border-slate-600 print:border-black rounded mx-auto flex items-center justify-center">
                        {b.is_boarded && <span className="text-emerald-400 print:text-black font-bold">✓</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  )
}
