import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI, statsAPI, leiAPI, adminAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import QuickActionCard from './components/QuickActionCard'
import { ModeratorLeft, ModeratorCenter, ModeratorRight } from './sections/ModeratorDashboard'
import { LeiLeft, LeiCenter, LeiRight } from './sections/LeiDashboard'
import { AdminLeft, AdminCenter, AdminRight } from './sections/AdminDashboard'
import ROLE_CONFIG from './roleConfig'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

const EMPTY_STATS = {
  totalIncidents: 0,
  pendingReports: 0,
  verifiedReports: 0,
  rejectedReports: 0,
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  recentIncidents: [],
}

export default function DataAnalysisCenter() {
  const { user } = useAuth()
  const role = user?.role || 'moderator'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.moderator
  const isLei = role === 'law_enforcement'
  const isAdmin = role === 'admin'
  const ConfigIcon = config.icon

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const result = await statsAPI.getDashboardStats()
      if (result.success) return result.data
      throw new Error(result.error || 'Failed to fetch stats')
    },
    retry: 1,
    refetchInterval: 10000,
  })

  const { data: incidents = [], error: incidentsError } = useQuery({
    queryKey: ['data-analysis-center-incidents'],
    queryFn: async () => {
      const result = await reportsAPI.getAll({ limit: 150 })
      if (!result.success) throw new Error(result.error || 'Failed to fetch incidents')
      return result.data || []
    },
    enabled: !isLei,
    refetchInterval: 10000,
  })

  const { data: leiIncidents = [], isLoading: leiLoading, error: leiError } = useQuery({
    queryKey: ['data-analysis-center-lei-incidents'],
    queryFn: async () => {
      const result = await leiAPI.getAll({})
      if (!result.success) throw new Error(result.error || 'Failed to fetch LEI incidents')
      return result.data || []
    },
    enabled: isLei || isAdmin,
    refetchInterval: 10000,
  })

  const { data: applications = [], error: adminError } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const result = await adminAPI.getPendingApplications()
      if (!result.success) throw new Error(result.error || 'Failed to fetch applications')
      return result.data || []
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (statsError) toast.error('Error loading dashboard stats')
    if (incidentsError) toast.error('Error loading incidents')
    if (leiError) toast.error('Error loading active cases')
    if (adminError) toast.error('Error loading admin data')
  }, [statsError, incidentsError, leiError, adminError])

  const s = stats || EMPTY_STATS
  const loading = statsLoading || (isLei && leiLoading)

  return (
    <div className="pb-8">

      {/* Page header */}
      <div className="mb-5 flex items-start gap-3">
        <div className={`mt-0.5 p-2 rounded-lg ${config.iconBg} ${config.iconColor}`}>
          <ConfigIcon size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text leading-tight">{config.title}</h1>
          <p className="text-sm text-muted mt-0.5">{config.subtitle}</p>
        </div>
        <span className="ml-auto self-start px-2.5 py-1 rounded-full text-[10px] font-bold border border-border text-muted uppercase tracking-widest flex-shrink-0">
          {role.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Quick action strip */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
        {config.actions.map((action) => (
          <QuickActionCard key={action.label} {...action} />
        ))}
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-12 gap-4">

        <div className="col-span-12 xl:col-span-5 space-y-4">
          {isLei
            ? <LeiLeft leiIncidents={leiIncidents} loading={loading} />
            : isAdmin
              ? <AdminLeft s={s} incidents={incidents} applications={applications} loading={loading} />
              : <ModeratorLeft s={s} incidents={incidents} loading={loading} />}
        </div>

        <div className="col-span-12 xl:col-span-4 space-y-4">
          {isLei
            ? <LeiCenter leiIncidents={leiIncidents} loading={loading} />
            : isAdmin
              ? <AdminCenter s={s} incidents={incidents} applications={applications} loading={loading} />
              : <ModeratorCenter s={s} incidents={incidents} loading={loading} />}
        </div>

        <div className="col-span-12 xl:col-span-3 space-y-4">
          {isLei
            ? <LeiRight leiIncidents={leiIncidents} loading={loading} />
            : isAdmin
              ? <AdminRight s={s} applications={applications} loading={loading} />
              : <ModeratorRight s={s} loading={loading} />}
        </div>

      </div>
    </div>
  )
}
