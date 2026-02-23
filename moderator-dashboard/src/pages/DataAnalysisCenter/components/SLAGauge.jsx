export default function SLAGauge({ pct }) {
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
