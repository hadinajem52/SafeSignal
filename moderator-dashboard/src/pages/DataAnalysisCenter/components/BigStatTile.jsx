import React from 'react'
import { SkeletonLoader } from './UIStates'

export default function BigStatTile({ label, value, icon: Icon, iconColor, loading }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className={iconColor} />
        <span className="text-[10px] text-muted font-semibold uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <SkeletonLoader className="h-9 w-16" />
      ) : (
        <p className="text-3xl font-bold font-display text-text leading-none">
          {value}
        </p>
      )}
    </div>
  )
}
