'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#1a2742] bg-white dark:bg-[#0e1726] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shadow-sm"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign Out
    </button>
  )
}
