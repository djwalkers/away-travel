import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in -> send to login
  if (!user) {
    redirect('/login')
  }

  // Check if user is an administrator
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  // Logged in but not an admin -> redirect to supporter dashboard
  if (!profile || !profile.is_admin) {
    redirect('/account')
  }

  return <>{children}</>
}
