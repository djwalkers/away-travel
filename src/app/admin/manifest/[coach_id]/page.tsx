'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Printer,
  ArrowLeft,
  Download,
  Clock,
  MapPin,
  Banknote,
  FileSpreadsheet
} from 'lucide-react'

interface Booking {
  id: string
  passenger_name: string
  tier_name: string
  amount_paid: number
  payment_method: string
  payment_status: string
  pickup_point: string
  created_at: string
}

export default function ManifestPage() {
  const params = useParams()
  const coachId = params?.coach_id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [coach, setCoach] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    async function loadManifest() {
      setLoading(true)

      // 1. Fetch Coach & Fixture Info
      const { data: coachData } = await supabase
        .from('coaches')
        .select(`
          id,
          coach_number,
          seat_capacity,
          fixtures (
            opponent,
            venue,
            match_date,
            kickoff_time,
            departure_time
          )
        `)
        .eq('id', coachId)
        .single()

      if (coachData) setCoach(coachData)

      // 2. Fetch Bookings for this coach
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('coach_id', coachId)
        .neq('payment_status', 'cancelled')
        .order('pickup_point', { ascending: true })

      if (bookingData) setBookings(bookingData)
      setLoading(false)
    }

    if (coachId) loadManifest()
  }, [coachId])

  const totalCollected = bookings
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.amount_paid), 0)

  const totalCashToCollect = bookings
    .filter((b) => b.payment_status === 'reserved')
    .reduce((sum, b) => sum + Number(b.amount_paid), 0)

  // Export Manifest directly to CSV for Excel / Apple Numbers
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('No passenger bookings to export.')
      return
    }

    const headers = [
      '#',
      'Passenger Name',
      'Tier',
      'Pickup Location',
      'Payment Method',
      'Amount (£)',
      'Payment Status'
    ]

    const rows = bookings.map((b, idx) => [
      idx + 1,
      `"${b.passenger_name.replace(/"/g, '""')}"`,
      `"${b.tier_name}"`,
      `"${(b.pickup_point || 'Main Stadium').replace(/"/g, '""')}"`,
      b.payment_method === 'card' ? 'Online Card' : 'Pay on Coach',
      Number(b.amount_paid).toFixed(2),
      b.payment_status.toUpperCase()
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    const fileName = `Manifest_Coach_${coach?.coach_number || '1'}_vs_${coach?.fixtures?.opponent || 'Away'}.csv`

    link.setAttribute('href', encodedUri)
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading steward manifest...</div>
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 print:bg-white print:text-black print:p-2">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Screen Header Controls (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-slate-800 pb-4">
          <Link
            href="/admin/fixtures"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Fixtures
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              Download CSV (Excel)
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-lg"
            >
              <Printer className="h-4 w-4" />
              Print Manifest
            </button>
          </div>
        </div>

        {/* Printable Manifest Header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 print:border-black print:bg-white print:p-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400 print:text-slate-700">
                Official Coach Passenger Manifest
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white print:text-black mt-1">
                {coach?.fixtures?.opponent} (Away)
              </h1>
              <p className="text-sm text-slate-400 print:text-slate-600">{coach?.fixtures?.venue}</p>
            </div>

            <div className="text-right flex md:flex-col justify-between items-end">
              <div className="text-lg font-bold text-blue-400 print:text-black">
                COACH {coach?.coach_number}
              </div>
              <div className="text-sm text-slate-400 print:text-slate-700">
                Capacity: <strong>{bookings.length} / {coach?.seat_capacity} Seats Booked</strong>
              </div>
            </div>
          </div>

          {/* Financials & Headcount summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-800 print:border-slate-300 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Match Date</span>
              <strong>{coach?.fixtures?.match_date}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Kickoff</span>
              <strong>{coach?.fixtures?.kickoff_time?.slice(0, 5)}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Pre-Paid (Card)</span>
              <strong className="text-emerald-400 print:text-black">£{totalCollected.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Cash to Collect</span>
              <strong className="text-amber-400 print:text-black">£{totalCashToCollect.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Manifest Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden print:border-black print:bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 print:border-slate-400 print:bg-slate-100 print:text-black">
                <th className="py-3 px-4 w-12 text-center">Board</th>
                <th className="py-3 px-4">Passenger Name</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Pickup Stop</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center w-16">Paid?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-slate-300 text-slate-200 print:text-black">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No bookings recorded for this coach yet.
                  </td>
                </tr>
              ) : (
                bookings.map((booking, idx) => (
                  <tr key={booking.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                    {/* Steward Checkbox for Boarding */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-0 print:border-black cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-4 font-semibold text-white print:text-black">
                      {idx + 1}. {booking.passenger_name}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400 print:text-slate-700">
                      {booking.tier_name}
                    </td>

                    <td className="py-3 px-4 text-slate-300 print:text-slate-800">
                      {booking.pickup_point || 'Main Stadium'}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        booking.payment_status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 print:text-black print:border'
                          : 'bg-amber-500/10 text-amber-400 print:text-black print:border'
                      }`}>
                        {booking.payment_method === 'card' ? 'Online Card' : 'Pay on Coach'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium">
                      £{Number(booking.amount_paid).toFixed(2)}
                    </td>

                    {/* Steward Cash Collection Check */}
                    <td className="py-3 px-4 text-center">
                      {booking.payment_status === 'paid' ? (
                        <span className="text-emerald-400 text-xs font-bold print:text-black">PAID</span>
                      ) : (
                        <div className="inline-block h-4 w-4 border border-dashed border-amber-400 print:border-black rounded"></div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Steward Matchday Signoff Note (Prints on Paper Only) */}
        <div className="hidden print:flex justify-between items-center text-xs text-slate-600 pt-6 border-t border-slate-300">
          <div>Steward Signature: ___________________________</div>
          <div>Driver Departure Confirmation: ___________________________</div>
          <div>Total Cash Handed Over: £__________</div>
        </div>

      </div>
    </main>
  )
}
