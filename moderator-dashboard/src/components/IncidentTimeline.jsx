import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Lock, Send, Loader2 } from 'lucide-react'
import { timelineAPI } from '../services/api'
import { SOCKET_URL } from '../utils/network'
import io from 'socket.io-client'

const IncidentTimeline = ({ incidentId }) => {
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(true) // Default to internal for staff
  const [error, setError] = useState(null)
  const timelineEndRef = useRef(null)
  const socketRef = useRef(null)

  const loadTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await timelineAPI.getTimeline(incidentId)

    if (result.success) {
      setTimeline(result.data)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [incidentId])

  const setupSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('moderator_token')
      if (!token) return

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      })

      socket.on('connect', () => {
        console.log('Socket connected for incident timeline')
        socket.emit('join_incident', { incidentId })
      })

      socket.on('comment:new', (comment) => {
        setTimeline((prev) =>
          [...prev, comment].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        )
      })

      socket.on('joined_incident', () => {
        console.log('Joined incident room:', incidentId)
      })

      socket.on('error', (err) => {
        console.error('Socket error:', err)
      })

      socketRef.current = socket
    } catch (err) {
      console.error('Failed to setup socket:', err)
    }
  }, [incidentId])

  const scrollToBottom = useCallback(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    loadTimeline()
    setupSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_incident', { incidentId })
        socketRef.current.disconnect()
      }
    }
  }, [incidentId, loadTimeline, setupSocket])

  useEffect(() => {
    scrollToBottom()
  }, [timeline, scrollToBottom])

  const handleSend = async () => {
    if (!message.trim() || sending) return

    setSending(true)
    const messageText = message.trim()
    setMessage('')

    const result = await timelineAPI.postComment(incidentId, messageText, isInternal)

    if (!result.success) {
      setError(result.error)
      setMessage(messageText) // Restore message on error
    }

    setSending(false)
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  const getSystemMessage = (item) => {
    switch (item.action_type) {
      case 'status_changed':
        return `Status changed ${item.notes ? `- ${item.notes}` : ''}`
      case 'verified':
        return 'Report verified by moderator'
      case 'rejected':
        return `Report rejected ${item.notes ? `- ${item.notes}` : ''}`
      case 'needs_info':
        return 'Additional information requested'
      default:
        return `Action: ${item.action_type}`
    }
  }

  const renderTimelineItem = (item, index) => {
    const isSystemMessage = item.item_type === 'system'
    const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(item.role)

    if (isSystemMessage) {
      return (
        <div key={index} className="flex justify-center my-4">
          <div className="bg-surface px-4 py-2 rounded-full border border-border">
            <p className="text-xs text-muted italic">{getSystemMessage(item)}</p>
            <p className="text-xs text-muted text-center mt-1">{formatTime(item.created_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={index} className="mb-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isStaff ? 'bg-blue-500 text-white' : 'bg-border text-text'
            }`}
          >
            {item.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-text">{item.username}</span>
              {isStaff && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Staff</span>
              )}
              {item.is_internal && (
                <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  <Lock size={12} />
                  <span>Internal</span>
                </div>
              )}
              <span className="text-xs text-muted">{formatTime(item.created_at)}</span>
            </div>
            <div
              className={`rounded-lg p-3 ${
                item.is_internal
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-card border border-border'
              }`}
            >
              <p className="text-sm text-text whitespace-pre-wrap">{item.content}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadTimeline}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 bg-surface">
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {timeline.map((item, index) => renderTimelineItem(item, index))}
            <div ref={timelineEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-border bg-card p-4">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setIsInternal(false)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              !isInternal
                ? 'bg-blue-500 text-white'
                : 'bg-surface text-text hover:bg-bg'
             }`}
          >
            Public Reply
          </button>
          <button
            onClick={() => setIsInternal(true)}
            className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${
              isInternal
                ? 'bg-yellow-500 text-white'
                : 'bg-surface text-text hover:bg-bg'
             }`}
          >
            <Lock size={14} />
            Internal Note
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={isInternal ? 'Add internal note (staff only)...' : 'Reply to citizen...'}
            className={`flex-1 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 ${
              isInternal
                ? 'border-yellow-300 focus:ring-yellow-500 bg-yellow-50'
                : 'border-border bg-card text-text focus:ring-primary'
             }`}
            rows={3}
            maxLength={10000}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${
              message.trim() && !sending
                ? isInternal
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-blue-500 hover:bg-blue-600'
                : 'bg-surface text-muted cursor-not-allowed'
             }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncidentTimeline
