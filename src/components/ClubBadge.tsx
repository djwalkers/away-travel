'use client'

import React from 'react'

export default function ClubBadge({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Shrewsbury Town FC Crest"
    >
      <path
        d="M50 5 L92 18 V62 C92 90 50 114 50 114 C50 114 8 90 8 62 V18 L50 5 Z"
        fill="#0057B8"
        stroke="#FFC72C"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M50 12 L86 23 V60 C86 84 50 106 50 106 C50 106 14 84 14 60 V23 L50 12 Z"
        fill="#070B14"
        stroke="#FFC72C"
        strokeWidth="2"
      />
      <path
        d="M16 24 L50 14 L84 24 V38 H16 V24 Z"
        fill="#FFC72C"
      />
      <text
        x="50"
        y="32"
        textAnchor="middle"
        fill="#070B14"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="10"
        letterSpacing="2"
      >
        SALOP
      </text>
      <g transform="translate(25, 42) scale(0.5)" fill="#FFC72C">
        <circle cx="28" cy="22" r="14" fill="#FFC72C" />
        <circle cx="23" cy="18" r="2.5" fill="#070B14" />
        <circle cx="33" cy="18" r="2.5" fill="#070B14" />
        <path d="M25 24 Q28 28 31 24" stroke="#070B14" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        <circle cx="72" cy="22" r="14" fill="#FFC72C" />
        <circle cx="67" cy="18" r="2.5" fill="#070B14" />
        <circle cx="77" cy="18" r="2.5" fill="#070B14" />
        <path d="M69 24 Q72 28 75 24" stroke="#070B14" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        <circle cx="50" cy="58" r="16" fill="#FFC72C" />
        <circle cx="44" cy="54" r="3" fill="#070B14" />
        <circle cx="56" cy="54" r="3" fill="#070B14" />
        <path d="M46 62 Q50 68 54 62" stroke="#070B14" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <text
        x="50"
        y="98"
        textAnchor="middle"
        fill="#FFC72C"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize="10"
        letterSpacing="1"
      >
        1886
      </text>
    </svg>
  )
}
