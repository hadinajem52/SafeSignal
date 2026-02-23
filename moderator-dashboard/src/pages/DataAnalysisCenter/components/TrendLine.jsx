import { useState } from 'react'

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

export default function TrendLine({ data, color, maxVal, height = 96, showTip, moveTip, hideTip }) {
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
