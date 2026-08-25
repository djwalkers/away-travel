'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Banknote,
  CreditCard,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Navigation,
  UserCheck,
  Loader2,
  UserPlus,
  Phone,
  Mail,
  Bus
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

interface PickupLocation {
  id: string
  location_name: string
  pickup_time: string
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
  const fixtureId = params?.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [fixture, setFixture] = useState<Fixture | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])

  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [selectedPickupId, setSelectedPickupId] = useState<string>('')
  const [isMember, setIsMember] = useState(false)
  const [membershipNo, setMembershipNo] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'pay_on_coach' | 'card'>('pay_on_coach')
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: '', tier_name: 'Adult' }
  ])

  // Waiting List State
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistPhone, setWaitlistPhone] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSeats, setWaitlistSeats] = useState(1)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)

  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingSummary, setBookingSummary] = useState<any>(null)

  useEffect(() => {
    if (!fixtureId) return

    async function loadFixtureData() {
      setLoading(true)
      setErrorMessage(null)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            if (profile.is_member) {
              setIsMember(true)
              if (profile.membership_number) setMembershipNo(profile.membership_number)
            }
            if (profile.full_name) {
              setPassengers([{ name: profile.full_name, tier_name: 'Adult' }])
              setWaitlistName(profile.full_name)
            }
            if (profile.phone_number) setWaitlistPhone(profile.phone_number)
            if (user.email) setWaitlistEmail(user.email)
          }
        }

        const { data: fixData, error: fixErr } = await supabase
          .from('fixtures')
          .select('*')
          .eq('id', fixtureId)
          .single()

        if (fixErr || !fixData) throw new Error('Fixture not found')
        setFixture(fixData)

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
        const availableCoach = formattedCoaches.find((c) => c.remaining_seats > 0)
        if (availableCoach) setSelectedCoachId(availableCoach.id)

        const { data: tierData, error: tierErr } = await supabase
          .from('pricing_tiers')
          .select('*')
          .eq('fixture_id', fixtureId)

        if (tierErr) throw tierErr
        setPricingTiers(tierData || [])

        const { data: pickupData, error: pickupErr } = await supabase
          .from('pickup_locations')
          .select('*')
          .eq('fixture_id', fixtureId)
          .order('sort_order', { ascending: true })

        if (!pickupErr && pickupData && pickupData.length > 0) {
          setPickupLocations(pickupData)
          setSelectedPickupId(pickupData[0].id)
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load booking details.')
      } finally {
        setLoading(false)
      }
    }

    loadFixtureData()
  }, [fixtureId])

  const getPriceForTier = (tierName: string) => {
    const tier = pricingTiers.find((t) => t.tier_name === tierName)
    if (!tier) return 0
    return isMember ? Number(tier.member_price) : Number(tier.standard_price)
  }

  const totalPrice = passengers.reduce((sum, p) => sum + getPriceForTier(p.tier_name), 0)
  const selectedCoach = coaches.find((c) => c.id === selectedCoachId)
  const selectedPickup = pickupLocations.find((p) => p.id === selectedPickupId)
  const totalCapacityRemaining = coaches.reduce((sum, c) => sum + c.remaining_seats, 0)

  const handleAddPassenger = () => {
    const remainingSeats = selectedCoach?.remaining_seats ?? 0
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

    if (pricingTiers.length === 0) {
      setErrorMessage('Pricing has not been configured for this fixture yet.')
      return
    }

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

    setSubmitting(true)

    const pickupString = selectedPickup
      ? `${selectedPickup.location_name} (${selectedPickup.pickup_time.slice(0, 5)})`
      : fixture?.pickup_location || 'Main Stadium'

    const passengerPayload = passengers.map((p) => ({
      name: p.name.trim(),
      tier_name: p.tier_name,
      pickup_point: pickupString
    }))

    try {
      const { data, error } = await supabase.rpc('book_coach_seats', {
        p_fixture_id: fixtureId,
        p_coach_id: selectedCoachId,
        p_user_id: currentUser ? currentUser.id : null,
        p_passengers: passengerPayload,
        p_payment_method: paymentMethod
      })

      if (error) throw error

      setBookingSummary({
        fixture,
        coachNumber: data.coach_number,
        pickupPoint: pickupString,
        passengers: passengers.map((p) => ({
          name: p.name,
          tier: p.tier_name,
          price: getPriceForTier(p.tier_name)
        })),
        total: Number(data.total_amount),
        paymentMethod,
        reference: data.booking_reference
      })
      setBookingComplete(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Booking submission failed. Please refresh and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Waiting List Submission
  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitlistName.trim() || !waitlistPhone.trim()) return

    setSubmitting(true)
    setErrorMessage(null)

    const pickupString = selectedPickup
      ? `${selectedPickup.location_name}`
      : fixture?.pickup_location || 'Main Stadium'

    try {
      const { error } = await supabase.from('waiting_list').insert({
        fixture_id: fixtureId,
        user_id: currentUser ? currentUser.id : null,
        supporter_name: waitlistName.trim(),
        contact_phone: waitlistPhone.trim(),
        contact_email: waitlistEmail.trim() || null,
        seats_requested: waitlistSeats,
        pickup_point: pickupString
      })

      if (error) throw error
      setWaitlistSuccess(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not join waiting list.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-[#ffc72c]">Loading away match details...</div>
      </div>
    )
  }

  if (bookingComplete && bookingSummary) {
    return (
      <main className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-12">
        <div className="max-w-2xl mx-auto rounded-2xl border border-[#1a2742] bg-[#0a1220] p-8 shadow-2xl">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-[#ffc72c] mx-auto" />
            <h1 className="text-3xl font-black text-white mt-4">
              {paymentMethod === 'card' ? 'Payment Confirmed!' : 'Coach Seats Reserved!'}
            </h1>
            <p className="text-slate-400 mt-2">
              Booking Ref: <strong className="text-[#ffc72c] tracking-wider">{bookingSummary.reference}</strong>
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-[#1a2742] bg-[#0e1726] p-6 space-y-4">
            <div className="border-b border-[#1a2742] pb-3 flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-bold text-[#ffc72c]">Match</span>
                <h3 className="text-xl font-bold text-white">{fixture?.opponent}</h3>
                <p className="text-sm text-slate-400">{fixture?.venue}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                paymentMethod === 'card'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-[#ffc72c] border border-[#ffc72c]/30'
              }`}>
                {paymentMethod === 'card' ? 'Paid by Card' : 'Pay on Coach'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Coach Allocation</span>
                <strong className="text-[#ffc72c] text-base">Coach {bookingSummary.coachNumber}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Match Kickoff</span>
                <strong className="text-white">{fixture?.kickoff_time?.slice(0, 5)}</strong>
              </div>
              <div className="col-span-2 rounded-lg bg-[#0057b8]/10 border border-[#0057b8]/30 p-3">
                <span className="text-xs font-bold text-[#ffc72c] uppercase tracking-wider block">Pickup Point</span>
                <div className="flex items-center gap-2 mt-1 text-white font-medium">
                  <MapPin className="h-4 w-4 text-[#ffc72c] shrink-0" />
                  <span>{bookingSummary.pickupPoint}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#1a2742] pt-4">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-2">Passengers</span>
              <ul className="space-y-1.5 text-sm">
                {bookingSummary.passengers.map((p: any, idx: number) => (
                  <li key={idx} className="flex justify-between text-slate-300">
                    <span>{p.name} <span className="text-xs text-slate-400">({p.tier})</span></span>
                    <span className="font-bold text-white">£{Number(p.price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[#1a2742] pt-3 flex justify-between items-center text-base">
              <span className="font-bold text-white">Total Amount</span>
              <span className="font-black text-[#ffc72c] text-xl">£{Number(bookingSummary.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            {currentUser && (
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0057b8] px-6 py-3 text-sm font-bold text-white hover:bg-[#004694] transition"
              >
                View in My Account
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0e1726] border border-[#1a2742] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a2742] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Fixtures
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fixtures
          </Link>

          {currentUser ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#ffc72c] bg-[#ffc72c]/10 border border-[#ffc72c]/30 px-3 py-1 rounded-full font-bold">
              <UserCheck className="h-3.5 w-3.5" /> Logged In
            </span>
          ) : (
            <Link href="/login" className="text-xs text-[#ffc72c] hover:underline font-semibold">
              Sign in for faster booking
            </Link>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ffc72c]">Away Fixture</span>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1">{fixture?.opponent}</h1>
              <p className="text-slate-400 text-sm">{fixture?.venue}</p>

              <div className="grid grid-cols-2 gap-4 mt-6 text-sm text-slate-300 border-t border-[#1a2742] pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#ffc72c]" />
                  <span>
                    {fixture?.match_date
                      ? new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          timeZone: 'Europe/London',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#1e6fe0]" />
                  <span>Kickoff: <strong className="text-white">{fixture?.kickoff_time?.slice(0, 5)}</strong></span>
                </div>
              </div>
            </div>

            {/* WAITING LIST CARD (When all coaches are full) */}
            {totalCapacityRemaining === 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#ffc72c] shrink-0 mt-1">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Coaches Currently Full</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      All allocated seats for this fixture are currently booked. Join the waiting list below — if demand is high enough, we will book an additional coach and notify you!
                    </p>
                  </div>
                </div>

                {waitlistSuccess ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                    <h4 className="text-base font-bold text-white">You&apos;re on the Waiting List!</h4>
                    <p className="text-xs text-slate-300">
                      We have recorded your request for {waitlistSeats} seat(s). We will text or email you immediately if a new coach is released.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleJoinWaitlist} className="space-y-3 pt-2">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Your Full Name *</label>
                        <input
                          type="text"
                          required
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          placeholder="Andy Walker"
                          className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3 py-2 text-sm text-white focus:border-[#ffc72c] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone Number *</label>
                        <div className="relative">
                          <Phone className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="tel"
                            required
                            value={waitlistPhone}
                            onChange={(e) => setWaitlistPhone(e.target.value)}
                            placeholder="07123 456789"
                            className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] pl-9 pr-3 py-2 text-sm text-white focus:border-[#ffc72c] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="email"
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] pl-9 pr-3 py-2 text-sm text-white focus:border-[#ffc72c] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Seats Needed</label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={waitlistSeats}
                          onChange={(e) => setWaitlistSeats(Number(e.target.value))}
                          className="w-full rounded-xl border border-[#1a2742] bg-[#070b14] px-3 py-2 text-sm text-white focus:border-[#ffc72c] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffc72c] py-3 text-sm font-black text-[#070b14] hover:bg-[#e6b022] transition shadow-lg disabled:opacity-50"
                    >
                      {submitting ? 'Submitting Request...' : 'Join Official Waiting List'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* STANDARD BOOKING FORM */
              <form onSubmit={handleSubmitBooking} className="space-y-6">
                {/* Pickup Stops */}
                <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="h-5 w-5 text-[#ffc72c]" />
                    <label className="text-sm font-bold text-white">
                      Choose Your Pickup Location & Time
                    </label>
                  </div>

                  {pickupLocations.length > 0 ? (
                    <div className="space-y-2.5">
                      {pickupLocations.map((loc) => (
                        <button
                          type="button"
                          key={loc.id}
                          onClick={() => setSelectedPickupId(loc.id)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                            selectedPickupId === loc.id
                              ? 'border-[#ffc72c] bg-[#ffc72c]/10 text-white'
                              : 'border-[#1a2742] bg-[#0e1726] text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className={`h-4 w-4 ${selectedPickupId === loc.id ? 'text-[#ffc72c]' : 'text-slate-500'}`} />
                            <span className="font-medium text-sm">{loc.location_name}</span>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#070b14] text-[#ffc72c] border border-[#1a2742]">
                            {loc.pickup_time.slice(0, 5)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Departs {fixture?.departure_time?.slice(0, 5)} from {fixture?.pickup_location}
                    </p>
                  )}
                </div>

                {/* Coach Fleet Selector (Coach 1, 2, 3) */}
                <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-lg">
                  <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Bus className="h-4 w-4 text-[#ffc72c]" />
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
                            ? 'border-[#0057b8] bg-[#0057b8]/15 text-white'
                            : coach.remaining_seats === 0
                            ? 'border-[#1a2742] bg-[#0e1726]/50 text-slate-600 opacity-50 cursor-not-allowed'
                            : 'border-[#1a2742] bg-[#0e1726] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="font-bold">Coach {coach.coach_number}</div>
                          <div className="text-xs text-slate-400">{coach.seat_capacity}-Seater</div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          coach.remaining_seats === 0
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-[#ffc72c]/10 text-[#ffc72c] border border-[#ffc72c]/30'
                        }`}>
                          {coach.remaining_seats === 0 ? 'Full' : `${coach.remaining_seats} seats left`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Passenger List */}
                <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Passenger Details</h3>
                      <p className="text-xs text-slate-400">Assign names and age tiers for each seat</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPassenger}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a2742] bg-[#0e1726] px-3 py-1.5 text-xs font-bold text-[#ffc72c] hover:bg-[#1a2742] transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Seat
                    </button>
                  </div>

                  <div className="space-y-3">
                    {passengers.map((passenger, index) => (
                      <div key={index} className="flex gap-3 items-center rounded-xl border border-[#1a2742] bg-[#0e1726] p-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            required
                            placeholder={`Passenger ${index + 1} Full Name`}
                            value={passenger.name}
                            onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                            className="w-full rounded-lg border border-[#1a2742] bg-[#070b14] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#ffc72c] focus:outline-none"
                          />
                        </div>
                        <div className="w-44">
                          <select
                            value={passenger.tier_name}
                            onChange={(e) => handlePassengerChange(index, 'tier_name', e.target.value)}
                            className="w-full rounded-lg border border-[#1a2742] bg-[#070b14] px-3 py-2 text-sm text-white focus:border-[#ffc72c] focus:outline-none"
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
                <div className="rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-lg">
                  <label className="block text-sm font-bold text-white mb-3">
                    Payment Option
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pay_on_coach')}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                        paymentMethod === 'pay_on_coach'
                          ? 'border-[#ffc72c] bg-[#ffc72c]/10 text-white'
                          : 'border-[#1a2742] bg-[#0e1726] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Banknote className="h-5 w-5 text-[#ffc72c] shrink-0 mt-0.5" />
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
                          ? 'border-[#0057b8] bg-[#0057b8]/15 text-white'
                          : 'border-[#1a2742] bg-[#0e1726] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 text-[#1e6fe0] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white text-sm">Pay Online by Card</div>
                        <div className="text-xs text-slate-400 mt-0.5">Instant booking confirmation</div>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || selectedCoach?.remaining_seats === 0 || pricingTiers.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ffc72c] py-3.5 text-base font-black text-[#070b14] shadow-xl transition hover:bg-[#e6b022] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Reservation...
                    </>
                  ) : (
                    `Confirm Booking • £${totalPrice.toFixed(2)}`
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-2xl border border-[#1a2742] bg-[#0a1220] p-6 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white border-b border-[#1a2742] pb-3">
                Trip Overview
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Pickup Location</span>
                  <span className="text-white font-medium truncate max-w-[140px] text-right">
                    {selectedPickup?.location_name.split('(')[0] || 'Default'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Departure Time</span>
                  <span className="text-[#ffc72c] font-bold">
                    {selectedPickup?.pickup_time.slice(0, 5) || fixture?.departure_time?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Coach Status</span>
                  <span className={totalCapacityRemaining === 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                    {totalCapacityRemaining === 0 ? 'Coaches Full' : `${totalCapacityRemaining} seats available`}
                  </span>
                </div>
              </div>

              {totalCapacityRemaining > 0 && (
                <>
                  <div className="border-t border-[#1a2742] pt-3 space-y-2">
                    {passengers.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-300">
                        <span>Seat {idx + 1}: {p.name || 'Passenger'} ({p.tier_name})</span>
                        <span>£{getPriceForTier(p.tier_name).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#1a2742] pt-3 flex justify-between items-center text-lg">
                    <span className="font-bold text-white">Total Due</span>
                    <span className="font-black text-[#ffc72c] text-xl">£{totalPrice.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
