'use client'

import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'
import { Stadium, HOME_STADIUM, calculateRoundTripMiles } from '@/lib/data/grounds92'

interface Props {
  stadiums: Stadium[]
  visitedOpponents: string[]
}

const visitedIcon = new L.DivIcon({
  className: 'custom-pin',
  html: `<div style="background-color: #FFC72C; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #FFC72C;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
})

const unvisitedIcon = new L.DivIcon({
  className: 'custom-pin',
  html: `<div style="background-color: #334155; width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #64748b;"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
})

const homeIcon = new L.DivIcon({
  className: 'custom-pin',
  html: `<div style="background-color: #0057B8; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #FFC72C; box-shadow: 0 0 14px #0057B8;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

export default function GroundsMap({ stadiums, visitedOpponents }: Props) {
  const isVisited = (club: string) =>
    visitedOpponents.some((v) => club.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(club.toLowerCase()))

  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl z-0">
      <MapContainer
        center={[52.8, -1.8]}
        zoom={6.5}
        scrollWheelZoom={false}
        className="h-full w-full bg-slate-950"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Croud Meadow Home Marker */}
        <Marker position={[HOME_STADIUM.lat, HOME_STADIUM.lng]} icon={homeIcon}>
          <Popup className="custom-popup">
            <div className="text-slate-900 font-bold">{HOME_STADIUM.name}</div>
            <div className="text-xs text-slate-600">Travel Club Departure HQ (Shrewsbury)</div>
          </Popup>
        </Marker>

        {/* 92 Stadium Markers */}
        {stadiums.map((stadium) => {
          const visited = isVisited(stadium.club)
          const roundTrip = calculateRoundTripMiles(stadium.lat, stadium.lng)

          return (
            <React.Fragment key={stadium.id}>
              <Marker
                position={[stadium.lat, stadium.lng]}
                icon={visited ? visitedIcon : unvisitedIcon}
              >
                <Popup className="custom-popup">
                  <div className="text-slate-900">
                    <strong className="block text-sm">{stadium.club}</strong>
                    <div className="text-xs text-slate-600">{stadium.stadium} • {stadium.league}</div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-xs">
                      Status: <strong className={visited ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                        {visited ? '✓ Ground Ticked Off' : 'Not Visited Yet'}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Round-trip from Meadow: ~{roundTrip} miles
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Draw Route Line for Visited Grounds in Salop Amber */}
              {visited && (
                <Polyline
                  positions={[
                    [HOME_STADIUM.lat, HOME_STADIUM.lng],
                    [stadium.lat, stadium.lng]
                  ]}
                  pathOptions={{ color: '#FFC72C', weight: 2, opacity: 0.6, dashArray: '4, 4' }}
                />
              )}
            </React.Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}
