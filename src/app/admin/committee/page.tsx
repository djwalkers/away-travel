'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatWhatsAppPhone } from '@/lib/sanitizers'
import {
  TrendingUp,
  Users,
  Bus,
  Banknote,
  Navigation,
  Share2,
  Copy,
  Check,
  UserPlus,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  MessageCircle,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  PieChart,
  Loader2,
  ExternalLink,
  MapPin,
  X
} from 'lucide-react'

const STADIUM_DISTANCES: Record<string, number> = {
  'rochdale': 168,
  'fleetwood town': 210,
  'wrexham': 64,
  'stockport county': 140,
  'crewe alexandra': 72,
  'port vale': 92,
  'walsall': 78,
  'bristol rovers': 214,
  'reading': 276,
  'blackpool': 202,
  'exeter city': 340,
  'carlisle united': 330
}

export default function CommitteeHubPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'analytics' | 'waitlist' | 'broadcast' | 'pl'>('analytics')

  const [fixtures, setFixtures] = useState<any[]>([])
  const [waitlist, setWaitlist] = useState<any[]>([])
  const [selectedFixtureForBroadcast, setSelectedFixtureForBroadcast] = useState<any | null>(null)
  const [copiedText, setCopiedText] = useState(false)

  // Promotion modal
  const [promotingEntry, setPromotingEntry] = useState<any | null>(null)
  const [targetCoachId, setTargetCoachId] = useState<string>('')
  const [isPromoting, setIsPromoting] = useState(false)
  const [promotionResult, setPromotionResult] = useState<any | null>(null)

  useEffect(() => {
    loadCommitteeData()
  }, [])

  async function loadCommitteeData() {
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
        pickup_location,
        is_active,
        is_released,
        coaches (
          id,
          coach_number,
          seat_capacity,
          hire_cost,
          is_active,
          bookings (
            id,
            passenger_name,
            phone_number,
            amount_paid,
            payment_method,
            payment_status,
            pickup_point,
            is_boarded
          )
        ),
        pricing_tiers (
          tier_name,
          standard_price,
          member_price
        )
      `)
      .order('match_date', { ascending: true })

    if (fixData) {
      setFixtures(fixData)
      const released = fixData.filter((f) => f.is_released)
      if (released.length > 0) setSelectedFixtureForBroadcast(released[0])
    }

    const { data: waitData } = await supabase
      .from('waiting_list')
      .select('*, fixtures(opponent, venue, match_date)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })

    if (waitData) setWaitlist(waitData)

    setLoading(false)
  }

  let totalSupportersCarried = 0
  let totalRevenue = 0
  let totalFleetCapacity = 0
  let totalCoachMiles = 0
  let totalHireCosts = 0
  const pickupTally: Record<string, number> = {}

  fixtures.forEach((f) => {
    const oppKey = f.opponent.toLowerCase().trim()
    const tripMiles = STADIUM_DISTANCES[oppKey] || 150

    f.coaches?.forEach((c: any) => {
      if (c.is_active) {
        totalFleetCapacity += c.seat_capacity
        totalHireCosts += Number(c.hire_cost || 0)

        const activeBookings = (c.bookings || []).filter((b: any) => b.payment_status !== 'cancelled')
        totalSupportersCarried += activeBookings.length

        if (activeBookings.length > 0) {
          totalCoachMiles += tripMiles
        }

        activeBookings.forEach((b: any) => {
          totalRevenue += Number(b.amount_paid || 0)
          const stop = (b.pickup_point || 'Croud Meadow').split('(')[0].trim()
          pickupTally[stop] = (pickupTally[stop] || 0) + 1
        })
      }
    })
  })

  const overallOccupancy = totalFleetCapacity > 0
    ? Math.round((totalSupportersCarried / totalFleetCapacity) * 100)
    : 0

  const sortedPickups = Object.entries(pickupTally).sort((a, b) => b[1] - a[1])

  const handlePromoteSupporter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promotingEntry || !targetCoachId) return

    setIsPromoting(true)
    try {
      const { data, error } = await supabase.rpc('promote_waitlist_supporter', {
        p_waitlist_id: promotingEntry.id,
        p_coach_id: targetCoachId,
        p_tier_name: 'Adult'
      })

      if (error) throw error

      setPromotionResult(data)
      setPromotingEntry(null)
      loadCommitteeData()
    } catch (err: any) {
      alert('Error promoting supporter: ' + err.message)
    } finally {
      setIsPromoting(false)
    }
  }

  const generateBroadcastCopy = (fixture: any) => {
    if (!fixture) return ''

    const activeCoaches = (fixture.coaches || []).filter((c: any) => c.is_active)
    const matchDateStr = new Date(fixture.match_date).toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })

    let coachLines = ''
    activeCoaches.forEach((c: any) => {
      const booked = (c.bookings || []).filter((b: any) => b.payment_status !== 'cancelled').length
      const remaining = Math.max(0, c.seat_capacity - booked)
      if (remaining === 0) {
        coachLines += `• Coach ${c.coach_number}: ${c.seat_capacity}/${c.seat_capacity} (FULL - WAITING LIST ACTIVE)\n`
      } else {
        coachLines += `• Coach ${c.coach_number}: ${remaining} seats remaining (${booked}/${c.seat_capacity})\n`
      }
    })

    const adultTier = fixture.pricing_tiers?.find((t: any) => t.tier_name === 'Adult')
    const priceLine = adultTier
      ? `🎟️ Fares: £${Number(adultTier.standard_price).toFixed(2)} (Members: £${Number(adultTier.member_price).toFixed(2)})`
      : '🎟️ Official Subsidised Supporter Fares'

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://saloptravel.vercel.app'

    return `🚌 *SHREWSBURY TOWN AWAY TRAVEL UPDATE*\n` +
      `⚽ *vs ${fixture.opponent}* (${fixture.venue})\n` +
      `📅 ${matchDateStr} | Kickoff: ${fixture.kickoff_time?.slice(0, 5) || '15:00'}\n` +
      `📍 Main Departure: ${fixture.departure_time?.slice(0, 5) || 'TBD'} from Croud Meadow\n\n` +
      `📊 *Coach Availability:*\n${coachLines}\n` +
      `${priceLine}\n` +
      `⚡ Shropshire Pickups: Croud Meadow, Harlescott, Telford, Whitchurch, Oswestry\n\n` +
      `👉 *Book Seats Online:* ${siteUrl}/fixture/${fixture.id}\n` +
      `🔵 *Floreat Salopia!*`
  }

  const broadcastText = selectedFixtureForBroadcast ? generateBroadcastCopy(selectedFixtureForBroadcast) : ''

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(broadcastText)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-salop-night text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-salop-gold" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-salop-night text-slate-900 dark:text-slate-100 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-salop-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin/fixtures" className="text-xs font-bold text-slate-400 hover:text-white transition">
                ← Matchday Operations
              </Link>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
              <ShieldCheck className="h-8 w-8 text-salop-blue dark:text-salop-gold" />
              Committee & Fleet Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Executive reporting, waitlist priority management, P&L reconciliations, and social broadcast tools.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/fixtures"
              className="rounded-xl border border-salop-border bg-salop-surface px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm"
            >
              Steward Manifests
            </Link>
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-salop-border pb-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'analytics'
                ? 'bg-salop-blue dark:bg-salop-gold text-white dark:text-salop-night shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="h-4 w-4" />
            Season KPIs & Occupancy
          </button>

          <button
            onClick={() => setActiveTab('waitlist')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'waitlist'
                ? 'bg-salop-blue dark:bg-salop-gold text-white dark:text-salop-night shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Waitlist Priority Manager ({waitlist.length})
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'broadcast'
                ? 'bg-salop-blue dark:bg-salop-gold text-white dark:text-salop-night shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="h-4 w-4" />
            Social & WhatsApp Broadcast
          </button>

          <button
            onClick={() => setActiveTab('pl')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'pl'
                ? 'bg-salop-blue dark:bg-salop-gold text-white dark:text-salop-night shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Banknote className="h-4 w-4" />
            Trip Financials & P&L
          </button>
        </div>

        {/* TAB 1: SEASON ANALYTICS & OCCUPANCY KPIS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Supporters Carried</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-6 w-6 text-salop-blue dark:text-salop-gold" />
                  {totalSupportersCarried}
                </div>
                <span className="text-[11px] text-slate-500 block">Season to date</span>
              </div>

              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fleet Occupancy Rate</span>
                <div className="text-3xl font-black text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  {overallOccupancy}%
                </div>
                <span className="text-[11px] text-slate-500 block">{totalSupportersCarried} / {totalFleetCapacity} seats filled</span>
              </div>

              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Travel Revenue</span>
                <div className="text-3xl font-black text-salop-gold flex items-center gap-2">
                  <Banknote className="h-6 w-6" />
                  £{totalRevenue.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500 block">Card & Cash Collected</span>
              </div>

              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Salop Coach Mileage</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Navigation className="h-6 w-6 text-salop-blue" />
                  {totalCoachMiles}
                </div>
                <span className="text-[11px] text-slate-500 block">Round-trip road miles</span>
              </div>
            </div>

            <div className="rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-salop-border pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-salop-gold" />
                  Pickup Point Utilization & Passenger Traffic
                </h3>
                <span className="text-xs text-slate-500">Route planning intelligence</span>
              </div>

              {sortedPickups.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No passenger pickups logged yet.</div>
              ) : (
                <div className="space-y-3">
                  {sortedPickups.map(([stopName, count], idx) => {
                    const percentage = totalSupportersCarried > 0
                      ? Math.round((count / totalSupportersCarried) * 100)
                      : 0

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-200">{idx + 1}. {stopName}</span>
                          <span className="text-salop-gold">{count} fans ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-salop-night overflow-hidden">
                          <div
                            className="h-full bg-salop-gold rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 1-CLICK WAITING LIST AUTO-PROMOTION */}
        {activeTab === 'waitlist' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-salop-border pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Active Waiting List Priority Queue
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    When a coach seat becomes available or an extra coach is chartered, promote supporters with 1 click.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-salop-gold border border-amber-500/30">
                  {waitlist.length} In Queue
                </span>
              </div>

              {promotionResult && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs space-y-2">
                  <div className="font-bold text-sm">
                    ✓ Promoted {promotionResult.supporter_name} to Coach {promotionResult.coach_number}!
                  </div>
                  <p>
                    Booking Reference: <strong>{promotionResult.booking_reference}</strong> • Amount Due: £{Number(promotionResult.total_amount).toFixed(2)}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <a
                      href={`https://wa.me/${formatWhatsAppPhone(promotionResult.phone)}?text=${encodeURIComponent(
                        `Hi ${promotionResult.supporter_name.split(' ')[0]}, great news! A seat has opened up on Coach ${promotionResult.coach_number} for Shrewsbury Town away! Your booking reference is ${promotionResult.booking_reference}. Please confirm you're still joining us!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-bold shadow hover:bg-emerald-700 transition"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Send WhatsApp Confirmation
                    </a>
                  </div>
                </div>
              )}

              {waitlist.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm space-y-2">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-white">Waiting List is Clean!</p>
                  <p className="text-xs text-slate-500">Every supporter has a confirmed seat on our active coaches.</p>
                </div>
              ) : (
                <div className="divide-y divide-salop-border">
                  {waitlist.map((item, idx) => (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {idx + 1}. {item.supporter_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-salop-gold text-[10px] font-bold">
                            {item.seats_requested} Seat(s)
                          </span>
                          <span className="text-xs text-slate-400">
                            for vs <strong>{item.fixtures?.opponent}</strong>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" />
                            {item.contact_phone}
                          </span>
                          <span>Pickup: {item.pickup_point}</span>
                          <span>
                            Joined: {new Date(item.created_at).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPromotingEntry(item)
                          const fix = fixtures.find((f) => f.id === item.fixture_id)
                          if (fix?.coaches?.[0]) setTargetCoachId(fix.coaches[0].id)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-salop-gold px-4 py-2 text-xs font-black text-salop-night hover:opacity-90 transition shadow-md shrink-0"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Promote to Coach Seat
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SOCIAL & WHATSAPP BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg space-y-3">
                <h3 className="font-bold text-white text-sm">
                  Select Away Fixture
                </h3>
                <div className="space-y-2">
                  {fixtures.filter((f) => f.is_released).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFixtureForBroadcast(f)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition ${
                        selectedFixtureForBroadcast?.id === f.id
                          ? 'border-salop-gold bg-salop-gold/10 text-salop-gold'
                          : 'border-salop-border text-slate-300 hover:bg-salop-surface'
                      }`}
                    >
                      <div>vs {f.opponent}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {new Date(f.match_date).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-salop-border pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Pre-Formatted Broadcast Message
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ready to copy & paste into WhatsApp Fan Groups, Facebook, and ShrewsWeb.
                    </p>
                  </div>

                  <button
                    onClick={handleCopyBroadcast}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition shadow-md"
                  >
                    {copiedText ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Broadcast
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl border border-salop-border bg-salop-night p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {broadcastText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TRIP FINANCIALS & P&L */}
        {activeTab === 'pl' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400">Gross Ticket Revenue</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  £{totalRevenue.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Coach Hire Invoices</span>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  £{totalHireCosts.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl border border-salop-border bg-salop-card p-5 shadow-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400">Net Supporter Club Surplus</span>
                <div className={`text-2xl font-black mt-1 ${totalRevenue >= totalHireCosts ? 'text-salop-gold' : 'text-rose-500'}`}>
                  £{(totalRevenue - totalHireCosts).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-salop-border bg-salop-card overflow-hidden shadow-xl">
              <div className="p-5 border-b border-salop-border">
                <h3 className="font-bold text-white text-sm">
                  Trip by Trip Financial Breakdown
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-salop-border bg-salop-surface text-slate-400">
                      <th className="p-3.5 font-bold">Fixture</th>
                      <th className="p-3.5 font-bold">Coaches</th>
                      <th className="p-3.5 font-bold">Seats Booked</th>
                      <th className="p-3.5 font-bold">Revenue</th>
                      <th className="p-3.5 font-bold">Hire Cost</th>
                      <th className="p-3.5 font-bold text-right">Net Profit / (Loss)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-salop-border">
                    {fixtures.filter((f) => f.is_released).map((f) => {
                      const coaches = f.coaches || []
                      const booked = coaches.reduce((s: number, c: any) => s + (c.bookings?.filter((b: any) => b.payment_status !== 'cancelled').length || 0), 0)
                      const revenue = coaches.reduce((s: number, c: any) => s + (c.bookings?.filter((b: any) => b.payment_status !== 'cancelled').reduce((bs: number, b: any) => bs + Number(b.amount_paid || 0), 0) || 0), 0)
                      const hireCost = coaches.reduce((s: number, c: any) => s + Number(c.hire_cost || 0), 0)
                      const net = revenue - hireCost

                      return (
                        <tr key={f.id} className="hover:bg-salop-surface/40 transition">
                          <td className="p-3.5 font-bold text-white">vs {f.opponent}</td>
                          <td className="p-3.5 text-slate-300">{coaches.length} Coach(es)</td>
                          <td className="p-3.5 text-slate-300">{booked} passengers</td>
                          <td className="p-3.5 font-bold text-emerald-400">£{revenue.toFixed(2)}</td>
                          <td className="p-3.5 text-slate-400">£{hireCost.toFixed(2)}</td>
                          <td className={`p-3.5 font-black text-right ${net >= 0 ? 'text-salop-gold' : 'text-rose-500'}`}>
                            £{net.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Promotion Confirmation Modal */}
        {promotingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-salop-border bg-salop-card p-6 shadow-2xl space-y-4">
              <div className="border-b border-salop-border pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-salop-gold">1-Click Waitlist Promotion</span>
                  <h3 className="text-lg font-black text-white">Promote {promotingEntry.supporter_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">vs {promotingEntry.fixtures?.opponent} ({promotingEntry.seats_requested} seat(s))</p>
                </div>
                <button
                  onClick={() => setPromotingEntry(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePromoteSupporter} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Assign to Coach
                  </label>
                  <select
                    value={targetCoachId}
                    onChange={(e) => setTargetCoachId(e.target.value)}
                    className="w-full rounded-xl border border-salop-border bg-salop-night px-3 py-2 text-sm text-white focus:outline-none focus:border-salop-gold"
                  >
                    {fixtures
                      .find((f) => f.id === promotingEntry.fixture_id)
                      ?.coaches?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          Coach {c.coach_number} ({c.seat_capacity}-seater)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPromotingEntry(null)}
                    className="rounded-xl border border-salop-border px-4 py-2 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPromoting}
                    className="rounded-xl bg-salop-gold px-5 py-2 text-xs font-black text-salop-night hover:opacity-90 transition shadow-lg disabled:opacity-50"
                  >
                    {isPromoting ? 'Promoting...' : 'Confirm Seat Promotion'}
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
