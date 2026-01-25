import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import { 
  Search, 
  Filter, 
  Ban, 
  RotateCcw,
  Shield,
  AlertTriangle
} from 'lucide-react'

function Users() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const params = roleFilter !== 'all' ? { role: roleFilter } : {}
      const result = await usersAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

  // Mock data for demonstration
  const mockUsers = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      status: 'active',
      totalReports: 12,
      verifiedReports: 10,
      rejectedReports: 2,
      joinedDate: '2023-06-15',
      isSuspended: false,
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      status: 'active',
      totalReports: 24,
      verifiedReports: 22,
      rejectedReports: 2,
      joinedDate: '2023-05-20',
      isSuspended: false,
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'user',
      status: 'suspended',
      totalReports: 5,
      verifiedReports: 2,
      rejectedReports: 3,
      joinedDate: '2023-07-10',
      isSuspended: true,
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      role: 'moderator',
      status: 'active',
      totalReports: 0,
      verifiedReports: 0,
      rejectedReports: 0,
      joinedDate: '2023-01-05',
      isSuspended: false,
    },
  ]

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getStatusColor = (status, isSuspended) => {
    if (isSuspended) return 'bg-red-100 text-red-800'
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-600 mt-2">Manage user accounts and permissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline mr-2" size={18} /> Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline mr-2" size={18} /> Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="user">Regular Users</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">User</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Role</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Reports</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Joined</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status, user.isSuspended)}`}>
                      {user.isSuspended ? 'SUSPENDED' : user.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.totalReports} total ({user.verifiedReports} verified)
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.joinedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No users found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h3>
                <p className="text-gray-600">{selectedUser.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800`}>
                    {selectedUser.role.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedUser.status, selectedUser.isSuspended)}`}>
                    {selectedUser.isSuspended ? 'SUSPENDED' : selectedUser.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedUser.totalReports}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{selectedUser.verifiedReports}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{selectedUser.rejectedReports}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-medium text-gray-900">{new Date(selectedUser.joinedDate).toLocaleString()}</p>
              </div>

              <div className="pt-6 border-t border-gray-200 flex gap-3">
                {selectedUser.isSuspended ? (
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <RotateCcw size={20} />
                    Unsuspend User
                  </button>
                ) : (
                  <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Ban size={20} />
                    Suspend User
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
