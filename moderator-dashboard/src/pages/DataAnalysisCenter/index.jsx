import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI, usersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// ─── SCOPED CSS ───────────────────────────────────────────────────────────────
const DAC_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  .dac {
    --dac-bg:       #07090B;
    --dac-surface:  #0D1117;
    --dac-surface2: #131920;
    --dac-border:   #1C2430;
    --dac-border2:  #243040;
    --dac-muted:    #3D4F65;
    --dac-text:     #D9E4F0;
    --dac-dim:      #5C7390;
    --dac-blue:     #3B9EFF;
    --dac-red:      #E5484D;
    --dac-green:    #30A46C;
    --dac-amber:    #F5A623;
    background: var(--dac-bg);
    color: var(--dac-text);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 13px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .dac-topbar {
    border-bottom: 1px solid var(--dac-border);
    padding: 0 24px;
    display: flex;
    align-items: center;
    background: var(--dac-surface);
    height: 52px;
    gap: 16px;
  }
  .dac-topbar-title {
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--dac-text);
  }
  .dac-topbar-sub { font-size: 11px; font-weight: 500; color: var(--dac-dim); }
  .dac-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .dac-period-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
    border: 1px solid var(--dac-border2); background: none;
    color: var(--dac-dim); cursor: pointer; transition: all 0.1s;
    font-family: inherit;
  }
  .dac-period-btn.active { background: rgba(59,158,255,0.08); border-color: var(--dac-blue); color: var(--dac-blue); }
  .dac-period-btn:hover:not(.active) { color: var(--dac-text); border-color: var(--dac-muted); }
  .dac-scroll { overflow-y: auto; padding: 20px 24px 32px; flex: 1; min-height: 0; }
  .dac-scroll::-webkit-scrollbar { width: 3px; }
  .dac-scroll::-webkit-scrollbar-thumb { background: var(--dac-border2); }
  .dac-tip { position: fixed; pointer-events: none; z-index: 9999; background: #0A1020; border: 1px solid rgba(59,158,255,0.28); padding: 9px 11px; min-width: 140px; box-shadow: 0 8px 32px rgba(0,0,0,0.96), 0 0 0 1px rgba(0,0,0,0.8); }
  .dac-tip-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--dac-muted); margin-bottom: 7px; }
  .dac-tip-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .dac-tip-row:last-child { margin-bottom: 0; }
  .dac-tip-dot { width: 6px; height: 6px; border-radius: 1px; flex-shrink: 0; }
  .dac-tip-label { font-size: 10px; font-weight: 500; color: var(--dac-dim); flex: 1; }
  .dac-tip-val { font-size: 11px; font-weight: 700; color: var(--dac-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .dac-tip-divider { height: 1px; background: var(--dac-border); margin: 5px 0; }
  .dac-bar { flex: 1; transition: opacity 0.12s, outline 0.12s; cursor: pointer; }
  .dac-bar:hover { opacity: 1 !important; outline: 1px solid rgba(255,255,255,0.18); outline-offset: 1px; }
  .dac-hm-cell:hover { opacity: 1 !important; outline: 1px solid rgba(255,255,255,0.3); }
  .dac-funnel-row { display: flex; align-items: center; gap: 10px; padding: 0 4px; border-radius: 2px; transition: background 0.1s; cursor: default; }
  .dac-funnel-row:hover { background: rgba(59,158,255,0.05); }
  .dac-hotspot-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--dac-border); transition: background 0.1s; cursor: default; }
  .dac-hotspot-row:hover { background: rgba(59,158,255,0.04); }
  .dac-hotspot-row:last-child { border-bottom: none; }
  .dac-reporter-row { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid var(--dac-border); transition: background 0.1s; cursor: default; }
  .dac-reporter-row:hover { background: rgba(59,158,255,0.04); }
  .dac-reporter-row:last-child { border-bottom: none; }
  .dac-cat-seg { flex: 1; min-width: 0; cursor: pointer; transition: opacity 0.1s, outline 0.1s; }
  .dac-cat-seg:hover { opacity: 1 !important; outline: 1px solid rgba(255,255,255,0.15); }
  .dac-section-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; margin-top: 4px; }
  .dac-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--dac-muted); white-space: nowrap; }
  .dac-section-line { flex: 1; height: 1px; background: var(--dac-border); }
  .dac-section-meta { font-size: 10px; font-weight: 600; color: var(--dac-dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .dac-card { background: var(--dac-surface); border: 1px solid var(--dac-border); overflow: hidden; display: flex; flex-direction: column; }
  .dac-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--dac-border); }
  .dac-card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dac-dim); }
  .dac-card-meta { font-size: 10px; font-weight: 600; color: var(--dac-muted); font-variant-numeric: tabular-nums; }
  .dac-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--dac-border); border: 1px solid var(--dac-border); margin-bottom: 20px; }
  .dac-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .dac-grid-3col { display: grid; grid-template-columns: 1fr 1fr 340px; gap: 16px; margin-bottom: 20px; }
  .dac-kpi { background: var(--dac-surface); padding: 16px 18px; position: relative; overflow: hidden; }
  .dac-kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
  .dac-kpi.blue::before  { background: var(--dac-blue); }
  .dac-kpi.green::before { background: var(--dac-green); }
  .dac-kpi.amber::before { background: var(--dac-amber); }
  .dac-kpi.red::before   { background: var(--dac-red); }
  .dac-kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dac-dim); margin-bottom: 8px; }
  .dac-kpi-value { font-size: 30px; font-weight: 800; color: var(--dac-text); line-height: 1; font-variant-numeric: tabular-nums; margin-bottom: 6px; }
  .dac-kpi-value sup { font-size: 14px; font-weight: 600; color: var(--dac-dim); margin-left: 2px; }
  .dac-kpi-delta { font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .dac-delta-good { color: var(--dac-green); }
  .dac-delta-bad  { color: var(--dac-red); }
  .dac-delta-neu  { color: var(--dac-muted); }
  .dac-bars { display: flex; align-items: flex-end; gap: 3px; height: 80px; padding: 0 2px; }
  /* .dac-bar overridden in scroll section above */
  .dac-pct-row { display: flex; justify-content: space-between; padding: 10px 16px; border-top: 1px solid var(--dac-border); }
  .dac-pct-item { text-align: center; }
  .dac-pct-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dac-muted); margin-bottom: 3px; }
  .dac-pct-val { font-size: 15px; font-weight: 800; color: var(--dac-text); font-variant-numeric: tabular-nums; }
  .dac-pct-unit { font-size: 10px; font-weight: 600; color: var(--dac-dim); margin-left: 2px; }
  .dac-pct-bar { height: 2px; background: var(--dac-border2); margin-top: 4px; }
  .dac-pct-fill { height: 100%; }
  .dac-trend-xlabels { display: flex; justify-content: space-between; padding: 6px 16px 12px; }
  .dac-trend-xlabel { font-size: 9px; font-weight: 600; color: var(--dac-muted); }
  .dac-heatmap-grid { display: grid; grid-template-columns: 34px repeat(24,1fr); gap: 2px; padding: 12px 16px; }
  .dac-hm-cell { height: 14px; border-radius: 1px; cursor: pointer; transition: opacity 0.1s, outline 0.1s; }
  .dac-hm-row-label { font-size: 9px; font-weight: 700; color: var(--dac-muted); text-align: right; padding-right: 4px; line-height: 14px; text-transform: uppercase; letter-spacing: 0.04em; }
  .dac-hm-hour-row { display: grid; grid-template-columns: 34px repeat(24,1fr); gap: 2px; padding: 0 16px 12px; }
  .dac-hm-hour-label { font-size: 8px; font-weight: 600; color: var(--dac-muted); text-align: center; font-variant-numeric: tabular-nums; }
  .dac-hm-legend { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border-top: 1px solid var(--dac-border); }
  .dac-hm-legend-label { font-size: 9px; font-weight: 600; color: var(--dac-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .dac-legend-scale { display: flex; gap: 2px; }
  .dac-legend-cell { width: 14px; height: 10px; border-radius: 1px; }
  .dac-funnel-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; justify-content: space-evenly; }
  /* .dac-funnel-row overridden in scroll section above */
  .dac-funnel-label { font-size: 11px; font-weight: 600; color: var(--dac-dim); width: 88px; flex-shrink: 0; }
  .dac-funnel-track { flex: 1; height: 8px; background: var(--dac-surface2); border: 1px solid var(--dac-border); overflow: hidden; }
  .dac-funnel-fill { height: 100%; transition: width 0.4s ease; }
  .dac-funnel-count { font-size: 12px; font-weight: 700; color: var(--dac-text); width: 28px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .dac-funnel-pct { font-size: 10px; font-weight: 600; color: var(--dac-muted); width: 36px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .dac-funnel-drop { font-size: 9px; font-weight: 700; width: 40px; text-align: right; flex-shrink: 0; }
  .dac-sla-center { display: flex; flex-direction: column; align-items: center; padding: 20px 16px 12px; flex: 1; justify-content: center; }
  .dac-sla-pct { font-size: 26px; font-weight: 800; color: var(--dac-text); font-variant-numeric: tabular-nums; text-align: center; }
  .dac-sla-sub { font-size: 10px; font-weight: 600; color: var(--dac-dim); text-align: center; margin-top: 2px; }
  .dac-sla-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--dac-border); border-top: 1px solid var(--dac-border); }
  .dac-sla-cell { background: var(--dac-surface); padding: 10px 14px; }
  .dac-sla-cell-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--dac-muted); margin-bottom: 3px; }
  .dac-sla-cell-val { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .dac-cat-bars { display: flex; align-items: flex-end; gap: 6px; height: 110px; }
  .dac-cat-group { flex: 1; height: 100%; display: flex; gap: 2px; align-items: flex-end; }
  /* .dac-cat-seg overridden in scroll section above */
  .dac-cat-xlabels { display: flex; justify-content: space-around; padding: 6px 16px 12px; }
  .dac-cat-xlabel { font-size: 9px; font-weight: 600; color: var(--dac-muted); }
  .dac-cat-legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--dac-border); }
  .dac-cat-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; color: var(--dac-dim); }
  .dac-cat-legend-dot { width: 8px; height: 8px; flex-shrink: 0; }
  /* .dac-hotspot-row overridden in scroll section above */
  .dac-hotspot-rank { font-size: 11px; font-weight: 800; color: var(--dac-muted); width: 18px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .dac-hotspot-name { flex: 1; min-width: 0; }
  .dac-hotspot-title { font-size: 12px; font-weight: 600; color: var(--dac-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dac-hotspot-count { font-size: 16px; font-weight: 800; color: var(--dac-text); font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .dac-hotspot-bar { width: 60px; flex-shrink: 0; }
  .dac-hotspot-track { height: 4px; background: var(--dac-surface2); border: 1px solid var(--dac-border); overflow: hidden; }
  .dac-hotspot-fill { height: 100%; }
  /* .dac-reporter-row overridden in scroll section above */
  .dac-reporter-avatar { width: 26px; height: 26px; border: 1px solid var(--dac-border2); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--dac-dim); background: var(--dac-surface2); flex-shrink: 0; text-transform: uppercase; }
  .dac-reporter-name { font-size: 11px; font-weight: 600; color: var(--dac-text); }
  .dac-reporter-sub { font-size: 10px; font-weight: 500; color: var(--dac-muted); margin-top: 1px; }
  .dac-reporter-stat { text-align: right; flex-shrink: 0; }
  .dac-reporter-pct { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .dac-reporter-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--dac-muted); }
  .dac-quality-bar { flex-shrink: 0; width: 64px; }
  .dac-quality-track { height: 4px; background: var(--dac-surface2); border: 1px solid var(--dac-border); overflow: hidden; }
  .dac-quality-fill { height: 100%; }
  .dac-alert-footer { padding: 10px 16px; border-top: 1px solid var(--dac-border); background: rgba(229,72,77,0.04); display: flex; gap: 6px; align-items: flex-start; }
  .dac-info-footer { padding: 10px 16px; border-top: 1px solid var(--dac-border); font-size: 10px; font-weight: 600; color: var(--dac-dim); }
  .dac-loading { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--dac-muted); font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
`

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getPeriodMs(period) {
  const day = 86400000
  return { '7d': 7 * day, '30d': 30 * day, '90d': 90 * day, '1y': 365 * day }[period] ?? 30 * day
}

function filterByPeriod(items, period) {
  const cutoff = Date.now() - getPeriodMs(period)
  return items.filter(i => new Date(i.created_at).getTime() >= cutoff)
}

function diffMinutes(a, b) {
  return (new Date(b) - new Date(a)) / 60000
}

function heatColor(val, max) {
  if (val === 0) return 'var(--dac-surface2)'
  const t = val / max
  if (t < 0.25) return 'rgba(59,158,255,0.15)'
  if (t < 0.5)  return 'rgba(59,158,255,0.4)'
  if (t < 0.75) return 'rgba(245,166,35,0.5)'
  return 'rgba(229,72,77,0.7)'
}

const ACTIONED_STATUSES = new Set([
  'verified','dispatched','on_scene','investigating',
  'police_closed','published','resolved','archived',
])
const CLOSED_STATUSES = new Set(['police_closed','resolved','archived'])

const FUNNEL_STAGES = [
  { label: 'Received',   match: () => true, color: 'var(--dac-blue)' },
  { label: 'Verified',   match: s => ACTIONED_STATUSES.has(s), color: 'var(--dac-blue)' },
  { label: 'Dispatched', match: s => ['dispatched','on_scene','investigating','police_closed','resolved','archived'].includes(s), color: 'var(--dac-amber)' },
  { label: 'On Scene',   match: s => ['on_scene','investigating','police_closed','resolved','archived'].includes(s), color: 'var(--dac-amber)' },
  { label: 'Closed',     match: s => CLOSED_STATUSES.has(s), color: 'var(--dac-green)' },
]

const CAT_DISPLAY = {
  theft:               { label: 'Theft',        color: 'var(--dac-red)' },
  assault:             { label: 'Assault',       color: '#C87533' },
  vandalism:           { label: 'Vandalism',     color: 'var(--dac-amber)' },
  suspicious_activity: { label: 'Suspicious',    color: '#8B6FBF' },
  traffic_incident:    { label: 'Traffic',       color: 'var(--dac-blue)' },
  noise_complaint:     { label: 'Noise',         color: '#5BA4CF' },
  fire:                { label: 'Fire',          color: '#E85D04' },
  medical_emergency:   { label: 'Medical',       color: '#2ECC71' },
  hazard:              { label: 'Hazard',        color: '#FFC300' },
  other:               { label: 'Other',         color: 'var(--dac-muted)' },
}

function trendPath(data, W, H, maxVal) {
  const step = W / Math.max(data.length - 1, 1)
  return data.map((v, i) => {
    const x = i * step
    const y = H - (v / (maxVal || 1)) * H * 0.92
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}
function trendArea(data, W, H, maxVal) {
  return trendPath(data, W, H, maxVal) + ` L ${W} ${H} L 0 ${H} Z`
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SLAGauge({ pct }) {
  const color = pct >= 80 ? 'var(--dac-green)' : pct >= 60 ? 'var(--dac-amber)' : 'var(--dac-red)'
  return (
    <svg width="120" height="68" viewBox="0 0 120 68">
      <path d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none" stroke="var(--dac-surface2)" strokeWidth="10" strokeLinecap="round"/>
      <path d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * 157} 157`}
      />
      {[0, 25, 50, 75, 100].map(t => {
        const angle = (t / 100) * Math.PI
        const x1 = 60 - 44 * Math.cos(angle); const y1 = 60 - 44 * Math.sin(angle)
        const x2 = 60 - 52 * Math.cos(angle); const y2 = 60 - 52 * Math.sin(angle)
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dac-border2)" strokeWidth="1.5"/>
      })}
    </svg>
  )
}

function Tooltip({ tip }) {
  if (!tip) return null
  const screenW = window.innerWidth
  const left = tip.x + 160 > screenW ? tip.x - 172 : tip.x
  return (
    <div className="dac-tip" style={{ left, top: tip.y }}>
      {tip.title && <div className="dac-tip-title">{tip.title}</div>}
      {tip.rows.map((r, i) => (
        r.divider
          ? <div key={i} className="dac-tip-divider"/>
          : <div key={i} className="dac-tip-row">
              {r.dot && <div className="dac-tip-dot" style={{ background: r.dot }}/>}
              <div className="dac-tip-label">{r.label}</div>
              <div className="dac-tip-val" style={r.color ? { color: r.color } : {}}>{r.value}</div>
            </div>
      ))}
    </div>
  )
}

function TrendLine({ data, color, maxVal, height = 96, showTip, moveTip, hideTip }) {
  const W = 600, H = height
  const step = W / Math.max(data.length - 1, 1)
  const [hoverIdx, setHoverIdx] = useState(null)
  const getY = v => H - (v / (maxVal || 1)) * H * 0.92
  const lastVal = data[data.length - 1] ?? 0
  return (
    <div style={{ padding: '12px 16px 0' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1="0" y1={H * t} x2={W} y2={H * t}
            stroke="var(--dac-border)" strokeWidth="1" strokeDasharray="4 4"/>
        ))}
        <path d={trendArea(data, W, H, maxVal)} fill={`${color}10`}/>
        <path d={trendPath(data, W, H, maxVal)} fill="none" stroke={color} strokeWidth="1.5"/>
        {hoverIdx !== null ? (
          <>
            <line x1={hoverIdx * step} y1={0} x2={hoverIdx * step} y2={H}
              stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" style={{ pointerEvents: 'none' }}/>
            <circle cx={hoverIdx * step} cy={getY(data[hoverIdx])} r="4" fill={color} style={{ pointerEvents: 'none' }}/>
          </>
        ) : (
          <circle cx={W} cy={getY(lastVal)} r="3" fill={color} style={{ pointerEvents: 'none' }}/>
        )}
        {showTip && data.map((v, i) => {
          const cx = i * step
          const sliceX = i === 0 ? 0 : cx - step / 2
          const sliceW = i === 0 ? step / 2 : i === data.length - 1 ? step / 2 : step
          const date = new Date(Date.now() - (data.length - 1 - i) * 86400000)
          const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          return (
            <rect key={i} x={sliceX} y={0} width={sliceW} height={H} fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={e => {
                setHoverIdx(i)
                showTip(e, dateLabel, [
                  { dot: color, label: 'Incidents', value: v },
                  { label: 'Day', value: `Day ${i + 1} of 30` },
                  { label: '% of peak', value: maxVal > 0 ? `${((v / maxVal) * 100).toFixed(0)}%` : '—' },
                ])
              }}
              onMouseMove={moveTip}
              onMouseLeave={() => { setHoverIdx(null); hideTip() }}/>
          )
        })}
      </svg>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataAnalysisCenter() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('30d')
  const [tip, setTip] = useState(null)
  const showTip = (e, title, rows) => setTip({ x: e.clientX + 14, y: e.clientY - 10, title, rows })
  const moveTip = (e) => setTip(t => t ? { ...t, x: e.clientX + 14, y: e.clientY - 10 } : t)
  const hideTip = () => setTip(null)

  const { data: allIncidents = [], isLoading: incLoading } = useQuery({
    queryKey: ['dac-incidents'],
    queryFn: async () => {
      const r = await reportsAPI.getAll({ limit: 500 })
      return r.success ? (r.data || []) : []
    },
    staleTime: 60000,
    refetchInterval: 30000,
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['dac-users'],
    queryFn: async () => {
      const r = await usersAPI.getAll()
      return r.success ? (r.data || []) : []
    },
    staleTime: 120000,
    enabled: user?.role !== 'law_enforcement',
  })

  const incidents = useMemo(
    () => filterByPeriod(allIncidents.filter(i => !i.is_draft), period),
    [allIncidents, period]
  )

  // KPIs
  const kpis = useMemo(() => {
    const actioned = incidents.filter(i => ACTIONED_STATUSES.has(i.status))
    const closed = incidents.filter(i => CLOSED_STATUSES.has(i.status))
    const responseTimes = actioned
      .map(i => diffMinutes(i.created_at, i.updated_at))
      .filter(m => m > 0 && m < 10080)
      .sort((a, b) => a - b)
    const avgResponse = responseTimes.length > 0
      ? responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length : 0
    const SLA_MINUTES = 30
    const slaCompliant = responseTimes.filter(m => m <= SLA_MINUTES).length
    const slaRate = responseTimes.length > 0 ? Math.round((slaCompliant / responseTimes.length) * 100) : 0
    const resolutionRate = incidents.length > 0 ? Math.round((closed.length / incidents.length) * 100) : 0
    const closedTimes = closed.map(i => diffMinutes(i.created_at, i.updated_at) / 1440).filter(d => d > 0)
    const avgTimeToClose = closedTimes.length > 0
      ? (closedTimes.reduce((s, v) => s + v, 0) / closedTimes.length).toFixed(1) : '0'
    return { avgResponse: Math.round(avgResponse), slaRate, resolutionRate, avgTimeToClose, responseTimes, slaCompliant, slaBreached: responseTimes.length - slaCompliant, closedCount: closed.length }
  }, [incidents])

  // Histogram
  const HIST_BUCKETS = [
    { label: '0-5m',   max: 5,        color: 'var(--dac-green)' },
    { label: '5-15m',  max: 15,       color: 'var(--dac-green)' },
    { label: '15-30m', max: 30,       color: 'var(--dac-blue)'  },
    { label: '30-60m', max: 60,       color: 'var(--dac-blue)'  },
    { label: '1-2h',   max: 120,      color: 'var(--dac-amber)' },
    { label: '2-4h',   max: 240,      color: 'var(--dac-amber)' },
    { label: '>4h',    max: Infinity, color: 'var(--dac-red)'   },
  ]
  const histogramData = useMemo(() => {
    const counts = HIST_BUCKETS.map(() => 0)
    kpis.responseTimes.forEach(m => {
      const idx = HIST_BUCKETS.findIndex((b, i) => {
        const prev = i === 0 ? 0 : HIST_BUCKETS[i - 1].max
        return m >= prev && m < b.max
      })
      if (idx >= 0) counts[idx]++
    })
    return HIST_BUCKETS.map((b, i) => ({ ...b, count: counts[i] }))
  }, [kpis.responseTimes])
  const histMax = Math.max(...histogramData.map(b => b.count), 1)

  // Percentiles
  const percentiles = useMemo(() => {
    const rt = [...kpis.responseTimes]
    const p = pct => rt.length === 0 ? 0 : rt[Math.floor((pct / 100) * (rt.length - 1))]
    const fmt = m => m >= 60 ? { val: (m / 60).toFixed(1), unit: 'hr' } : { val: Math.round(m), unit: 'min' }
    return [
      { label: 'P25', ...fmt(p(25)), color: 'var(--dac-green)', fill: 25 },
      { label: 'P50', ...fmt(p(50)), color: 'var(--dac-blue)',  fill: 50 },
      { label: 'P75', ...fmt(p(75)), color: 'var(--dac-amber)', fill: 75 },
      { label: 'P90', ...fmt(p(90)), color: 'var(--dac-red)',   fill: 90 },
    ]
  }, [kpis.responseTimes])

  // 30-day trend line
  const trendLine = useMemo(() => {
    const days = 30; const now = Date.now()
    return Array.from({ length: days }, (_, i) => {
      const dayStart = now - (days - i) * 86400000
      return allIncidents.filter(inc => {
        const t = new Date(inc.created_at).getTime()
        return t >= dayStart && t < dayStart + 86400000 && !inc.is_draft
      }).length
    })
  }, [allIncidents])
  const trendMax = Math.max(...trendLine, 1)
  const trendTotal = trendLine.reduce((s, v) => s + v, 0)
  const trendPeakIdx = trendLine.indexOf(Math.max(...trendLine))
  const peakDate = new Date(Date.now() - (29 - trendPeakIdx) * 86400000)
  const peakLabel = peakDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })

  // Heatmap
  const DAYS_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
    incidents.forEach(inc => {
      const d = new Date(inc.created_at)
      grid[(d.getDay() + 6) % 7][d.getHours()]++
    })
    return grid
  }, [incidents])
  const heatMax = Math.max(...heatmap.flat(), 1)
  let peakDow = 0, peakHour = 0, peakCount = 0
  heatmap.forEach((row, d) => row.forEach((v, h) => { if (v > peakCount) { peakCount = v; peakDow = d; peakHour = h } }))

  // Funnel
  const funnelData = useMemo(() =>
    FUNNEL_STAGES.map(s => ({ ...s, count: incidents.filter(i => s.match(i.status)).length })),
    [incidents]
  )

  // Category trends (last 4 weeks)
  const catTrend = useMemo(() => {
    const cats = Object.keys(CAT_DISPLAY); const now = Date.now()
    const data = {}
    cats.forEach(cat => {
      data[cat] = [3, 2, 1, 0].map(w => {
        const end = now - w * 7 * 86400000; const start = end - 7 * 86400000
        return allIncidents.filter(i => {
          const t = new Date(i.created_at).getTime()
          return i.category === cat && t >= start && t < end && !i.is_draft
        }).length
      })
    })
    return data
  }, [allIncidents])
  const catMax = Math.max(...Object.values(catTrend).flat(), 1)
  const activeCats = Object.entries(catTrend).filter(([, v]) => v.some(x => x > 0)).slice(0, 6)

  // Hotspots
  const hotspots = useMemo(() => {
    const map = {}
    incidents.forEach(i => { const loc = i.location_name || 'Unknown'; map[loc] = (map[loc] || 0) + 1 })
    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5)
    const maxC = sorted[0]?.[1] || 1
    return sorted.map(([name, count]) => ({
      name: name.length > 30 ? name.slice(0, 28) + '…' : name,
      count,
      pct: Math.round((count / maxC) * 100),
    }))
  }, [incidents])

  // Reporter quality
  const reporterStats = useMemo(() => {
    const userMap = {}
    allUsers.forEach(u => { userMap[u.user_id] = u })
    const map = {}
    incidents.forEach(i => {
      if (!i.reporter_id) return
      if (!map[i.reporter_id]) map[i.reporter_id] = { total: 0, valid: 0 }
      map[i.reporter_id].total++
      if (ACTIONED_STATUSES.has(i.status)) map[i.reporter_id].valid++
    })
    return Object.entries(map).filter(([, s]) => s.total >= 2).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, s]) => {
      const u = userMap[id]
      const pct = Math.round((s.valid / s.total) * 100)
      const name = u ? (u.username || `User #${id}`) : `Reporter #${id}`
      return { id, name, initials: name.slice(0, 2).toUpperCase(), total: s.total, valid: s.valid, pct, color: pct >= 75 ? 'var(--dac-green)' : pct >= 40 ? 'var(--dac-amber)' : 'var(--dac-red)' }
    })
  }, [incidents, allUsers])

  const loading = incLoading && incidents.length === 0

  return (
    <>
      <style>{DAC_STYLE}</style>
      <Tooltip tip={tip}/>
      <div className="dac" style={{ margin: '-2rem', minHeight: '100vh' }}>

        {/* TOPBAR */}
        <div className="dac-topbar">
          <div className="dac-topbar-title">Data Analysis Center</div>
          <div className="dac-topbar-sub">{user?.region || 'All Regions'} · Analysis View</div>
          <div className="dac-topbar-right">
            {['7d','30d','90d','1y'].map(p => (
              <button key={p} className={`dac-period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="dac-scroll">

          {loading && <div className="dac-loading">Loading analytics data…</div>}

          {/* KPI ROW */}
          <div className="dac-section-row">
            <div className="dac-section-title">Key Performance Indicators</div>
            <div className="dac-section-line"/>
            <div className="dac-section-meta">Last {period} · {incidents.length} reports</div>
          </div>
          <div className="dac-grid-4">
            <div className="dac-kpi blue">
              <div className="dac-kpi-label">Avg. Response Time</div>
              <div className="dac-kpi-value">
                {kpis.avgResponse >= 60 ? <>{(kpis.avgResponse/60).toFixed(1)}<sup>hr</sup></> : <>{kpis.avgResponse}<sup>min</sup></>}
              </div>
              <div className={`dac-kpi-delta ${kpis.avgResponse <= 30 ? 'dac-delta-good' : 'dac-delta-bad'}`}>
                {kpis.avgResponse <= 30 ? '↓ Within SLA target' : '↑ Above 30-min SLA target'}
              </div>
            </div>
            <div className="dac-kpi green">
              <div className="dac-kpi-label">SLA Compliance</div>
              <div className="dac-kpi-value">{kpis.slaRate}<sup>%</sup></div>
              <div className={`dac-kpi-delta ${kpis.slaRate >= 80 ? 'dac-delta-good' : kpis.slaRate >= 60 ? 'dac-delta-neu' : 'dac-delta-bad'}`}>
                {kpis.slaCompliant} within · {kpis.slaBreached} breached
              </div>
            </div>
            <div className="dac-kpi amber">
              <div className="dac-kpi-label">Case Resolution Rate</div>
              <div className="dac-kpi-value">{kpis.resolutionRate}<sup>%</sup></div>
              <div className={`dac-kpi-delta ${kpis.resolutionRate >= 50 ? 'dac-delta-good' : 'dac-delta-bad'}`}>
                {kpis.closedCount} of {incidents.length} closed
              </div>
            </div>
            <div className="dac-kpi red">
              <div className="dac-kpi-label">Avg. Time to Close</div>
              <div className="dac-kpi-value">{kpis.avgTimeToClose}<sup>d</sup></div>
              <div className="dac-kpi-delta dac-delta-neu">{kpis.closedCount} resolved cases</div>
            </div>
          </div>

          {/* RESPONSE TIME + TREND */}
          <div className="dac-section-row">
            <div className="dac-section-title">Response Time Distribution</div>
            <div className="dac-section-line"/>
            <div className="dac-section-meta">Cases by time-to-dispatch</div>
          </div>
          <div className="dac-grid-2">
            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">Time-to-Dispatch Histogram</div>
                <div className="dac-card-meta">{kpis.responseTimes.length} actioned cases</div>
              </div>
              <div style={{ padding: '16px 16px 0' }}>
                <div className="dac-bars">
                  {histogramData.map((b, i) => (
                    <div key={i} className="dac-bar"
                      style={{ height: `${(b.count / histMax) * 100}%`, background: b.color, opacity: 0.85, minHeight: b.count > 0 ? 3 : 0 }}
                      onMouseEnter={e => showTip(e, 'Response Time Bucket', [
                        { dot: b.color, label: 'Range', value: b.label },
                        { dot: b.color, label: 'Cases', value: b.count },
                        { dot: b.color, label: '% of actioned', value: kpis.responseTimes.length > 0 ? `${((b.count / kpis.responseTimes.length) * 100).toFixed(1)}%` : '—' },
                      ])}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}/>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 8px', marginTop: 4 }}>
                  {histogramData.map((b, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 700, color: 'var(--dac-muted)', textTransform: 'uppercase' }}>{b.label}</div>
                  ))}
                </div>
              </div>
              <div className="dac-pct-row">
                {percentiles.map(p => (
                  <div key={p.label} className="dac-pct-item" style={{ cursor: 'default' }}
                    onMouseEnter={e => showTip(e, `${p.label} Percentile`, [
                      { dot: p.color, label: 'Value', value: `${p.val} ${p.unit}` },
                      { label: 'Meaning', value: `${p.fill}% of cases under this` },
                    ])}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}>
                    <div className="dac-pct-label">{p.label}</div>
                    <div className="dac-pct-val">{p.val}<span className="dac-pct-unit">{p.unit}</span></div>
                    <div className="dac-pct-bar"><div className="dac-pct-fill" style={{ width: `${p.fill}%`, background: p.color }}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">30-Day Incident Trend</div>
                <div className="dac-card-meta">Daily total reports</div>
              </div>
              <TrendLine data={trendLine} color="var(--dac-blue)" maxVal={trendMax} height={96} showTip={showTip} moveTip={moveTip} hideTip={hideTip}/>
              <div className="dac-trend-xlabels">
                {['1','5','10','15','20','25','30'].map(d => <span key={d} className="dac-trend-xlabel">{d}</span>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--dac-border)', borderTop: '1px solid var(--dac-border)' }}>
                {[
                  { label: 'Peak Day',   value: peakLabel,                        color: 'var(--dac-amber)' },
                  { label: 'Total',      value: trendTotal,                       color: 'var(--dac-blue)' },
                  { label: 'Weekly Avg', value: (trendTotal / 4).toFixed(1),      color: 'var(--dac-green)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--dac-surface)', padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--dac-muted)', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HEATMAP */}
          <div className="dac-section-row">
            <div className="dac-section-title">Incident Heatmap</div>
            <div className="dac-section-line"/>
            <div className="dac-section-meta">Hour × Day — incident frequency</div>
          </div>
          <div className="dac-card" style={{ marginBottom: 20 }}>
            <div className="dac-card-header">
              <div className="dac-card-title">Peak Incident Hours by Day of Week</div>
              <div className="dac-card-meta" style={{ color: 'var(--dac-amber)', fontWeight: 700 }}>
                ↑ Peak: {DAYS_LABELS[peakDow]} {String(peakHour).padStart(2,'0')}:00 ({peakCount} incidents)
              </div>
            </div>
            <div className="dac-heatmap-grid">
              {heatmap.map((row, di) => (
                <>
                  <div key={`lbl-${di}`} className="dac-hm-row-label">{DAYS_LABELS[di]}</div>
                  {row.map((val, hi) => (
                    <div key={`${di}-${hi}`} className="dac-hm-cell"
                      style={{ background: heatColor(val, heatMax) }}
                      onMouseEnter={e => showTip(e, 'Incident Heatmap', [
                        { label: 'Day', value: DAYS_LABELS[di] },
                        { label: 'Hour', value: `${String(hi).padStart(2,'0')}:00 – ${String(hi+1).padStart(2,'0')}:00` },
                        { divider: true },
                        { dot: heatColor(val, heatMax) === 'var(--dac-surface2)' ? '#3D4F65' : heatColor(val, heatMax), label: 'Incidents', value: val },
                        { label: '% of daily peak', value: heatMax > 0 ? `${((val / heatMax) * 100).toFixed(0)}%` : '—' },
                      ])}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}/>
                  ))}
                </>
              ))}
            </div>
            <div className="dac-hm-hour-row">
              <div/>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="dac-hm-hour-label">{i % 6 === 0 ? String(i).padStart(2,'0') : ''}</div>
              ))}
            </div>
            <div className="dac-hm-legend">
              <div className="dac-hm-legend-label">Low</div>
              <div className="dac-legend-scale">
                {['rgba(59,158,255,0.15)','rgba(59,158,255,0.4)','rgba(245,166,35,0.5)','rgba(229,72,77,0.7)'].map((c, i) => (
                  <div key={i} className="dac-legend-cell" style={{ background: c }}/>
                ))}
              </div>
              <div className="dac-hm-legend-label">High</div>
              <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--dac-dim)' }}>Use to schedule patrol coverage</div>
            </div>
          </div>

          {/* FUNNEL + CATEGORIES + SLA */}
          <div className="dac-section-row">
            <div className="dac-section-title">Case Funnel &amp; Resolution</div>
            <div className="dac-section-line"/>
          </div>
          <div className="dac-grid-3col">
            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">Case Resolution Funnel</div>
                <div className="dac-card-meta">Where cases stall</div>
              </div>
              <div className="dac-funnel-list">
                {funnelData.map((f, i) => {
                  const prev = i > 0 ? funnelData[i - 1].count : null
                  const drop = prev && prev > 0 ? (((prev - f.count) / prev) * 100).toFixed(0) : null
                  const funnelPct = funnelData[0].count > 0 ? ((f.count / funnelData[0].count) * 100).toFixed(0) : 0
                  return (
                    <div key={f.label} className="dac-funnel-row"
                      onMouseEnter={e => showTip(e, `Funnel: ${f.label}`, [
                        { dot: f.color, label: 'Cases', value: f.count },
                        { dot: f.color, label: 'Of total', value: `${funnelPct}%` },
                        ...(drop ? [{ divider: true }, { label: 'Drop from prev', value: `−${drop}%`, color: 'var(--dac-red)' }] : []),
                      ])}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}>
                      <div className="dac-funnel-label">{f.label}</div>
                      <div className="dac-funnel-track">
                        <div className="dac-funnel-fill" style={{ width: `${funnelData[0].count > 0 ? (f.count / funnelData[0].count) * 100 : 0}%`, background: f.color, opacity: 0.8 }}/>
                      </div>
                      <div className="dac-funnel-count">{f.count}</div>
                      <div className="dac-funnel-pct">{funnelPct}%</div>
                      <div className="dac-funnel-drop">
                        {drop ? <span style={{ color: 'var(--dac-red)' }}>−{drop}%</span> : <span style={{ color: 'var(--dac-muted)' }}>—</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {(() => {
                const verified = funnelData[1]?.count || 0; const dispatched = funnelData[2]?.count || 0
                const dropPct = verified > 0 ? ((verified - dispatched) / verified * 100).toFixed(0) : 0
                return verified > 0 && (
                  <div className="dac-alert-footer">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--dac-amber)" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--dac-amber)' }}>{dropPct}% drop from Verified → Dispatched — investigate backlog</span>
                  </div>
                )
              })()}
            </div>

            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">Incidents by Category</div>
                <div className="dac-card-meta">Last 4 weeks</div>
              </div>
              <div style={{ padding: '16px 16px 0' }}>
                <div className="dac-cat-bars">
                  {[0, 1, 2, 3].map(wk => (
                    <div key={wk} className="dac-cat-group">
                      {activeCats.map(([cat]) => {
                        const wkLabel = ['W4 ago','W3 ago','W2 ago','This wk'][wk]
                        const count = catTrend[cat][wk]
                        const catColor = CAT_DISPLAY[cat]?.color || 'var(--dac-muted)'
                        return (
                          <div key={cat} className="dac-cat-seg"
                            style={{ height: `${catMax > 0 ? (count / catMax) * 100 : 0}%`, background: catColor, opacity: 0.85, minHeight: count > 0 ? 2 : 0 }}
                            onMouseEnter={e => showTip(e, `${CAT_DISPLAY[cat]?.label || cat} — ${wkLabel}`, [
                              { dot: catColor, label: 'Incidents', value: count },
                              { label: '% of week peak', value: catMax > 0 ? `${((count / catMax) * 100).toFixed(0)}%` : '—' },
                            ])}
                            onMouseMove={moveTip}
                            onMouseLeave={hideTip}/>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="dac-cat-xlabels">
                {['W4 ago','W3 ago','W2 ago','This wk'].map(w => <div key={w} className="dac-cat-xlabel">{w}</div>)}
              </div>
              <div className="dac-cat-legend">
                {activeCats.length === 0
                  ? <div style={{ fontSize: 10, color: 'var(--dac-muted)' }}>No category data in range</div>
                  : activeCats.map(([cat]) => (
                    <div key={cat} className="dac-cat-legend-item">
                      <div className="dac-cat-legend-dot" style={{ background: CAT_DISPLAY[cat]?.color || 'var(--dac-muted)' }}/>
                      {CAT_DISPLAY[cat]?.label || cat}
                    </div>
                  ))}
              </div>
            </div>

            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">SLA Compliance</div>
                <div className="dac-card-meta">30-min action target</div>
              </div>
              <div className="dac-sla-center">
                <SLAGauge pct={kpis.slaRate}/>
                <div className="dac-sla-pct">{kpis.slaRate}%</div>
                <div className="dac-sla-sub">of verified cases actioned within 30 min</div>
              </div>
              <div className="dac-sla-breakdown">
                {[
                  { label: 'Within SLA',    value: kpis.slaCompliant, color: 'var(--dac-green)' },
                  { label: 'Breached SLA',  value: kpis.slaBreached,  color: 'var(--dac-red)' },
                  { label: 'Avg Response',  value: kpis.avgResponse >= 60 ? `${(kpis.avgResponse/60).toFixed(1)}h` : `${kpis.avgResponse}m`, color: 'var(--dac-amber)' },
                  { label: 'Cases Sampled', value: kpis.responseTimes.length, color: 'var(--dac-blue)' },
                ].map(s => (
                  <div key={s.label} className="dac-sla-cell">
                    <div className="dac-sla-cell-label">{s.label}</div>
                    <div className="dac-sla-cell-val" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HOTSPOTS + REPORTER QUALITY */}
          <div className="dac-section-row">
            <div className="dac-section-title">Geographic &amp; Signal Intelligence</div>
            <div className="dac-section-line"/>
          </div>
          <div className="dac-grid-2">
            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">Repeat Incident Hotspots</div>
                <div className="dac-card-meta">{hotspots.length} locations</div>
              </div>
              {hotspots.length === 0
                ? <div className="dac-loading" style={{ height: 120 }}>No location data available</div>
                : hotspots.map((h, i) => {
                  const barColor = h.count >= 8 ? 'var(--dac-red)' : h.count >= 5 ? 'var(--dac-amber)' : 'var(--dac-blue)'
                  const tier = h.count >= 8 ? 'Critical hotspot' : h.count >= 5 ? 'Active hotspot' : 'Low activity'
                  return (
                    <div key={i} className="dac-hotspot-row"
                      onMouseEnter={e => showTip(e, `#${i+1} Hotspot`, [
                        { label: 'Location', value: h.name },
                        { divider: true },
                        { dot: barColor, label: 'Incidents', value: h.count },
                        { dot: barColor, label: 'Relative volume', value: `${h.pct}%` },
                        { dot: barColor, label: 'Tier', value: tier, color: barColor },
                      ])}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}>
                      <div className="dac-hotspot-rank">{i + 1}</div>
                      <div className="dac-hotspot-name"><div className="dac-hotspot-title">{h.name}</div></div>
                      <div className="dac-hotspot-bar">
                        <div className="dac-hotspot-track">
                          <div className="dac-hotspot-fill" style={{ width: `${h.pct}%`, background: barColor }}/>
                        </div>
                      </div>
                      <div className="dac-hotspot-count">{h.count}</div>
                    </div>
                  )
                })}
              <div className="dac-info-footer">Incident count over last {period} · Red = recurring hotspot</div>
            </div>

            <div className="dac-card">
              <div className="dac-card-header">
                <div className="dac-card-title">Reporter Signal Quality</div>
                <div className="dac-card-meta">Valid reports / total submitted</div>
              </div>
              {reporterStats.length === 0
                ? <div className="dac-loading" style={{ height: 120 }}>Insufficient data (min 2 reports per reporter)</div>
                : reporterStats.map((r, i) => {
                  const grade = r.pct >= 75 ? 'High quality' : r.pct >= 40 ? 'Moderate quality' : 'Low quality — review'
                  return (
                    <div key={i} className="dac-reporter-row"
                      onMouseEnter={e => showTip(e, r.name, [
                        { dot: r.color, label: 'Accuracy', value: `${r.pct}%`, color: r.color },
                        { label: 'Valid reports', value: r.valid },
                        { label: 'Total submitted', value: r.total },
                        { divider: true },
                        { dot: r.color, label: 'Signal quality', value: grade, color: r.color },
                      ])}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}>
                      <div className="dac-reporter-avatar">{r.initials}</div>
                      <div>
                        <div className="dac-reporter-name">{r.name}</div>
                        <div className="dac-reporter-sub">{r.valid}/{r.total} valid</div>
                      </div>
                      <div className="dac-quality-bar" style={{ marginLeft: 'auto' }}>
                        <div className="dac-quality-track">
                          <div className="dac-quality-fill" style={{ width: `${r.pct}%`, background: r.color }}/>
                        </div>
                      </div>
                      <div className="dac-reporter-stat" style={{ marginLeft: 10 }}>
                        <div className="dac-reporter-pct" style={{ color: r.color }}>{r.pct}%</div>
                        <div className="dac-reporter-label">accuracy</div>
                      </div>
                    </div>
                  )
                })}
              {reporterStats.some(r => r.pct === 0) && (
                <div className="dac-alert-footer">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--dac-red)" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--dac-dim)', lineHeight: 1.5 }}>
                    {reporterStats.filter(r => r.pct === 0).length} reporter(s) with 0% accuracy — flag for manual review.
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
