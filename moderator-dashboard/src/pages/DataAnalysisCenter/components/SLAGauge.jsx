export default function SLAGauge({ pct }) {
  const color = pct >= 80 ? 'var(--dac-green)' : pct >= 60 ? 'var(--dac-amber)' : 'var(--dac-red)'
  return (
    <svg width="120" height="68" viewBox="0 0 120 68">
      <path d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none" stroke="var(--dac-surface2)" strokeWidth="10" strokeLinecap="butt"/>
      <path d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="butt"
        strokeDasharray={`${(pct / 100) * 157} 157`}
      />
    </svg>
  )
}
