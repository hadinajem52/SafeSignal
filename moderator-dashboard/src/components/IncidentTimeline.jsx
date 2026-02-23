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
    const isLast = index === timeline.length - 1
    const isSystemMessage = item.item_type === 'system'
    const isItemInternal = item.is_internal
    const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(item.role)

    if (isSystemMessage) {
      return (
        <div key={index} className="relative flex gap-3 pb-5">
          {/* Vertical connector */}
          {!isLast && <div className="absolute left-[8px] top-[18px] bottom-0 w-px bg-border" />}
          {/* Muted system dot */}
          <div className="size-[18px] rounded-full border border-border bg-surface flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[11px] text-muted italic leading-snug">{getSystemMessage(item)}</p>
            <p className="text-[10px] text-muted/60 mt-0.5 tabular-nums">{formatTime(item.created_at)}</p>
          </div>
        </div>
      )
    }

    // Internal notes → amber; public replies → primary blue
    const dotClass = isItemInternal
      ? 'bg-warning/20 border-warning/40'
      : 'bg-primary/20 border-primary/40'

    return (
      <div key={index} className="relative flex gap-3 pb-5">
        {!isLast && <div className="absolute left-[8px] top-[18px] bottom-0 w-px bg-border" />}
        <div className={`size-[18px] rounded-full border flex-shrink-0 mt-1 ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-text">{item.username}</span>
            {isStaff && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 border border-primary/20 bg-primary/10 text-primary">
                Staff
              </span>
            )}
            {isItemInternal && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 border border-warning/25 bg-warning/10 text-warning">
                <Lock size={9} />
                Internal
              </span>
            )}
            <span className="text-[10px] text-muted tabular-nums ml-auto">{formatTime(item.created_at)}</span>
          </div>
          <div
            className={`px-3 py-2 text-[13px] leading-relaxed border ${
              isItemInternal
                ? 'bg-warning/5 border-warning/15 text-text'
                : 'bg-surface border-border text-text'
            }`}
          >
            <p className="whitespace-pre-wrap">{item.content}</p>
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
          className="px-3 py-1.5 bg-surface text-text text-xs font-semibold hover:bg-surface/80 transition-colors border border-border"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted text-center">No activity yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {timeline.map((item, index) => renderTimelineItem(item, index))}
            <div ref={timelineEndRef} />
          </>
        )}
      </div>

      {/* Composer — bordered tab toggle matching Reports Queue design */}
      <div className="border-t border-border bg-card flex-shrink-0 p-3">
        {/* Tab switcher */}
        <div className="flex mb-2">
          <button
            onClick={() => setIsInternal(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase
              tracking-[0.04em] border transition-all ${
              !isInternal
                ? 'bg-primary/8 border-primary text-primary'
                : 'border-border border-r-0 text-muted hover:text-text hover:bg-surface/60'
            }`}
          >
            <Send size={10} />
            Public Reply
          </button>
          <button
            onClick={() => setIsInternal(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase
              tracking-[0.04em] border transition-all ${
              isInternal
                ? 'bg-warning/8 border-warning text-warning'
                : 'border-border text-muted hover:text-text hover:bg-surface/60'
            }`}
          >
            <Lock size={10} />
            Internal Note
          </button>
        </div>

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
          className={`w-full px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 transition-shadow block ${
            isInternal
              ? 'border border-warning/25 focus:ring-warning/30 bg-warning/5 text-text placeholder:text-muted/50'
              : 'border border-border bg-surface text-text focus:ring-primary/30 placeholder:text-muted/50'
          }`}
          rows={2}
          maxLength={10000}
        />

        <div className="flex items-center justify-between mt-2">
          <p className={`text-[10px] font-semibold ${isInternal ? 'text-warning/70' : 'text-muted'}`}>
            {isInternal ? 'Staff only — not visible to reporter' : 'Visible to the reporter'}
          </p>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            aria-label="Send message"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] border transition-all ${
              message.trim() && !sending
                ? isInternal
                  ? 'border-warning bg-warning/8 text-warning hover:bg-warning hover:text-bg'
                  : 'border-primary bg-primary/8 text-primary hover:bg-primary hover:text-bg'
                : 'border-border bg-surface text-muted/50 cursor-not-allowed'
            }`}
          >
            {sending ? <Loader2 className="size-3 animate-spin" /> : <Send size={11} />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncidentTimeline
