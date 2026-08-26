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
  Banknote,
  Users,
  Search,
  Smartphone,
  FileText,
  Loader2,
  Phone,
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  UserPlus,
  MapPin,
  X,
  Plus
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
  user_id?: string
  phone_number?: string
  email?: string
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
  const [digitalMode, setDigitalMode] = useState(true)
  const [filterTab, setFilterTab] = useState<'all' | 'missing' | 'boarded'>('all')

  // Modals
  const [editingPhoneBooking, setEditingPhoneBooking] = useState<Booking | null>(null)
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null)
  const [walkupName, setWalkupName] = useState('')
  const [walkupPhone, setWalkupPhone] = useState('')
  const [walkupPrice, setWalkupPrice] = useState(20)
  const [savingWalkup, setSavingWalkup] = useState(false)

  useEffect(() => {
    if (!coachId) return

    loadManifest()

    const channel = supabase
      .channel(`coach_bookings_${coachId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `coach_id=eq.${coachId}` },
        () => loadManifest()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [coachId])

  async function loadManifest() {
    setLoading(true)

    try {
      // 1. Load Coach & Fixture
      const { data: coachData } = await supabase
        .from('coaches')
        .select('*, fixtures(*)')
        .eq('id', coachId)
        .single()

      if (coachData) {
        setCoach(coachData)
        setFixture(coachData.fixtures)
      }

      // 2. Load Bookings
      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('coach_id', coachId)
        .neq('payment_status', 'cancelled')
        .order('passenger_name', { ascending: true })

      if (bookErr) throw bookErr

      if (bookingsData && bookingsData.length > 0) {
        const userIds = Array.from(
          new Set(bookingsData.map((b: any) => b.user_id).filter(Boolean))
        )

        let profileMap: Record<string, any> = {}

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, phone_number, full_name, email')
            .in('id', userIds)

          if (profilesData) {
            profilesData.forEach((p) => {
              profileMap[p.id] = p
            })
          }
        }

        const enriched: Booking[] = bookingsData.map((b: any) => ({
          ...b,
          phone_number: b.phone_number || (b.user_id ? profileMap[b.user_id]?.phone_number : null),
          email: b.user_id ? profileMap[b.user_id]?.email : null
        }))

        setBookings(enriched)
      } else {
        setBookings([])
      }
    } catch (err) {
      console.error('Failed to load manifest:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleBoarding = async (booking: Booking) => {
    const updatedStatus = !booking.is_boarded
    const now = updatedStatus ? new Date().toISOString() : null

    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, is_boarded: updatedStatus } : b))
    )

    await supabase
      .from('bookings')
      .update({ is_boarded: updatedStatus, boarded_at: now })
      .eq('id', booking.id)
  }

  const markCashPaid = async (booking: Booking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, payment_status: 'paid' } : b))
    )

    await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', booking.id)
  }

  const handleMarkNoShow = async (booking: Booking) => {
    if (!confirm(`Mark ${booking.passenger_name} as No-Show?`)) return
    await supabase.rpc('mark_booking_noshow', { p_booking_id: booking.id })
    loadManifest()
  }

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPhoneBooking || !newPhoneNumber.trim()) return

    setSavingPhone(true)
    const phoneVal = newPhoneNumber.trim()

    // Update both bookings and profiles
    await supabase.from('bookings').update({ phone_number: phoneVal }).eq('id', editingPhoneBooking.id)
    if (editingPhoneBooking.user_id) {
      await supabase.from('profiles').update({ phone_number: phoneVal }).eq('id', editingPhoneBooking.user_id)
    }

    setEditingPhoneBooking(null)
    setNewPhoneNumber('')
    setSavingPhone(false)
    loadManifest()
  }

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reassignBooking || !walkupName.trim()) return

    setSavingWalkup(true)
    try {
      const { error } = await supabase.rpc('reassign_walkup_seat', {
        p_booking_id: reassignBooking.id,
        p_new_passenger_name: walkupName.trim(),
        p_new_phone: walkupPhone.trim() || 'N/A',
        p_amount: walkupPrice
      })

      if (error) throw error

      setReassignBooking(null)
      setWalkupName('')
      setWalkupPhone('')
      loadManifest()
    } catch (err: any) {
      alert('Failed to reassign seat: ' + err.message)
    } finally {
      setSavingWalkup(false)
    }
  }

  // Format UK phone for WhatsApp URL (07779289053 -> 447779289053)
  const formatWhatsAppNumber = (phone?: string) => {
    if (!phone) return ''
    let clean = phone.replace(/[^0-9]/g, '')
    if (clean.startsWith('0')) clean = '44' + clean.slice(1)
    return clean
  }

  const getWhatsAppLink = (b: Booking) => {
    if (!b.phone_number) return null
    const intPhone = formatWhatsAppNumber(b.phone_number)
    const coachNum = coach?.coach_number || 1
    const text = `Hi ${b.passenger_name.split(' ')[0]}, this is the Shrewsbury Town coach steward on Coach ${coachNum} at ${b.pickup_point}. We are preparing to depart shortly, are you nearby?`
    return `https://wa.me/${intPhone}?text=${encodeURIComponent(text)}`
  }

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickup_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.phone_number && b.phone_number.includes(searchTerm))

    if (!matchesSearch) return false

    if (filterTab === 'missing') return !b.is_boarded
    if (filterTab === 'boarded') return b.is_boarded
    return true
  })

  const totalSeats = coach?.seat_capacity || 53
  const boardedCount = bookings.filter((b) => b.is_boarded).length
  const missingCount = bookings.filter((b) => !b.is_boarded).length
  const totalBooked = bookings.length
  const cashDueTotal = bookings
    .filter((b) => b.payment_method === 'pay_on_coach' && b.payment_status !== 'paid')
    .reduce((sum, b) => sum + Number(b.amount_paid), 0)

  const exportCSV = () => {
    const headers = ['Passenger Name,Phone Number,Tier,Pickup Point,Payment Method,Payment Status,Amount Due,Boarded']
    const rows = bookings.map((b) =>
      `"${b.passenger_name}","${b.phone_number || 'N/A'}","${b.tier_name}","${b.pickup_point}","${b.payment_method}","${b.payment_status}","£${Number(b.amount_paid).toFixed(2)}","${b.is_boarded ? 'YES' : 'NO'}"`
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-[#ffc72c]" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 p-4 md:p-8 print:p-0 print:bg-white print:text-black transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-slate-200 dark:border-[#1a2742] pb-4">
          <Link
            href="/admin/fixtures"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Matchday Operations
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center p-1 rounded-xl bg-white dark:bg-[#0e1726] border border-slate-200 dark:border-[#1a2742]">
              <button
                type="button"
                onClick={() => setDigitalMode(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  digitalMode
                    ? 'bg-[#0057b8] dark:bg-[#ffc72c] text-white dark:text-[#070b14] shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                    ? 'bg-[#0057b8] dark:bg-[#ffc72c] text-white dark:text-[#070b14] shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Print View
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#1a2742] transition shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#1a2742] transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Coach Header & Tallies */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] p-6 shadow-xl print:border-black print:bg-white print:p-4 print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-[#ffc72c] print:text-black">
                Official Matchday Steward Portal
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white print:text-black mt-1">
                Coach {coach?.coach_number} • vs {fixture?.opponent}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">
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

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#0e1726] p-3 text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Boarded</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {boardedCount} / {totalBooked}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#0e1726] p-3 text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Awaiting</span>
                <span className={`text-lg font-black ${missingCount > 0 ? 'text-amber-600 dark:text-[#ffc72c]' : 'text-slate-400'}`}>
                  {missingCount}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#0e1726] p-3 text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Cash Due</span>
                <span className="text-lg font-black text-amber-700 dark:text-[#ffc72c]">
                  £{cashDueTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Roll Call Tabs & Search */}
          {digitalMode && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1a2742] space-y-3 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#070b14] border border-slate-200 dark:border-[#1a2742]">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      filterTab === 'all'
                        ? 'bg-white dark:bg-[#0e1726] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    All ({totalBooked})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterTab('missing')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      filterTab === 'missing'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Missing / Awaiting ({missingCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterTab('boarded')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      filterTab === 'boarded'
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black shadow-sm'
                        : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Boarded ({boardedCount})
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, phone, pickup..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#070b14] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-[#ffc72c]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Digital Mode Card List */}
        {digitalMode ? (
          <div className="space-y-3 print:hidden">
            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] p-10 text-center text-slate-500 text-sm">
                {filterTab === 'missing' && totalBooked > 0 ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-slate-900 dark:text-white">All passengers are on board!</p>
                    <p className="text-xs text-slate-500">Coach is ready for departure.</p>
                  </div>
                ) : (
                  'No passengers found matching search.'
                )}
              </div>
            ) : (
              filteredBookings.map((b) => {
                const whatsAppLink = getWhatsAppLink(b)

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      b.is_boarded
                        ? 'border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] shadow-sm'
                    }`}
                  >
                    {/* Left: Checkbox & Supporter Details */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => toggleBoarding(b)}
                        className={`h-11 w-11 rounded-xl flex items-center justify-center transition shrink-0 ${
                          b.is_boarded
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md'
                            : 'border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#070b14] text-slate-400 hover:border-blue-500 dark:hover:border-[#ffc72c]'
                        }`}
                        title={b.is_boarded ? 'Tap to Unboard' : 'Tap to Board'}
                      >
                        <CheckCircle2 className={`h-6 w-6 ${b.is_boarded ? 'text-white dark:text-slate-950' : 'text-slate-400'}`} />
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {b.passenger_name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0e1726] border border-slate-200 dark:border-[#1a2742] text-slate-600 dark:text-slate-400">
                            {b.tier_name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-[#ffc72c]" />
                            {b.pickup_point}
                          </span>
                          {b.phone_number ? (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {b.phone_number}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                              No mobile on file
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions Bar (Call, WhatsApp, Paid, No-Show) */}
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Direct Call & WhatsApp Buttons */}
                      {b.phone_number ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${b.phone_number}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition shadow-sm"
                            title={`Call ${b.phone_number}`}
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            <span>Call</span>
                          </a>

                          {whatsAppLink && (
                            <a
                              href={whatsAppLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition shadow-sm"
                              title="Send WhatsApp Roll Call Ping"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPhoneBooking(b)
                            setNewPhoneNumber('')
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-[#1a2742] bg-slate-100 dark:bg-[#0e1726] px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-white transition shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-[#ffc72c]" />
                          Add Phone
                        </button>
                      )}

                      {/* Payment Badge or Cash Collect */}
                      {b.payment_method === 'pay_on_coach' && b.payment_status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => markCashPaid(b)}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 dark:bg-[#ffc72c] px-3 py-2 text-xs font-black text-slate-950 hover:opacity-90 shadow transition"
                        >
                          <Banknote className="h-3.5 w-3.5" />
                          Collect £{Number(b.amount_paid).toFixed(2)}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          ✓ Paid (£{Number(b.amount_paid).toFixed(2)})
                        </span>
                      )}

                      {/* No-Show / Reassign (Missing only) */}
                      {!b.is_boarded && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReassignBooking(b)
                              setWalkupPrice(Number(b.amount_paid) || 20)
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-blue-500/40 bg-blue-500/10 px-2.5 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition"
                            title="Reassign seat to walk-up fan"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Walk-Up</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkNoShow(b)}
                            className="inline-flex items-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Mark as No-Show"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          /* Paper / Print View Table */
          <div className="rounded-2xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] overflow-hidden shadow-lg print:border-black print:bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1a2742] bg-slate-100 dark:bg-[#0e1726] print:bg-slate-100 print:border-black">
                  <th className="p-3 font-bold text-slate-900 dark:text-white print:text-black w-10">#</th>
                  <th className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Passenger Name</th>
                  <th className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Phone Number</th>
                  <th className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Pickup Location</th>
                  <th className="p-3 font-bold text-slate-900 dark:text-white print:text-black text-right">Payment</th>
                  <th className="p-3 font-bold text-slate-900 dark:text-white print:text-black text-center w-20">Boarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1a2742] print:divide-slate-300">
                {bookings.map((b, index) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-[#0e1726]/30 print:hover:bg-transparent">
                    <td className="p-3 text-slate-500 print:text-slate-700 font-mono">{index + 1}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">{b.passenger_name}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400 print:text-slate-800">
                      {b.phone_number || '—'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 print:text-slate-800">{b.pickup_point}</td>
                    <td className="p-3 text-right">
                      {b.payment_status === 'paid' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 print:text-slate-900 font-semibold">
                          Paid (£{Number(b.amount_paid).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-[#ffc72c] print:text-black font-bold">
                          CASH: £{Number(b.amount_paid).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="h-5 w-5 border border-slate-400 dark:border-slate-600 print:border-black rounded mx-auto flex items-center justify-center">
                        {b.is_boarded && <span className="text-emerald-600 dark:text-emerald-400 print:text-black font-bold">✓</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Phone Modal */}
        {editingPhoneBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1a2742] pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">Add Contact Number</h3>
                <button onClick={() => setEditingPhoneBooking(null)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSavePhone} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile for {editingPhoneBooking.passenger_name}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="07123 456789"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#070b14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-[#ffc72c]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPhoneBooking(null)}
                    className="rounded-xl px-3 py-1.5 text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPhone}
                    className="rounded-xl bg-[#0057b8] dark:bg-[#ffc72c] px-4 py-1.5 text-xs font-bold text-white dark:text-[#070b14]"
                  >
                    {savingPhone ? 'Saving...' : 'Save Phone'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Walk-up Reassign Modal */}
        {reassignBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0a1220] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1a2742] pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-blue-600 dark:text-[#ffc72c]">Matchday Seat Reassignment</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Reassign {reassignBooking.passenger_name}&apos;s Seat</h3>
                </div>
                <button onClick={() => setReassignBooking(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReassignSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Walk-Up Supporter Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Davies"
                    value={walkupName}
                    onChange={(e) => setWalkupName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#070b14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-[#ffc72c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    placeholder="07..."
                    value={walkupPhone}
                    onChange={(e) => setWalkupPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#070b14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-[#ffc72c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cash Collected (£)</label>
                  <input
                    type="number"
                    required
                    value={walkupPrice}
                    onChange={(e) => setWalkupPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-50 dark:bg-[#070b14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-[#ffc72c]"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#1a2742] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReassignBooking(null)}
                    className="rounded-xl border border-slate-200 dark:border-[#1a2742] bg-slate-100 dark:bg-[#0e1726] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingWalkup}
                    className="rounded-xl bg-[#0057b8] dark:bg-[#ffc72c] px-5 py-2 text-xs font-black text-white dark:text-[#070b14] hover:opacity-90 transition shadow-lg"
                  >
                    {savingWalkup ? 'Reassigning...' : 'Assign Seat & Mark Boarded'}
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
