import React from 'react'

function StatCard({ icon: Icon, label, value, change, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change ? <p className="text-sm text-green-600 mt-2">↑ {change}% from last week</p> : null}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={32} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default StatCard
