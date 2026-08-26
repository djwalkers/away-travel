'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface Ground {
  id: string
  club: string
  stadium: string
  league: 'Premier League' | 'Championship' | 'League One' | 'League Two'
  lat: number
  lng: number
}

// Full 92 Grounds Coordinates & Leagues
export const GROUNDS_92: Ground[] = [
  // Shrewsbury Town FC (HQ)
  { id: 'stfc', club: 'Shrewsbury Town', stadium: 'The Croud Meadow', league: 'League Two', lat: 52.6886, lng: -2.7492 },

  // League Two
  { id: 'accrington', club: 'Accrington Stanley', stadium: 'Wham Stadium', league: 'League Two', lat: 53.7651, lng: -2.3608 },
  { id: 'afc_wimbledon', club: 'AFC Wimbledon', stadium: 'Plough Lane', league: 'League Two', lat: 51.4312, lng: -0.1878 },
  { id: 'barrow', club: 'Barrow AFC', stadium: 'SO Legal Stadium', league: 'League Two', lat: 54.1227, lng: -3.2389 },
  { id: 'bradford', club: 'Bradford City', stadium: 'Valley Parade', league: 'League Two', lat: 53.8042, lng: -1.7594 },
  { id: 'bromley', club: 'Bromley', stadium: 'Hayes Lane', league: 'League Two', lat: 51.3878, lng: 0.0219 },
  { id: 'carlisle', club: 'Carlisle United', stadium: 'Brunton Park', league: 'League Two', lat: 54.8953, lng: -2.9139 },
  { id: 'cheltenham', club: 'Cheltenham Town', stadium: 'Completely-Suzuki Stadium', league: 'League Two', lat: 51.9064, lng: -2.0601 },
  { id: 'chesterfield', club: 'Chesterfield', stadium: 'SMH Group Stadium', league: 'League Two', lat: 53.2526, lng: -1.4272 },
  { id: 'colchester', club: 'Colchester United', stadium: 'JobServe Community Stadium', league: 'League Two', lat: 51.9234, lng: 0.8974 },
  { id: 'crewe', club: 'Crewe Alexandra', stadium: 'Mornflake Stadium', league: 'League Two', lat: 53.0874, lng: -2.4357 },
  { id: 'doncaster', club: 'Doncaster Rovers', stadium: 'Eco-Power Stadium', league: 'League Two', lat: 53.5098, lng: -1.1139 },
  { id: 'fleetwood', club: 'Fleetwood Town', stadium: 'Highbury Stadium', league: 'League Two', lat: 53.9168, lng: -3.0249 },
  { id: 'gillingham', club: 'Gillingham', stadium: 'Priestfield Stadium', league: 'League Two', lat: 51.3843, lng: 0.5606 },
  { id: 'grimsby', club: 'Grimsby Town', stadium: 'Blundell Park', league: 'League Two', lat: 53.5702, lng: -0.0464 },
  { id: 'harrogate', club: 'Harrogate Town', stadium: 'Exercise Stadium', league: 'League Two', lat: 53.9877, lng: -1.5204 },
  { id: 'milton_keynes', club: 'MK Dons', stadium: 'Stadium MK', league: 'League Two', lat: 52.0094, lng: -0.7336 },
  { id: 'morecambe', club: 'Morecambe', stadium: 'Mazuma Mobile Stadium', league: 'League Two', lat: 54.0628, lng: -2.8583 },
  { id: 'newport', club: 'Newport County', stadium: 'Rodney Parade', league: 'League Two', lat: 51.5888, lng: -2.9879 },
  { id: 'notts_county', club: 'Notts County', stadium: 'Meadow Lane', league: 'League Two', lat: 52.9426, lng: -1.1372 },
  { id: 'port_vale', club: 'Port Vale', stadium: 'Vale Park', league: 'League Two', lat: 53.0498, lng: -2.1925 },
  { id: 'salford', club: 'Salford City', stadium: 'Peninsula Stadium', league: 'League Two', lat: 53.5133, lng: -2.2778 },
  { id: 'swindon', club: 'Swindon Town', stadium: 'County Ground', league: 'League Two', lat: 51.5646, lng: -1.7708 },
  { id: 'tranmere', club: 'Tranmere Rovers', stadium: 'Prenton Park', league: 'League Two', lat: 53.3736, lng: -3.0325 },
  { id: 'walsall', club: 'Walsall', stadium: 'Poundland Bescot Stadium', league: 'League Two', lat: 52.5654, lng: -1.9906 },

  // League One
  { id: 'barnsley', club: 'Barnsley', stadium: 'Oakwell', league: 'League One', lat: 53.5522, lng: -1.4678 },
  { id: 'birmingham', club: 'Birmingham City', stadium: 'St Andrew\'s', league: 'League One', lat: 52.4757, lng: -1.8682 },
  { id: 'blackpool', club: 'Blackpool', stadium: 'Bloomfield Road', league: 'League One', lat: 53.8047, lng: -3.0483 },
  { id: 'bolton', club: 'Bolton Wanderers', stadium: 'Toughsheet Community Stadium', league: 'League One', lat: 53.5805, lng: -2.5356 },
  { id: 'bristol_rovers', club: 'Bristol Rovers', stadium: 'Memorial Stadium', league: 'League One', lat: 51.4862, lng: -2.5831 },
  { id: 'burton', club: 'Burton Albion', stadium: 'Pirelli Stadium', league: 'League One', lat: 52.8219, lng: -1.6322 },
  { id: 'cambridge', club: 'Cambridge United', stadium: 'Abbey Stadium', league: 'League One', lat: 52.2127, lng: 0.1542 },
  { id: 'charlton', club: 'Charlton Athletic', stadium: 'The Valley', league: 'League One', lat: 51.4865, lng: 0.0368 },
  { id: 'crawley', club: 'Crawley Town', stadium: 'Broadfield Stadium', league: 'League One', lat: 51.1008, lng: -0.1953 },
  { id: 'exeter', club: 'Exeter City', stadium: 'St James Park', league: 'League One', lat: 50.7308, lng: -3.5212 },
  { id: 'huddersfield', club: 'Huddersfield Town', stadium: 'John Smith\'s Stadium', league: 'League One', lat: 53.6543, lng: -1.7683 },
  { id: 'leyton_orient', club: 'Leyton Orient', stadium: 'Gaughan Group Stadium', league: 'League One', lat: 51.5601, lng: -0.0126 },
  { id: 'lincoln', club: 'Lincoln City', stadium: 'LNER Stadium', league: 'League One', lat: 53.2163, lng: -0.5408 },
  { id: 'mansfield', club: 'Mansfield Town', stadium: 'One Call Stadium', league: 'League One', lat: 53.1394, lng: -1.2003 },
  { id: 'northampton', club: 'Northampton Town', stadium: 'Sixfields Stadium', league: 'League One', lat: 52.2351, lng: -0.9341 },
  { id: 'peterborough', club: 'Peterborough United', stadium: 'Weston Homes Stadium', league: 'League One', lat: 52.5647, lng: -0.2403 },
  { id: 'reading', club: 'Reading', stadium: 'Select Car Leasing Stadium', league: 'League One', lat: 51.4222, lng: -0.9828 },
  { id: 'rotherham', club: 'Rotherham United', stadium: 'AESSEAL New York Stadium', league: 'League One', lat: 53.4279, lng: -1.3621 },
  { id: 'stevenage', club: 'Stevenage', stadium: 'Lamex Stadium', league: 'League One', lat: 51.8898, lng: -0.1934 },
  { id: 'stockport', club: 'Stockport County', stadium: 'Edgeley Park', league: 'League One', lat: 53.3994, lng: -2.1664 },
  { id: 'wigan', club: 'Wigan Athletic', stadium: 'Brick Community Stadium', league: 'League One', lat: 53.5477, lng: -2.6541 },
  { id: 'wrexham', club: 'Wrexham AFC', stadium: 'STōK Cae Ras', league: 'League One', lat: 53.0516, lng: -3.0033 },
  { id: 'wycombe', club: 'Wycombe Wanderers', stadium: 'Adams Park', league: 'League One', lat: 51.6306, lng: -0.8003 },

  // Championship Sample
  { id: 'leeds', club: 'Leeds United', stadium: 'Elland Road', league: 'Championship', lat: 53.7778, lng: -1.5722 },
  { id: 'sheff_wed', club: 'Sheffield Wednesday', stadium: 'Hillsborough', league: 'Championship', lat: 53.4114, lng: -1.5006 },
  { id: 'sheff_utd', club: 'Sheffield United', stadium: 'Bramall Lane', league: 'Championship', lat: 53.3703, lng: -1.4709 },
  { id: 'sunderland', club: 'Sunderland', stadium: 'Stadium of Light', league: 'Championship', lat: 54.9144, lng: -1.3884 },
  { id: 'derby', club: 'Derby County', stadium: 'Pride Park Stadium', league: 'Championship', lat: 52.9149, lng: -1.4472 },
  { id: 'west_brom', club: 'West Bromwich Albion', stadium: 'The Hawthorns', league: 'Championship', lat: 52.5091, lng: -1.9639 },
  { id: 'stoke', club: 'Stoke City', stadium: 'bet365 Stadium', league: 'Championship', lat: 52.9883, lng: -2.1756 },

  // Premier League Sample
  { id: 'arsenal', club: 'Arsenal', stadium: 'Emirates Stadium', league: 'Premier League', lat: 51.5549, lng: -0.1084 },
  { id: 'aston_villa', club: 'Aston Villa', stadium: 'Villa Park', league: 'Premier League', lat: 52.5091, lng: -1.8848 },
  { id: 'chelsea', club: 'Chelsea', stadium: 'Stamford Bridge', league: 'Premier League', lat: 51.4817, lng: -0.1910 },
  { id: 'liverpool', club: 'Liverpool', stadium: 'Anfield', league: 'Premier League', lat: 53.4308, lng: -2.9608 },
  { id: 'man_city', club: 'Manchester City', stadium: 'Etihad Stadium', league: 'Premier League', lat: 53.4831, lng: -2.2004 },
  { id: 'man_utd', club: 'Manchester United', stadium: 'Old Trafford', league: 'Premier League', lat: 53.4631, lng: -2.2913 },
  { id: 'newcastle', club: 'Newcastle United', stadium: 'St James\' Park', league: 'Premier League', lat: 54.9756, lng: -1.6217 },
  { id: 'spurs', club: 'Tottenham Hotspur', stadium: 'Tottenham Hotspur Stadium', league: 'Premier League', lat: 51.6043, lng: -0.0664 },
  { id: 'wolves', club: 'Wolverhampton Wanderers', stadium: 'Molineux Stadium', league: 'Premier League', lat: 52.5902, lng: -2.1304 }
]

interface StadiumMapProps {
  filterMode: 'all' | 'league' | 'visited'
  visitedClubs: string[]
  bookedClubs: string[]
}

export default function StadiumMap({ filterMode, visitedClubs, bookedClubs }: StadiumMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      // Center map on the UK (around Shrewsbury / Midlands)
      const map = L.map(mapContainerRef.current, {
        center: [52.85, -2.0],
        zoom: 6.8,
        minZoom: 5.5,
        maxZoom: 14,
        zoomControl: true,
      })

      // Dark OpenStreetMap CartoDB Tiles (100% Free / Zero API Keys)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      markersLayerRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Re-draw pins whenever filterMode, visitedClubs, or bookedClubs change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return

    markersLayerRef.current.clearLayers()

    const normalizedVisited = visitedClubs.map((c) => c.toLowerCase().trim())
    const normalizedBooked = bookedClubs.map((c) => c.toLowerCase().trim())

    // Filter grounds based on selected mode
    const displayedGrounds = GROUNDS_92.filter((g) => {
      const gName = g.club.toLowerCase().trim()
      const isVisited = normalizedVisited.some((v) => v.includes(gName) || gName.includes(v))
      const isBooked = normalizedBooked.some((b) => b.includes(gName) || gName.includes(b))

      if (filterMode === 'visited') {
        return isVisited || isBooked || g.id === 'stfc'
      }
      if (filterMode === 'league') {
        return g.league === 'League Two' || g.id === 'stfc'
      }
      return true // 'all' 92 grounds
    })

    displayedGrounds.forEach((ground) => {
      const gName = ground.club.toLowerCase().trim()
      const isHQ = ground.id === 'stfc'
      const isVisited = normalizedVisited.some((v) => v.includes(gName) || gName.includes(v))
      const isBooked = normalizedBooked.some((b) => b.includes(gName) || gName.includes(b))

      let markerColor = '#475569' // Default unvisited (Slate)
      let statusLabel = 'Not Visited Yet'
      let statusBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700'

      if (isHQ) {
        markerColor = '#0057b8' // Salop Blue
        statusLabel = 'Home (The Croud Meadow)'
        statusBadgeClass = 'bg-[#0057b8]/20 text-[#1e6fe0] border-[#0057b8]/40'
      } else if (isVisited) {
        markerColor = '#10b981' // Visited (Emerald)
        statusLabel = 'Ground Visited'
        statusBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      } else if (isBooked) {
        markerColor = '#ffc72c' // Booked Upcoming (Amber)
        statusLabel = 'Booked / Upcoming'
        statusBadgeClass = 'bg-[#ffc72c]/20 text-[#ffc72c] border-[#ffc72c]/40'
      }

      // Create Custom Rounded Marker
      const customIcon = L.divIcon({
        className: 'custom-ground-pin',
        html: `
          <div style="
            background-color: ${markerColor};
            width: ${isHQ ? '20px' : '14px'};
            height: ${isHQ ? '20px' : '14px'};
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px ${markerColor}99;
            cursor: pointer;
          "></div>
        `,
        iconSize: [isHQ ? 20 : 14, isHQ ? 20 : 14],
        iconAnchor: [isHQ ? 10 : 7, isHQ ? 10 : 7],
      })

      const marker = L.marker([ground.lat, ground.lng], { icon: customIcon })

      // Custom Dark Popup
      const popupHtml = `
        <div style="
          background-color: #0a1220;
          color: #f8fafc;
          padding: 10px;
          border-radius: 12px;
          font-family: sans-serif;
          min-width: 170px;
          border: 1px solid #1a2742;
        ">
          <span style="
            display: inline-block;
            padding: 2px 6px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            border-radius: 9999px;
            margin-bottom: 4px;
            border: 1px solid;
          " class="${statusBadgeClass}">
            ${statusLabel}
          </span>
          <h4 style="margin: 0; font-size: 14px; font-weight: 900; color: #ffffff;">${ground.club}</h4>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">${ground.stadium}</p>
          <span style="display: block; font-size: 10px; color: #ffc72c; margin-top: 6px; font-weight: 700;">
            ${ground.league}
          </span>
        </div>
      `

      marker.bindPopup(popupHtml, {
        className: 'dark-stadium-popup',
        closeButton: false,
      })

      marker.addTo(markersLayerRef.current!)
    })
  }, [filterMode, visitedClubs, bookedClubs])

  return (
    <div className="relative w-full h-[420px] md:h-[480px] rounded-2xl overflow-hidden border border-[#1a2742] bg-[#070b14] shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}
