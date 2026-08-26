'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from '@/components/SignOutButton'
import ThemeToggle from '@/components/ThemeToggle'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Calendar,
  Clock,
  Bus,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Ticket,
  Compass,
  HeartHandshake,
  CreditCard
} from 'lucide-react'

export default function SupporterAccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'trips' | 'profile'>('trips')
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>({
    full_name: '',
    phone_number: '',
    preferred_pickup: 'Croud Meadow (Main Stand)',
    membership_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  })
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    loadAccountData()
  }, [])

  async function loadAccountData() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      router.push('/login')
      return
    }

    setUser(authUser)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileData) {
      setProfile({
        full_name: profileData.full_name || '',
        phone_number: profileData.phone_number || '',
        preferred_pickup: profileData.preferred_pickup || 'Croud Meadow (Main Stand)',
        membership_number: profileData.membership_number || '',
        emergency_contact_name: profileData.emergency_contact_name || '',
        emergency_contact_phone: profileData.emergency_contact_phone || ''
      })
    }

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        id,
        passenger_name,
        tier_name,
        amount_paid,
        payment_method,
        payment_status,
        pickup_point,
        is_boarded,
        stripe_session_id,
        created_at,
        coaches (
          coach_number
        ),
        fixtures (
          id,
          opponent,
          venue,
          match_date,
          kickoff_time,
          departure_time
        )
      `)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })

    if (bookingsData) {
      setBookings(bookingsData)
    }

    setLoading(false)
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatusMessage(null)

    try {
      const updatePayload: Record<string, any> = {
        full_name: profile.full_name.trim(),
        phone_number: profile.phone_number.trim(),
        preferred_pickup: profile.preferred_pickup,
        membership_number: profile.membership_number.trim(),
        emergency_contact_name: profile.emergency_contact_name.trim(),
        emergency_contact_phone: profile.emergency_contact_phone.trim(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)

      if (error) throw error

      setStatusMessage({ type: 'success', text: 'Profile & contact details updated successfully!' })
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
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
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-salop-border pb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Fixtures
            </Link>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              Supporter Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your matchday coach seats, pickup points, and contact preferences.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-salop-gold px-4 py-2 text-xs font-black text-salop-night hover:opacity-90 transition shadow-md"
            >
              Book Travel
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>

        {/* User Summary Card */}
        <div className="rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-salop-gold/10 border border-salop-gold/30 flex items-center justify-center text-salop-gold">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {profile.full_name || 'Shrewsbury Supporter'}
                </h2>
                {profile.membership_number && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-salop-gold border border-amber-500/30 text-[10px] font-bold">
                    Member #{profile.membership_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {user?.email} {profile.phone_number ? `• ${profile.phone_number}` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-salop-border bg-salop-surface p-3 text-center sm:text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Away Bookings</span>
            <span className="text-xl font-black text-salop-gold">{bookings.length} Seats</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-salop-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'trips'
                ? 'bg-salop-gold text-salop-night shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="h-4 w-4" />
            My Booked Trips ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'profile'
                ? 'bg-salop-gold text-salop-night shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="h-4 w-4" />
            Profile & Contact Info
            {!profile.phone_number && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title="Phone number required" />
            )}
          </button>
        </div>

        {/* TAB 1: BOOKED TRIPS */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="rounded-2xl border border-salop-border bg-salop-card p-12 text-center text-slate-500 space-y-3">
                <Bus className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-white">No away trips booked yet.</p>
                <p className="text-xs">Browse upcoming league fixtures and book your seat on the official supporter coach!</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-salop-gold px-4 py-2 text-xs font-black text-salop-night hover:opacity-90 transition mt-2"
                >
                  View Schedule
                </Link>
              </div>
            ) : (
              bookings.map((booking) => {
                const fix = booking.fixtures
                const isPaid = booking.payment_status === 'paid'

                return (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-salop-border bg-salop-card p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-salop-border pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-salop-gold">
                          Official Boarding Pass
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                          vs {fix?.opponent}
                        </h3>
                        <p className="text-xs text-slate-400">{fix?.venue}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-salop-gold border border-amber-500/30'
                        }`}>
                          {isPaid ? '✓ Paid & Confirmed' : 'Reserved (Pay on Coach)'}
                        </span>

                        {booking.is_boarded && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            On Board
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Passenger</span>
                        <strong className="text-white text-sm">{booking.passenger_name}</strong>
                        <span className="text-[10px] text-slate-400 block">({booking.tier_name})</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Coach Allocation</span>
                        <strong className="text-salop-gold text-sm">
                          Coach {booking.coaches?.coach_number || 1}
                        </strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Match Date & KO</span>
                        <strong className="text-white">
                          {fix?.match_date ? new Date(fix.match_date).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' }) : ''}
                        </strong>
                        <span className="text-[10px] text-slate-400 block">KO: {fix?.kickoff_time?.slice(0, 5)}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Amount</span>
                        <strong className="text-white text-sm">£{Number(booking.amount_paid).toFixed(2)}</strong>
                        <span className="text-[10px] text-slate-400 block">{booking.payment_method === 'card' ? 'Online Card' : 'Cash on Coach'}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-salop-border bg-salop-surface p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="h-4 w-4 text-salop-gold shrink-0" />
                        <span>Pickup Location: <strong className="text-white">{booking.pickup_point}</strong></span>
                      </div>
                      {booking.stripe_session_id && (
                        <span className="font-mono text-[10px] text-slate-400">Ref: {booking.stripe_session_id}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* TAB 2: EDIT PROFILE & PREFERENCES */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave} className="rounded-2xl border border-salop-border bg-salop-card p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Supporter Profile & Contact Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep your contact details up to date so coach stewards can reach you during matchday roll calls.
              </p>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}>
                {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-salop-gold" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Andy Walker"
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-salop-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-salop-gold" />
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  placeholder="07123 456789"
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-salop-gold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Used by stewards to call or WhatsApp if you are running late.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-salop-gold" />
                  Default Preferred Pickup Stop
                </label>
                <select
                  value={profile.preferred_pickup}
                  onChange={(e) => setProfile({ ...profile, preferred_pickup: e.target.value })}
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-salop-gold"
                >
                  <option value="Croud Meadow (Main Stand)">Croud Meadow (Main Stand)</option>
                  <option value="Harlescott (Tesco Express / Layby)">Harlescott (Tesco Express / Layby)</option>
                  <option value="Bayston Hill (Foxholes)">Bayston Hill (Foxholes)</option>
                  <option value="Telford Services (M54 J4)">Telford Services (M54 J4)</option>
                  <option value="Whitchurch (Bypass Layby)">Whitchurch (Bypass Layby)</option>
                  <option value="Oswestry (Bus Station / Mile End)">Oswestry (Bus Station / Mile End)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-salop-gold" />
                  Supporters Club Membership #
                </label>
                <input
                  type="text"
                  value={profile.membership_number}
                  onChange={(e) => setProfile({ ...profile, membership_number: e.target.value })}
                  placeholder="e.g. STFC-8492"
                  className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-salop-gold"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Automatically applies member discounts at checkout.</span>
              </div>
            </div>

            <div className="border-t border-salop-border pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Emergency Contact (Next of Kin)
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={profile.emergency_contact_name}
                    onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                    placeholder="e.g. Next of Kin"
                    className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2 text-xs text-white focus:outline-none focus:border-salop-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={profile.emergency_contact_phone}
                    onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                    placeholder="07..."
                    className="w-full rounded-xl border border-salop-border bg-salop-night px-3.5 py-2 text-xs text-white focus:outline-none focus:border-salop-gold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-salop-gold px-6 py-2.5 text-xs font-black text-salop-night hover:opacity-90 transition shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Profile & Preferences
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </main>
  )
}
