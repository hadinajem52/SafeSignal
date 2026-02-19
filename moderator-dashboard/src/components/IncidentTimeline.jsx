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
  const [isInternal, setIsInternal] = useState(true)
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
      setMessage(messageText)
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
        return `Status changed ${item.notes ? `— ${item.notes}` : ''}`
      case 'verified':
        return 'Report verified by moderator'
      case 'rejected':
        return `Report rejected ${item.notes ? `— ${item.notes}` : ''}`
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
        <div key={index} className="flex justify-center my-3">
          <div className="bg-surface/70 px-3.5 py-1.5 rounded-full border border-border">
            <p className="text-[11px] text-muted italic">{getSystemMessage(item)}</p>
            <p className="text-[10px] text-muted/60 text-center mt-0.5">{formatTime(item.created_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={index} className="mb-3.5">
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${isStaff
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'bg-surface text-muted border border-border'
              }`}
          >
            {item.username?.charAt(0).toUpperCase() || '?'}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-xs text-text">{item.username}</span>
              {isStaff && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                  Staff
                </span>
              )}
              {item.is_internal && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/15">
                  <Lock size={9} />
                  Internal
                </span>
              )}
              <span className="text-[10px] text-muted ml-auto">{formatTime(item.created_at)}</span>
            </div>

            {/* Message bubble */}
            <div
              className={`rounded-lg p-2.5 text-sm leading-relaxed ${item.is_internal
                  ? 'bg-warning/6 border border-warning/12 text-text'
                  : 'bg-card border border-border text-text'
                }`}
            >
              <p className="whitespace-pre-wrap text-[13px]">{item.content}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-error text-sm">{error}</p>
        <button
          onClick={loadTimeline}
          className="px-3 py-1.5 bg-primary/15 text-primary text-xs font-semibold rounded-lg hover:bg-primary/25 transition-colors border border-primary/20"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {timeline.map((item, index) => renderTimelineItem(item, index))}
            <div ref={timelineEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-3.5">
        {/* Toggle row */}
        <div className="flex gap-1.5 mb-2.5">
          <button
            onClick={() => setIsInternal(false)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${!isInternal
                ? 'bg-primary/15 text-primary border border-primary/25'
                : 'bg-surface text-muted border border-border hover:bg-bg'
              }`}
          >
            Public Reply
          </button>
          <button
            onClick={() => setIsInternal(true)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${isInternal
                ? 'bg-warning/15 text-warning border border-warning/25'
                : 'bg-surface text-muted border border-border hover:bg-bg'
              }`}
          >
            <Lock size={11} />
            Internal Note
          </button>
        </div>

        {/* Input + send */}
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
            placeholder={isInternal ? 'Add internal note (staff only)…' : 'Reply to citizen…'}
            className={`flex-1 px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 transition-shadow ${isInternal
                ? 'border border-warning/20 focus:ring-warning/20 bg-warning/5 text-text placeholder:text-muted/50'
                : 'border border-border bg-surface text-text focus:ring-primary/20 placeholder:text-muted/50'
              }`}
            rows={2}
            maxLength={10000}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 text-xs ${message.trim() && !sending
                ? isInternal
                  ? 'bg-warning/15 text-warning hover:bg-warning/25 border border-warning/20'
                  : 'bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20'
                : 'bg-surface text-muted/50 border border-border cursor-not-allowed'
              }`}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send size={13} />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncidentTimeline
