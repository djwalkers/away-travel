import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ical from 'ical'

export const dynamic = 'force-dynamic'

// Shrewsbury Town FC Official / BBC ECAL Fixture iCal stream
const STFC_ICAL_URL = 'https://ics.fixtur.es/v2/league-two/shrewsbury-town.ics'

export async function GET(request: Request) {
  const supabase = await createClient()

  try {
    const response = await fetch(STFC_ICAL_URL, { next: { revalidate: 3600 } })
    if (!response.ok) {
      // Fallback sample parsing if remote feed is unreachable
      return NextResponse.json({ message: 'Could not fetch remote ical feed' }, { status: 502 })
    }

    const icsText = await response.text()
    const parsedData = ical.parseICS(icsText)

    let importedCount = 0
    let updatedCount = 0

    for (const key in parsedData) {
      const event = parsedData[key]
      if (event.type !== 'VEVENT' || !event.summary) continue

      const summary = event.summary as string
      // Only process Away matches (e.g., "Opponent vs Shrewsbury Town" or summary containing "v Shrewsbury Town")
      const isAway = summary.toLowerCase().includes('v shrewsbury') || summary.toLowerCase().includes('vs shrewsbury')

      if (!isAway) continue

      const opponent = summary
        .replace(/shrewsbury town/gi, '')
        .replace(/vs/gi, '')
        .replace(/v/gi, '')
        .replace(/fc/gi, '')
        .trim()

      const matchDate = new Date(event.start as Date).toISOString().split('T')[0]
      const kickoffTime = new Date(event.start as Date).toTimeString().slice(0, 8)
      const venue = event.location || `${opponent} Stadium`
      const externalId = event.uid || `match_${opponent.toLowerCase().replace(/\s+/g, '_')}_${matchDate}`

      // Check if fixture already exists
      const { data: existingFixture } = await supabase
        .from('fixtures')
        .select('id, match_date, kickoff_time, is_released')
        .eq('external_id', externalId)
        .single()

      if (existingFixture) {
        // If match date or kickoff moved (e.g. moved for Sky Sports broadcast), update it automatically
        if (existingFixture.match_date !== matchDate || existingFixture.kickoff_time !== kickoffTime) {
          await supabase
            .from('fixtures')
            .update({ match_date: matchDate, kickoff_time: kickoffTime, venue })
            .eq('id', existingFixture.id)
          updatedCount++
        }
      } else {
        // Calculate standard 4-hour pre-KO departure as default
        const matchHour = parseInt(kickoffTime.slice(0, 2), 10)
        const depHour = Math.max(7, matchHour - 4)
        const departureTime = `${String(depHour).padStart(2, '0')}:00:00`

        // Insert as Unreleased Draft
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

    return NextResponse.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      message: `Sync complete. ${importedCount} new away fixtures imported, ${updatedCount} rescheduled kickoff dates updated.`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
