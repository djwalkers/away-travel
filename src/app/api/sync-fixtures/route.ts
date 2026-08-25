import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ical from 'ical'

export const dynamic = 'force-dynamic'

const FEED_URLS = [
  'https://ics.fixtur.es/v2/league-one/shrewsbury-town.ics',
  'https://ics.fixtur.es/v2/league-two/shrewsbury-town.ics',
  'https://ics.fixtur.es/v2/shrewsbury-town.ics'
]

// Converts any Date object to exact UK date ("YYYY-MM-DD") and time ("HH:mm:ss") accounting for BST / GMT
function getUKDateTimeStrings(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const p: Record<string, string> = {}
  parts.forEach(({ type, value }) => {
    p[type] = value
  })

  const ukDate = `${p.year}-${p.month}-${p.day}`
  const ukTime = `${p.hour}:${p.minute}:${p.second}`
  return { ukDate, ukTime }
}

export async function GET(request: Request) {
  const supabase = await createClient()

  // 1. Authorization: Allow authenticated Admins OR calls with CRON_SECRET header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  let isAuthorized = false

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (profile?.is_admin) isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 })
  }

  let icsText: string | null = null

  // 2. Fetch iCal feed with browser header
  for (const url of FEED_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/calendar, text/plain, */*'
        },
        cache: 'no-store'
      })

      if (response.ok) {
        const text = await response.text()
        if (text.includes('BEGIN:VCALENDAR')) {
          icsText = text
          break
        }
      }
    } catch {
      // Try next URL
    }
  }

  let importedCount = 0
  let updatedCount = 0

  if (icsText) {
    try {
      const parsedData = ical.parseICS(icsText)

      for (const key in parsedData) {
        const event = parsedData[key]
        if (event.type !== 'VEVENT' || !event.summary || !event.start) continue

        const summary = event.summary as string
        const isAway =
          summary.toLowerCase().includes('v shrewsbury') ||
          summary.toLowerCase().includes('vs shrewsbury')

        if (!isAway) continue

        const opponent = summary
          .replace(/shrewsbury town/gi, '')
          .replace(/vs/gi, '')
          .replace(/v/gi, '')
          .replace(/fc/gi, '')
          .trim()

        // Exact UK time calculation (BST/GMT safe)
        const { ukDate: matchDate, ukTime: kickoffTime } = getUKDateTimeStrings(
          new Date(event.start as Date)
        )

        const venue = event.location || `${opponent} Stadium`
        const externalId =
          event.uid || `match_${opponent.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${matchDate}`

        const { data: existingFixture } = await supabase
          .from('fixtures')
          .select('id, match_date, kickoff_time, is_released')
          .eq('external_id', externalId)
          .single()

        if (existingFixture) {
          if (
            existingFixture.match_date !== matchDate ||
            existingFixture.kickoff_time !== kickoffTime
          ) {
            await supabase
              .from('fixtures')
              .update({ match_date: matchDate, kickoff_time: kickoffTime, venue })
              .eq('id', existingFixture.id)
            updatedCount++
          }
        } else {
          const matchHour = parseInt(kickoffTime.slice(0, 2), 10)
          const depHour = Math.max(7, matchHour - 4)
          const departureTime = `${String(depHour).padStart(2, '0')}:00:00`

          await supabase.from('fixtures').insert({
            external_id: externalId,
            opponent,
            venue,
            match_date: matchDate,
            kickoff_time: kickoffTime,
            departure_time: departureTime,
            pickup_location: 'Croud Meadow (Main Stand)',
            is_active: false,
            is_released: false
          })
          importedCount++
        }
      }
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed parsing iCal: ' + e.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    imported: importedCount,
    updated: updatedCount,
    message: `Sync complete! ${importedCount} fixtures imported, ${updatedCount} rescheduled times updated.`
  })
}
