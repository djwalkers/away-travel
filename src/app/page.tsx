'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import SignOutButton from '@/components/SignOutButton'
import {
  Calendar,
  Clock,
  MapPin,
  Bus,
  Award,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ticket,
  User
} from 'lucide-react'

export default function HomePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [fixtures, setFixtures] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadHomeData()
  }, [])

  async function loadHomeData() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)

    if (authUser) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (prof) setProfile(prof)
    }

    const { data: fixData } = await supabase
      .from('fixtures')
      .select(`
        id,
        opponent,
        venue,
        match_date,
        kickoff_time,
        departure_time,
        is_released,
        coaches (
          id,
          coach_number,
          seat_capacity,
          is_active,
          bookings (id, payment_status)
        ),
        pricing_tiers (
          tier_name,
          standard_price,
          member_price
        )
      `)
      .order('match_date', { ascending: true })

    if (fixData) setFixtures(fixData)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-salop-night text-slate-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-salop-gold" />
      </div>
    )
  }

  const isMember = Boolean(profile?.is_member || (profile?.membership_number && profile.membership_number.trim() !== ''))
  const isAdmin = Boolean(profile?.is_admin)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-salop-night text-slate-900 dark:text-slate-100 p-4 sm:p-6 md:p-12 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Navigation Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-salop-border pb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-salop-gold/20 border border-salop-gold/40 flex items-center justify-center text-salop-gold font-black text-xl shadow-inner">
              STFC
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Away Travel Club
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Shrewsbury Town Supporters Away Coach Travel (2026/27)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/tracker"
              className="inline-flex items-center gap-1.5 rounded-xl border border-salop-border bg-salop-card px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm"
            >
              <Compass className="h-4 w-4 text-salop-blue" />
              92 Tracker
            </Link>

            <Link
              href="/membership"
              className="inline-flex items-center gap-1.5 rounded-xl bg-salop-gold px-4 py-2 text-xs font-black text-salop-night hover:opacity-90 transition shadow-md"
            >
              <Award className="h-4 w-4" />
              {isMember ? 'Membership Active' : 'Join Club (£15)'}
            </Link>

            {/* Admin Operations Shortcut */}
            {isAdmin && (
              <Link
                href="/admin/fixtures"
                className="inline-flex items-center gap-1.5 rounded-xl border border-salop-gold/40 bg-salop-gold/10 px-3.5 py-2 text-xs font-black text-salop-gold hover:bg-salop-gold/20 transition shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Panel
              </Link>
            )}

            {user ? (
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 rounded-xl border border-salop-border bg-salop-card px-3.5 py-2 text-xs font-bold text-white hover:bg-salop-surface transition"
              >
                <Ticket className="h-4 w-4 text-salop-gold" />
                My Passes
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-salop-border bg-salop-card px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
            )}

            <ThemeToggle />
            {user && <SignOutButton />}
          </div>
        </header>

        {/* Membership Promo Card if not yet a member */}
        {!isMember && (
          <div className="rounded-2xl border border-salop-gold/40 bg-gradient-to-r from-salop-card to-salop-surface p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-salop-gold/20 text-salop-gold flex items-center justify-center shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Save £2–£5 on Every Away Coach Trip</h3>
                <p className="text-xs text-slate-400">Join the official Supporters Travel Club for £15/season to unlock member discounts.</p>
              </div>
            </div>
            <Link
              href="/membership"
              className="rounded-xl bg-salop-gold px-4 py-2 text-xs font-black text-salop-night hover:opacity-90 transition shadow text-center shrink-0"
            >
              Get Membership
            </Link>
          </div>
        )}

        {/* Fixtures Schedule */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-salop-gold" />
              Upcoming Away Fixtures
            </h2>
            <span className="text-xs text-slate-500">{fixtures.length} matches listed</span>
          </div>

          <div className="grid gap-4">
            {fixtures.length === 0 ? (
              <div className="rounded-2xl border border-salop-border bg-salop-card p-12 text-center text-slate-500 text-sm">
                No upcoming away fixtures found. Check back shortly!
              </div>
            ) : (
              fixtures.map((f) => {
                const activeCoaches = (f.coaches || []).filter((c: any) => c.is_active)
                const totalCap = activeCoaches.reduce((s: number, c: any) => s + c.seat_capacity, 0)
                const totalBooked = activeCoaches.reduce(
                  (s: number, c: any) =>
                    s + (c.bookings?.filter((b: any) => b.payment_status !== 'cancelled').length || 0),
                  0
                )
                const seatsLeft = Math.max(0, totalCap - totalBooked)
                const adultTier = f.pricing_tiers?.find((t: any) => t.tier_name === 'Adult')

                return (
                  <div
                    key={f.id}
                    className="rounded-2xl border border-salop-border bg-salop-card p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-salop-gold/50 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-white">
                          vs {f.opponent}
                        </h3>
                        {f.is_released ? (
                          seatsLeft > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {seatsLeft} Seats Left
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-salop-gold border border-amber-500/30">
                              Waiting List Open
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                            Travel TBC
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-salop-gold" />
                          {f.venue}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(f.match_date).toLocaleDateString('en-GB', {
                            timeZone: 'Europe/London',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span>KO: {f.kickoff_time?.slice(0, 5) || '15:00'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {adultTier && (
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Fare</span>
                          <span className="text-lg font-black text-white">
                            £{isMember && adultTier.member_price ? Number(adultTier.member_price).toFixed(2) : Number(adultTier.standard_price).toFixed(2)}
                          </span>
                          {isMember && <span className="text-[10px] text-salop-gold font-bold block">Member Rate</span>}
                        </div>
                      )}

                      {f.is_released ? (
                        <Link
                          href={`/fixture/${f.id}`}
                          className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black transition shadow-lg ${
                            seatsLeft > 0
                              ? 'bg-salop-gold text-salop-night hover:opacity-90'
                              : 'bg-salop-surface border border-salop-border text-salop-gold hover:bg-salop-card'
                          }`}
                        >
                          {seatsLeft > 0 ? 'Book Seats' : 'Join Waitlist'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2.5 rounded-xl bg-salop-surface border border-salop-border text-xs font-bold text-slate-500 cursor-not-allowed"
                        >
                          Travel Opening Soon
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
