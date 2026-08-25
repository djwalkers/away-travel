export interface Stadium {
  id: string
  club: string
  stadium: string
  league: 'Premier League' | 'Championship' | 'League One' | 'League Two'
  lat: number
  lng: number
  capacity: number
}

// Home Base Coordinates (Croud Meadow / Shrewsbury: 52.6886, -2.7483)
export const HOME_STADIUM = {
  name: 'Croud Meadow (Home)',
  lat: 52.6886,
  lng: -2.7483,
}

// Haversine formula + road multiplier for UK road miles
export function calculateRoundTripMiles(destLat: number, destLng: number): number {
  const R = 3958.8 // Radius of the Earth in miles
  const dLat = (destLat - HOME_STADIUM.lat) * (Math.PI / 180)
  const dLng = (destLng - HOME_STADIUM.lng) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(HOME_STADIUM.lat * (Math.PI / 180)) *
      Math.cos(destLat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const oneWayRoadMiles = R * c * 1.22 // ~1.22x road routing coefficient
  return Math.round(oneWayRoadMiles * 2) // Round trip
}

export const STADIUMS_92: Stadium[] = [
  // Sample Selection of Grounds across all 4 tiers
  { id: 'wrexham', club: 'Wrexham AFC', stadium: 'STōK Cae Ras', league: 'Championship', lat: 53.0516, lng: -3.0039, capacity: 12600 },
  { id: 'stockport', club: 'Stockport County', stadium: 'Edgeley Park', league: 'League One', lat: 53.3995, lng: -2.1664, capacity: 10852 },
  { id: 'birmingham', club: 'Birmingham City', stadium: "St Andrew's", league: 'Championship', lat: 52.4756, lng: -1.8682, capacity: 29409 },
  { id: 'wolverhampton', club: 'Wolverhampton Wanderers', stadium: 'Molineux', league: 'Premier League', lat: 52.5902, lng: -2.1304, capacity: 31750 },
  { id: 'aston-villa', club: 'Aston Villa', stadium: 'Villa Park', league: 'Premier League', lat: 52.5091, lng: -1.8848, capacity: 42682 },
  { id: 'stoke', club: 'Stoke City', stadium: 'bet365 Stadium', league: 'Championship', lat: 52.9884, lng: -2.1755, capacity: 30089 },
  { id: 'crewe', club: 'Crewe Alexandra', stadium: 'Mornflake Stadium', league: 'League Two', lat: 53.0874, lng: -2.4357, capacity: 10153 },
  { id: 'walsall', club: 'Walsall', stadium: 'Poundland Bescot Stadium', league: 'League Two', lat: 52.5654, lng: -1.9906, capacity: 11300 },
  { id: 'port-vale', club: 'Port Vale', stadium: 'Vale Park', league: 'League Two', lat: 53.0498, lng: -2.1925, capacity: 15695 },
  { id: 'arsenal', club: 'Arsenal', stadium: 'Emirates Stadium', league: 'Premier League', lat: 51.5549, lng: -0.1084, capacity: 60704 },
  { id: 'man-utd', club: 'Manchester United', stadium: 'Old Trafford', league: 'Premier League', lat: 53.4631, lng: -2.2913, capacity: 74310 },
  { id: 'liverpool', club: 'Liverpool', stadium: 'Anfield', league: 'Premier League', lat: 53.4308, lng: -2.9608, capacity: 61276 },
  { id: 'newcastle', club: 'Newcastle United', stadium: "St James' Park", league: 'Premier League', lat: 54.9755, lng: -1.6216, capacity: 52305 },
  { id: 'bristol-rovers', club: 'Bristol Rovers', stadium: 'Memorial Stadium', league: 'League One', lat: 51.4863, lng: -2.5831, capacity: 11000 },
  { id: 'reading', club: 'Reading', stadium: 'Select Car Leasing Stadium', league: 'League One', lat: 51.4222, lng: -0.9828, capacity: 24161 },
  { id: 'carlisle', club: 'Carlisle United', stadium: 'Brunton Park', league: 'League Two', lat: 54.8953, lng: -2.9141, capacity: 17949 },
  { id: 'plymouth', club: 'Plymouth Argyle', stadium: 'Home Park', league: 'Championship', lat: 50.3881, lng: -4.1508, capacity: 17900 },
  { id: 'norwich', club: 'Norwich City', stadium: 'Carrow Road', league: 'Championship', lat: 52.6221, lng: 1.3086, capacity: 27244 },
  { id: 'blackpool', club: 'Blackpool', stadium: 'Bloomfield Road', league: 'League One', lat: 53.8047, lng: -3.0483, capacity: 16616 },
  { id: 'exeter', club: 'Exeter City', stadium: 'St James Park', league: 'League One', lat: 50.7308, lng: -3.5211, capacity: 8720 }
]
