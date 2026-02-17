import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { 
  Search, 
  Filter, 
  Ban, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react'
import DataTable from '../components/DataTable'
import DetailPanel from '../components/DetailPanel'
import EmptyState from '../components/EmptyState'
import FilterDropdown from '../components/FilterDropdown'
import LoadingState from '../components/LoadingState'
import PageHeader from '../components/PageHeader'
import SearchInput from '../components/SearchInput'
import StatusBadge from '../components/StatusBadge'
import { getUserStatusColor, getUserStatusLabel } from '../utils/userStatus'

function Users() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const ensureSuccess = (result, fallbackMessage) => {
    if (result.success) return result.data
    throw new Error(result.error || fallbackMessage)
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('citizen')
  const [actionError, setActionError] = useState('')

  const { data: users = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const params = roleFilter !== 'all' ? { role: roleFilter } : {}
      const result = await usersAPI.getAll(params)
      return ensureSuccess(result, 'Failed to load users')
    },
  })

  const queryClient = useQueryClient()

  const suspendMutation = useMutation({
    mutationFn: async (id) => ensureSuccess(await usersAPI.suspend(id), 'Failed to suspend user'),
    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedUser(null)
    },
    onError: (mutationError) => {
      setActionError(mutationError.message || 'Failed to suspend user')
    },
  })

  const unsuspendMutation = useMutation({
    mutationFn: async (id) => ensureSuccess(await usersAPI.unsuspend(id), 'Failed to unsuspend user'),
    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedUser(null)
    },
    onError: (mutationError) => {
      setActionError(mutationError.message || 'Failed to unsuspend user')
    },
  })

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) => ensureSuccess(await usersAPI.updateRole(id, role), 'Failed to update role'),
    onSuccess: () => {
      setActionError('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSelectedUser(null)
    },
    onError: (mutationError) => {
      setActionError(mutationError.message || 'Failed to update role')
    },
  })

  useEffect(() => {
    if (selectedUser?.role) {
      setSelectedRole(selectedUser.role)
      setActionError('')
    }
  }, [selectedUser])

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'moderator':
        return 'bg-blue-100 text-blue-800'
      case 'law_enforcement':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-surface text-text'
    }
  }

  return (
    <div>
      {/* Header */}
      <PageHeader title="Users Management" description="Manage user accounts and permissions" />

      {isError ? (
        <div className="bg-card border border-border rounded-lg shadow-soft p-6 mb-6">
          <p className="text-danger mb-3">{error?.message || 'Failed to load users.'}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg shadow-soft p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <SearchInput
              label="Search Users"
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
            />
          </div>
          <FilterDropdown
            label={<><Filter className="inline mr-2" size={18} /> Filter by Role</>}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'citizen', label: 'Regular Users' },
              { value: 'moderator', label: 'Moderators' },
              { value: 'law_enforcement', label: 'Law Enforcement' },
              { value: 'admin', label: 'Administrators' },
            ]}
          />
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <DataTable headers={['User', 'Role', 'Status', 'Reports', 'Joined', 'Actions']}>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-surface">
                  <td className="px-6 py-4">
                    <div className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                      <p className="font-medium text-text">{user.name}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      className={getUserStatusColor(user.status, user.isSuspended)}
                      label={getUserStatusLabel(user.status, user.isSuspended)}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    {user.totalReports} total ({user.verifiedReports} verified)
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    {new Date(user.joinedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-primary hover:opacity-80 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          {filteredUsers.length === 0 && (
            <EmptyState icon={AlertTriangle} message="No users found matching your criteria" />
          )}
        </DataTable>
      )}

      {/* Detail Modal */}
      {selectedUser && (
        <DetailPanel
          visible={!!selectedUser}
          title="User Details"
          headerClassName="from-purple-600 to-purple-700"
          onClose={() => setSelectedUser(null)}
          maxWidthClass="max-w-2xl"
        >

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-text">{selectedUser.name}</h3>
                <p className="text-muted">{selectedUser.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-surface rounded-lg">
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role.toUpperCase()}
                  </span>
                </div>
                <div>
                  <StatusBadge
                    size="sm"
                    className={getUserStatusColor(selectedUser.status, selectedUser.isSuspended)}
                    label={getUserStatusLabel(selectedUser.status, selectedUser.isSuspended)}
                  />
                </div>
              </div>

              {isAdmin ? (
                <div className="p-4 bg-surface rounded-lg border border-border">
                  <p className="text-sm text-muted mb-2">Role Management</p>
                  <div className="flex gap-2">
                    <select
                      value={selectedRole}
                      onChange={(event) => setSelectedRole(event.target.value)}
                      className="flex-1 px-3 py-2 border border-border bg-card text-text rounded-lg"
                      disabled={roleMutation.isPending}
                    >
                      <option value="citizen">Citizen</option>
                      <option value="moderator">Moderator</option>
                      <option value="law_enforcement">Law Enforcement</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => roleMutation.mutate({ id: selectedUser.id, role: selectedRole })}
                      disabled={roleMutation.isPending || selectedRole === selectedUser.role}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {roleMutation.isPending ? 'Saving...' : 'Save Role'}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedUser.totalReports}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{selectedUser.verifiedReports}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{selectedUser.rejectedReports}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted">Member Since</p>
                <p className="font-medium text-text">{new Date(selectedUser.joinedDate).toLocaleString()}</p>
              </div>

              <div className="pt-6 border-t border-border flex gap-3">
                {isAdmin ? (
                  selectedUser.isSuspended ? (
                    <button 
                      onClick={() => unsuspendMutation.mutate(selectedUser.id)}
                      disabled={unsuspendMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RotateCcw size={20} />
                      {unsuspendMutation.isPending ? 'Unsuspending...' : 'Unsuspend User'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => suspendMutation.mutate(selectedUser.id)}
                      disabled={suspendMutation.isPending}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Ban size={20} />
                      {suspendMutation.isPending ? 'Suspending...' : 'Suspend User'}
                    </button>
                  )
                ) : (
                  <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Admin access required for suspension actions.
                  </div>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-surface hover:bg-bg border border-border text-text font-medium py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>

              {actionError ? (
                <p className="text-sm text-danger">{actionError}</p>
              ) : null}
            </div>
        </DetailPanel>
      )}
    </div>
  )
}

export default Users
