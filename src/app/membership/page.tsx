'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import SignOutButton from '@/components/SignOutButton'
import {
  ArrowLeft,
  Award,
  Check,
  ShieldCheck,
  Sparkles,
  Ticket,
  Bus,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  UserCheck
} from 'lucide-react'

export default function MembershipPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [successData, setSuccessData] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    loadMembershipStatus()
  }, [])

  async function loadMembershipStatus() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)

    if (authUser) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setProfile(prof)

      const { data: mem } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('payment_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (mem) setMembership(mem)
    }

    setLoading(false)
  }

  const handlePurchaseMembership = async () => {
    if (!user) {
      router.push('/login?redirect=/membership')
      return
    }

    setPurchasing(true)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.rpc('purchase_membership', {
        p_season: '2026/27',
        p_payment_method: 'pay_on_coach'
      })

      if (error) throw error

      setSuccessData(data)
      loadMembershipStatus()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to purchase membership.')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-salop-night text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-salop-gold" />
      </div>
    )
  }

  const isAlreadyMember = Boolean(profile?.is_member || membership)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-salop-night text-slate-900 dark:text-slate-100 p-6 md:p-12 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div className="flex items-center justify-between border-b border-salop-border pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fixtures
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? <SignOutButton /> : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-salop-surface border border-salop-border text-xs font-bold text-slate-300 hover:text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-salop-gold">
            2026/27 Supporters Club Official Travel
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Away Travel Membership
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Lock in discounted fares on every official supporter coach throughout the entire League One season.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ACTIVE MEMBER CARD */}
        {isAlreadyMember && !successData && (
          <div className="rounded-3xl border-2 border-salop-gold/50 bg-gradient-to-b from-salop-card to-salop-night p-8 shadow-2xl space-y-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-salop-gold/20 border border-salop-gold/40 text-salop-gold flex items-center justify-center mx-auto shadow-inner">
              <Award className="h-9 w-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase font-bold text-salop-gold tracking-widest">Active Supporter Status</span>
              <h2 className="text-2xl font-black text-white">{profile?.full_name || 'Shrewsbury Supporter'}</h2>
              <div className="inline-block px-4 py-1.5 rounded-full bg-salop-gold text-salop-night text-xs font-black tracking-wider mt-2">
                Member #{profile?.membership_number || membership?.membership_number}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-salop-surface border border-salop-border text-xs text-slate-300 grid grid-cols-2 gap-2 max-w-sm mx-auto">
              <div>Season: <strong className="text-white">2026/27</strong></div>
              <div>Discount: <strong className="text-emerald-400">Locked In (Per Match)</strong></div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl bg-salop-gold px-6 py-2.5 text-xs font-black text-salop-night hover:opacity-90 transition shadow-lg"
              >
                Book Travel with Member Discount
              </Link>
            </div>
          </div>
        )}

        {/* PURCHASE CONFIRMATION */}
        {successData && (
          <div className="rounded-3xl border-2 border-emerald-500/50 bg-salop-card p-8 shadow-2xl space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">Welcome to the Travel Club!</h2>
              <p className="text-xs text-slate-400">Your membership has been activated and bound to your account.</p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-salop-gold text-salop-night text-xs font-black tracking-wider mt-2">
                Member #{successData.membership_number}
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You can now book any fixture on the calendar and reduced member fares will apply automatically at checkout!
            </p>

            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl bg-salop-gold px-6 py-2.5 text-xs font-black text-salop-night hover:opacity-90 transition shadow-lg"
              >
                Explore Away Schedule
              </Link>
            </div>
          </div>
        )}

        {/* MEMBERSHIP VALUE CARD (NOT YET A MEMBER) */}
        {!isAlreadyMember && !successData && (
          <div className="rounded-3xl border border-salop-border bg-salop-card p-8 shadow-2xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-salop-border pb-6">
              <div>
                <span className="text-xs font-bold text-salop-gold uppercase tracking-wider">Official Season Pass</span>
                <h2 className="text-2xl font-black text-white">Away Travel Pass (2026/27)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Valid for all league & cup away coach bookings</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-3xl font-black text-salop-gold">£15.00</span>
                <span className="text-[11px] text-slate-400 block">per season</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Membership Benefits:</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-salop-surface border border-salop-border">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    <strong className="text-white">Save £2 to £5 per trip</strong> on all official supporter coaches.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-salop-surface border border-salop-border">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    <strong className="text-white">Automatic discount</strong> locked exclusively to your account.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-salop-surface border border-salop-border">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    <strong className="text-white">Priority Waiting List</strong> promotion when coaches sell out.
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-salop-surface border border-salop-border">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">
                    <strong className="text-white">Pays for itself</strong> after just 3–4 away days!
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-salop-surface border border-salop-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Banknote className="h-4 w-4 text-salop-gold" />
                <span>Pay £15.00 cash to the steward on your next coach trip.</span>
              </div>
            </div>

            <button
              onClick={handlePurchaseMembership}
              disabled={purchasing}
              className="w-full rounded-2xl bg-salop-gold py-3.5 text-sm font-black text-salop-night hover:opacity-90 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {purchasing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating Membership...
                </>
              ) : (
                'Join Supporters Club & Unlock Discount (£15)'
              )}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
