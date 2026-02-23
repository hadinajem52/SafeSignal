export default function Tooltip({ tip }) {
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
