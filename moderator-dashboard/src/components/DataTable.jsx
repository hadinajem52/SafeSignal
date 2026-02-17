import React from 'react'

function DataTable({ headers, children }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface border-b border-border">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-6 py-3 text-left text-sm font-bold text-text">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  )
}

export default DataTable
