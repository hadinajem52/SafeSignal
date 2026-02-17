import React from 'react'

function StatCard({ icon: Icon, label, value, change, color }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-soft p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">{label}</p>
          <p className="text-3xl font-bold text-text mt-2">{value}</p>
          {change ? <p className="text-sm text-success mt-2">↑ {change}% from last week</p> : null}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={32} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default StatCard
