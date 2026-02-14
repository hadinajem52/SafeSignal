import React from 'react'

function DataTable({ headers, children }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-6 py-3 text-left text-sm font-bold text-gray-900">
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
