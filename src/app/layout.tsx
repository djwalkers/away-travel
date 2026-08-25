import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Away Travel Club | Shrewsbury Town FC Supporter Travel',
  description: 'Official supporter coach booking and fleet management for away fixtures.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070b14] text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
