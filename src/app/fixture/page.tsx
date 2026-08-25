'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  CheckCircle2,
  Banknote,
  CreditCard,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'

interface PricingTier {
  id: string
  tier_name: string
  standard_price: number
  member_price: number
}

interface Coach {
  id: string
  coach_number: number
  seat_capacity: number
  is_active: boolean
  remaining_seats: number
}

interface Fixture {
  id: string
  opponent: string
  venue: string
  match_date: string
  kickoff_time: string
  departure_time: string
  pickup_location: string
}

interface Passenger {
  name: string
  tier_name: string
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const fixtureId = params?.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [fixture, setFixture] = useState<Fixture | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])

  // Form State
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [membershipNo, setMembershipNo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'pay_on_coach' | 'card'>('pay_on_coach')
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: '', tier_name: 'Adult' }
  ])

  // Confirmation State
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingSummary, setBookingSummary] = useState<any>(null)

  useEffect(() => {
    if (!fixtureId) return

    async function loadFixtureData() {
      setLoading(true)
      setErrorMessage(null)

      try {
        // 1. Fetch Fixture
        const { data: fixData, error: fixErr } = await supabase
          .from('fixtures')
          .select('*')
          .eq('id', fixtureId)
          .single()

        if (fixErr || !fixData) throw new Error('Fixture not found')
        setFixture(fixData)

        // 2. Fetch Coaches with Bookings
        const { data: coachData, error: coachErr } = await supabase
          .from('coaches')
          .select(`
            id,
            coach_number,
            seat_capacity,
            is_active,
            bookings (id, payment_status)
          `)
          .eq('fixture_id', fixtureId)
          .eq('is_active', true)
          .order('coach_number', { ascending: true })

        if (coachErr) throw coachErr

        const formattedCoaches: Coach[] = (coachData || []).map((c: any) => {
          const bookedCount = (c.bookings || []).filter(
            (b: any) => b.payment_status !== 'cancelled'
          ).length
          return {
            id: c.id,
            coach_number: c.coach_number,
            seat_capacity: c.seat_capacity,
            is_active: c.is_active,
            remaining_seats: Math.max(0, c.seat_capacity - bookedCount)
          }
        })

        setCoaches(formattedCoaches)

        // Default to first coach with available seats
        const availableCoach = formattedCoaches.find((c) => c.remaining_seats > 0)
        if (availableCoach) {
          setSelectedCoachId(availableCoach.id)
        }

        // 3. Fetch Pricing Tiers
        const { data: tierData, error: tierErr } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('fixture_id', fixtureId)

        if (tierErr) throw tierErr
        setPricingTiers(tierData || [])
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load booking information.')
      } finally {
        setLoading(false)
      }
    }

    loadFixtureData()
  }, [fixtureId])

  // Helper calculation for individual seat price
  const getPriceForTier = (tierName: string) => {
    const tier = pricingTiers.find((t) => t.tier_name === tierName)
    if (!tier) return 0
    return isMember ? Number(tier.member_price) : Number(tier.standard_price)
  }

  // Total price calculation
  const totalPrice = passengers.reduce((sum, p) => sum + getPriceForTier(p.tier_name), 0)

  const selectedCoach = coaches.find((c) => c.id === selectedCoachId)
  const remainingSeats = selectedCoach?.remaining_seats ?? 0

  const handleAddPassenger = () => {
    if (passengers.length >= remainingSeats) {
      alert(`Only ${remainingSeats} seat(s) remaining on this coach.`)
      return
    }
    if (passengers.length >= 6) {
      alert('Maximum 6 seats per booking.')
      return
    }
    setPassengers([...passengers, { name: '', tier_name: 'Adult' }])
  }

  const handleRemovePassenger = (index: number) => {
    if (passengers.length === 1) return
    setPassengers(passengers.filter((_, i) => i !== index))
  }

  const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers]
    updated[index][field] = value
    setPassengers(updated)
  }

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validate passenger names
    for (let i = 0; i < passengers.length; i++) {
      if (!passengers[i].name.trim()) {
        setErrorMessage(`Please enter the full name for Passenger ${i + 1}.`)
        return
      }
    }

    if (!selectedCoachId) {
      setErrorMessage('Please select an active coach.')
      return
    }

    if (passengers.length > remainingSeats) {
      setErrorMessage(`Only ${remainingSeats} seat(s) remaining on this coach.`)
      return
    }

    setSubmitting(true)

    const passengerPayload = passengers.map((p) => ({
      name: p.name.trim(),
      tier: p.tier_name,
      price: getPriceForTier(p.tier_name)
    }))

    try {
      // 1. Try atomic PostgreSQL RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('book_coach_seats', {
        p_fixture_id: fixtureId,
        p_coach_id: selectedCoachId,
        p_user_id: null,
        p_payment_method: paymentMethod,
        p_passengers: passengerPayload
      })

      if (rpcError) {
        // 2. Fallback: Direct insert if RPC is unavailable
        const inserts = passengerPayload.map((p) => ({
          fixture_id: fixtureId,
          coach_id: selectedCoachId,
          passenger_name: p.name,
          tier_name: p.tier,
          amount_paid: p.price,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'pay_on_coach' ? 'reserved' : 'paid'
        }))

        const { error: insertError } = await supabase.from('bookings').insert(inserts)
        if (insertError) throw insertError
      }

      // Success State
      setBookingSummary({
        fixture,
        coachNumber: selectedCoach?.coach_number,
        passengers: passengerPayload,
        total: totalPrice,
        paymentMethod,
        reference: `TC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      })
      setBookingComplete(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Booking submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading fixture details...</div>
      </div>
    )
  }

  if (bookingComplete && bookingSummary) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
        <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 shadow-2xl">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
            <h1 className="text-3xl font-extrabold text-white mt-4">
              {paymentMethod === 'pay_on_coach' ? 'Seats Reserved!' : 'Booking Confirmed!'}
            </h1>
            <p className="text-slate-400 mt-2">
              Booking Ref: <strong className="text-emerald-400 tracking-wider">{bookingSummary.reference}</strong>
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs uppercase font-semibold text-slate-400">Match</span>
              <h3 className="text-xl font-bold text-white">{fixture?.opponent}</h3>
              <p className="text-sm text-slate-400">{fixture?.venue}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Coach</span>
                <strong className="text-white">Coach {bookingSummary.coachNumber}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Departure</span>
                <strong className="text-white">{fixture?.departure_time?.slice(0, 5)}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Pickup Location</span>
                <span className="text-slate-300">{fixture?.pickup_location}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <span className="text-xs uppercase font-semibold text-slate-400 block mb-2">Passengers</span>
              <ul className="space-y-1.5 text-sm">
                {bookingSummary.passengers.map((p: any, idx: number) => (
                  <li key={idx} className="flex justify-between text-slate-300">
                    <span>{p.name} <span className="text-xs text-slate-500">({p.tier})</span></span>
                    <span className="font-semibold text-white">£{p.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-base">
              <span className="font-bold text-white">Total Amount</span>
              <span className="font-extrabold text-emerald-400 text-lg">£{bookingSummary.total.toFixed(2)}</span>
            </div>
          </div>

          {paymentMethod === 'pay_on_coach' && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Matchday Cash Payment Instructions:</strong>
                Please bring exact cash (£{bookingSummary.total.toFixed(2)}) and give your booking name to the coach steward before boarding.
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Fixtures
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Fixtures
        </Link>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* LEFT: Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{fixture?.opponent}</h1>
              <p className="text-slate-400 text-sm mt-1">{fixture?.venue}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm text-slate-300 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>
                    {fixture?.match_date
                      ? new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Departs: <strong className="text-white">{fixture?.departure_time?.slice(0, 5)}</strong></span>
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{fixture?.pickup_location}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-6">
              {/* Coach Fleet Selector */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
                <label className="block text-sm font-bold text-slate-200 mb-3">
                  Select Coach
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {coaches.map((coach) => (
                    <button
                      type="button"
                      key={coach.id}
                      disabled={coach.remaining_seats === 0}
                      onClick={() => setSelectedCoachId(coach.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition ${
                        selectedCoachId === coach.id
                          ? 'border-blue-500 bg-blue-600/10 text-white'
                          : coach.remaining_seats === 0
                          ? 'border-slate-800 bg-slate-900/40 text-slate-600 opacity-50 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold">Coach {coach.coach_number}</div>
                        <div className="text-xs text-slate-400">{coach.seat_capacity}-Seater</div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        coach.remaining_seats === 0
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {coach.remaining_seats === 0 ? 'Full' : `${coach.remaining_seats} seats left`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Membership Toggle */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Travel Club Member?</div>
                      <div className="text-xs text-slate-400">Get discounted supporter travel rates</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMember}
                      onChange={(e) => setIsMember(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {isMember && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Membership Number / Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TC-10482"
                      value={membershipNo}
                      onChange={(e) => setMembershipNo(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Passenger List */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Passenger Details</h3>
                    <p className="text-xs text-slate-400">Assign names and age tiers for each seat</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPassenger}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Seat
                  </button>
                </div>

                <div className="space-y-3">
                  {passengers.map((passenger, index) => (
                    <div key={index} className="flex gap-3 items-center rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder={`Passenger ${index + 1} Full Name`}
                          value={passenger.name}
                          onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-36">
                        <select
                          value={passenger.tier_name}
                          onChange={(e) => handlePassengerChange(index, 'tier_name', e.target.value)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        >
                          {pricingTiers.map((tier) => (
                            <option key={tier.id} value={tier.tier_name}>
                              {tier.tier_name} (£{isMember ? Number(tier.member_price).toFixed(2) : Number(tier.standard_price).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(index)}
                          className="p-2 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Mode */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
                <label className="block text-sm font-bold text-slate-200 mb-3">
                  Payment Option
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_coach')}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                      paymentMethod === 'pay_on_coach'
                        ? 'border-emerald-500 bg-emerald-600/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-sm">Reserve & Pay on Coach</div>
                      <div className="text-xs text-slate-400 mt-0.5">Pay cash to steward upon boarding</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                      paymentMethod === 'card'
                        ? 'border-blue-500 bg-blue-600/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-sm">Pay Online by Card</div>
                      <div className="text-xs text-slate-400 mt-0.5">Instant Stripe card confirmation</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={submitting || remainingSeats === 0}
                className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Reserving Seats...'
                  : paymentMethod === 'pay_on_coach'
                  ? `Confirm Reservation • £${totalPrice.toFixed(2)}`
                  : `Proceed to Pay • £${totalPrice.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* RIGHT: Order Summary Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Booking Summary
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Coach Allocation</span>
                  <span className="text-white font-medium">Coach {selectedCoach?.coach_number || 1}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Seats Selected</span>
                  <span className="text-white font-medium">{passengers.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Membership Rate</span>
                  <span className={isMember ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                    {isMember ? 'Applied' : 'Standard'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                {passengers.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-300">
                    <span>Seat {idx + 1}: {p.name || 'Passenger'} ({p.tier_name})</span>
                    <span>£{getPriceForTier(p.tier_name).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-lg">
                <span className="font-bold text-white">Total Due</span>
                <span className="font-extrabold text-white">£{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}