import React from 'react'

function SystemInfoSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">System Information</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Dashboard Version</p>
          <p className="font-bold text-gray-900">1.0.0</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">API Version</p>
          <p className="font-bold text-gray-900">1.0.0</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Last Updated</p>
          <p className="font-bold text-gray-900">Jan 25, 2024</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Status</p>
          <p className="font-bold text-green-600">Operational</p>
        </div>
      </div>
    </div>
  )
}

export default SystemInfoSection
