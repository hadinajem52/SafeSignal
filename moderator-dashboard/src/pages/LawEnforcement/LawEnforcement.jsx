import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Shield } from 'lucide-react'
import { io } from 'socket.io-client'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { leiAPI } from '../../services/api'
import AlertsPanel from './AlertsPanel'
import IncidentDetail from './IncidentDetail'
import IncidentTable from './IncidentTable'

const STATUS_TRANSITIONS = {
  verified: ['dispatched', 'investigating', 'police_closed'],
  dispatched: ['on_scene', 'investigating', 'police_closed'],
  on_scene: ['investigating', 'police_closed'],
  investigating: ['police_closed'],
  police_closed: [],
}

function LawEnforcement() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('verified')
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [closeOutcome, setCloseOutcome] = useState('resolved_handled')
  const [closeNotes, setCloseNotes] = useState('')
  const [caseId, setCaseId] = useState('')
  const [leiAlerts, setLeiAlerts] = useState([])

  const queryClient = useQueryClient()

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['lei-incidents', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const result = await leiAPI.getAll(params)
      return result.success ? result.data : []
    },
  })

  const { data: incidentDetail } = useQuery({
    queryKey: ['lei-incident', selectedIncidentId],
    queryFn: async () => {
      const result = await leiAPI.getById(selectedIncidentId)
      return result.success ? result.data : null
    },
    enabled: Boolean(selectedIncidentId),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }) => leiAPI.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
      queryClient.invalidateQueries({ queryKey: ['lei-incident', selectedIncidentId] })
    },
  })

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((incident) => {
        const matchesSearch =
          incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.description.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
      })
      .sort((a, b) => {
        const severityRank = { critical: 1, high: 2, medium: 3, low: 4 }
        const rankA = severityRank[a.severity] || 5
        const rankB = severityRank[b.severity] || 5
        if (rankA !== rankB) return rankA - rankB
        return new Date(b.incident_date || b.created_at) - new Date(a.incident_date || a.created_at)
      })
      .map((incident) => ({
        ...incident,
        id: incident.incident_id,
        createdAt: incident.incident_date || incident.created_at,
      }))
  }, [incidents, searchTerm])

  const selectedIncident = incidentDetail?.incident
  const actionLog = incidentDetail?.actions || []

  const canTransitionTo = (currentStatus, nextStatus) =>
    (STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)

  const handleStatusUpdate = (status) => {
    if (!selectedIncident) return
    statusMutation.mutate({
      id: selectedIncident.incident_id,
      payload: { status },
    })
  }

  const handleCloseCase = () => {
    if (!selectedIncident) return
    statusMutation.mutate({
      id: selectedIncident.incident_id,
      payload: {
        status: 'police_closed',
        closure_outcome: closeOutcome,
        closure_details: {
          case_id: caseId || null,
          officer_notes: closeNotes || null,
        },
      },
    })
  }

  useEffect(() => {
    if (user?.role !== 'law_enforcement' && user?.role !== 'admin') return

    const token = localStorage.getItem('moderator_token')
    if (!token) return

    const socket = io('http://localhost:3000', {
      auth: { token },
    })

    socket.on('lei_alert', (payload) => {
      setLeiAlerts((prev) => [payload, ...prev].slice(0, 5))
      queryClient.invalidateQueries({ queryKey: ['lei-incidents'] })
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient, user])

  if (user?.role !== 'law_enforcement' && user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-gray-600 mt-2">You do not have permission to view the Law Enforcement Interface.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="Law Enforcement Interface"
        description="Operational response and case resolution"
      />

      <AlertsPanel alerts={leiAlerts} />

      <IncidentTable
        searchTerm={searchTerm}
        onSearchTermChange={(event) => setSearchTerm(event.target.value)}
        statusFilter={statusFilter}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}
        isLoading={isLoading}
        incidents={filteredIncidents}
        onSelectIncident={setSelectedIncidentId}
      />

      <IncidentDetail
        incident={selectedIncident}
        actionLog={actionLog}
        userRole={user?.role}
        onClose={() => setSelectedIncidentId(null)}
        canTransitionTo={canTransitionTo}
        statusMutationPending={statusMutation.isPending}
        onStatusUpdate={handleStatusUpdate}
        closeOutcome={closeOutcome}
        onCloseOutcomeChange={(event) => setCloseOutcome(event.target.value)}
        caseId={caseId}
        onCaseIdChange={(event) => setCaseId(event.target.value)}
        closeNotes={closeNotes}
        onCloseNotesChange={(event) => setCloseNotes(event.target.value)}
        onCloseCase={handleCloseCase}
      />
    </div>
  )
}

export default LawEnforcement
