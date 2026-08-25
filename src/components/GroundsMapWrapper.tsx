'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type { Stadium } from '@/lib/data/grounds92'

const GroundsMap = dynamic(() => import('@/components/GroundsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 animate-pulse">
      Loading interactive stadium map...
    </div>
  ),
})

interface Props {
  stadiums: Stadium[]
  visitedOpponents: string[]
}

export default function GroundsMapWrapper({ stadiums, visitedOpponents }: Props) {
  return <GroundsMap stadiums={stadiums} visitedOpponents={visitedOpponents} />
}
