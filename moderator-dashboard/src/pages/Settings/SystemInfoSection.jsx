import React from 'react'

function SystemInfoSection() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-soft p-6">
      <h2 className="text-xl font-bold text-text mb-4">System Information</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">Dashboard Version</p>
          <p className="font-bold text-text">1.0.0</p>
        </div>
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">API Version</p>
          <p className="font-bold text-text">1.0.0</p>
        </div>
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">Last Updated</p>
          <p className="font-bold text-text">Jan 25, 2024</p>
        </div>
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">Status</p>
          <p className="font-bold text-success">Operational</p>
        </div>
      </div>
    </div>
  )
}

export default SystemInfoSection
