import { useState, useRef, useEffect } from 'react'

const AGENT_GROUPS = [
  {
    id: 'assortment',
    label: 'Assortment Agent',
    color: '#9a1f1f',
    bg: '#fdf0f0',
    border: '#f5c6c6',
    description: 'Range health · OOS prevention · SKU lifecycle management',
    modules: [
      { id: 'supply_risk', label: 'OOS Risk' },
      { id: 'sku_agent',   label: 'SKU Management' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing Agent',
    color: '#5a2d82',
    bg: '#f8f4ff',
    border: '#d8c8f5',
    description: 'EDLP optimization · competitor price index · elasticity-based recommendations',
    modules: [
      { id: 'pricing', label: 'Price Advisor' },
    ],
  },
  {
    id: 'promotions',
    label: 'Promotions Agent',
    color: '#a05c00',
    bg: '#fffaee',
    border: '#f0d8a0',
    description: 'Live promo monitoring · future commit planning 8–12 weeks out',
    modules: [
      { id: 'promo_monitor', label: 'Promo Monitor' },
      { id: 'promo_commit',  label: 'Promo Commit' },
    ],
  },
  {
    id: 'planogram',
    label: 'Planogram Agent',
    color: '#2a6e3f',
    bg: '#f2fbf5',
    border: '#b8dfc8',
    description: 'Shelf placement · facing efficiency · reset planning',
    modules: [
      { id: 'planogram', label: 'Planogram Advisor' },
    ],
  },
  {
    id: 'loyalty',
    label: 'Loyalty Agent',
    color: '#0a6e7a',
    bg: '#f0fbfc',
    border: '#a0d8e0',
    description: 'Customer loyalty penetration · buyer segments · retention & acquisition signals',
    modules: [
      { id: 'loyalty', label: 'Loyalty Analyzer' },
    ],
  },
]

const ALL_MODULE_IDS = AGENT_GROUPS.flatMap(g => g.modules.map(m => m.id))
const EMPTY_LINES = Object.fromEntries(ALL_MODULE_IDS.map(id => [id, []]))

export default function AgentPanel({ retailer, category }) {
  const [weeks,   setWeeks]   = useState([])
  const [weekId,  setWeekId]  = useState(null)
  const [running, setRunning] = useState({})   // { module_id: true }
  const [done,    setDone]    = useState(false)
  const [lines,   setLines]   = useState(EMPTY_LINES)
  const esRefs   = useRef({})
  const doneRef  = useRef(0)   // tracks completed count across async closures

  useEffect(() => {
    fetch('/api/weeks')
      .then(r => r.json())
      .then(data => { setWeeks(data); if (data.length) setWeekId(data[0].week_id) })
      .catch(() => {})
  }, [])

  const stopModules = (ids) => {
    ids.forEach(id => { esRefs.current[id]?.close(); delete esRefs.current[id] })
    setRunning(prev => {
      const next = { ...prev }
      ids.forEach(id => delete next[id])
      return next
    })
  }

  const runModules = (moduleIds, totalExpected) => {
    moduleIds.forEach(id => {
      if (esRefs.current[id]) { esRefs.current[id].close() }
      const es = new EventSource(`/api/agent/run?module=${id}&week_id=${weekId}`)
      esRefs.current[id] = es
      setRunning(prev => ({ ...prev, [id]: true }))

      es.onmessage = e => {
        setLines(prev => ({ ...prev, [id]: [...prev[id], e.data] }))
      }
      es.onerror = () => {
        es.close()
        delete esRefs.current[id]
        setRunning(prev => { const n = { ...prev }; delete n[id]; return n })
        doneRef.current += 1
        if (doneRef.current >= totalExpected) {
          setDone(true)
          doneRef.current = 0
        }
      }
    })
  }

  const runGroup = (group) => {
    if (!weekId) return
    const ids = group.modules.map(m => m.id)
    // stop any already-running modules in this group
    stopModules(ids)
    setLines(prev => {
      const next = { ...prev }
      ids.forEach(id => { next[id] = [] })
      return next
    })
    setDone(false)
    doneRef.current = ALL_MODULE_IDS.filter(id => esRefs.current[id]).length
    runModules(ids, ids.length + doneRef.current)
  }

  const runAll = () => {
    if (!weekId) return
    stopModules(ALL_MODULE_IDS)
    setLines(EMPTY_LINES)
    setDone(false)
    doneRef.current = 0
    runModules(ALL_MODULE_IDS, ALL_MODULE_IDS.length)
  }

  const stopAll = () => {
    stopModules(ALL_MODULE_IDS)
    doneRef.current = 0
  }

  const anyRunning = Object.keys(running).length > 0

  return (
    <div style={{ maxWidth: 1300, margin: '32px auto', padding: '0 20px' }}>

      {/* Top controls */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6',
        padding: 20, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: '#8a7f6e', textTransform: 'uppercase', marginBottom: 6 }}>Week</div>
          <select
            value={weekId ?? ''}
            onChange={e => { setWeekId(Number(e.target.value)); setDone(false) }}
            disabled={anyRunning}
            style={{ border: '1px solid #d4cfc4', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#1a1812', background: '#faf9f6', cursor: 'pointer', minWidth: 280 }}
          >
            {weeks.map(w => (
              <option key={w.week_id} value={w.week_id}>
                Week {w.week_id} — {w.week_start_date} → {w.week_end_date}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {anyRunning && (
            <button
              onClick={stopAll}
              style={{ padding: '11px 20px', borderRadius: 8, border: 'none', background: '#9a1f1f', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              ⏹ Stop All
            </button>
          )}
          <button
            onClick={runAll}
            disabled={!weekId || anyRunning}
            style={{
              padding: '11px 28px', borderRadius: 8, border: 'none',
              background: anyRunning ? '#ccc' : '#0a1628',
              color: '#fff', cursor: weekId && !anyRunning ? 'pointer' : 'default',
              fontWeight: 600, fontSize: 14, opacity: weekId ? 1 : 0.5,
            }}
          >
            ▶ Run Circe
          </button>
        </div>
      </div>

      {done && (
        <div style={{ background: '#f0f7f2', border: '1px solid #a8d5b5', borderRadius: 10, padding: '12px 20px', marginBottom: 16, fontSize: 14, color: '#1a7a4a', fontWeight: 500 }}>
          ✓ Circe finished — go to the <strong>Recommendations</strong> tab to see the full SKU summary.
        </div>
      )}

      {/* 5 Agent Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {AGENT_GROUPS.map(group => {
          const groupRunning = group.modules.some(m => running[m.id])
          return (
            <div key={group.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${group.border}`, overflow: 'hidden' }}>

              {/* Group header */}
              <div style={{
                background: group.bg, borderBottom: `1px solid ${group.border}`,
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-block', width: 10, height: 10,
                    borderRadius: '50%', background: group.color,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.label}</span>
                </div>
                <span style={{ fontSize: 13, color: '#6b6456' }}>{group.description}</span>
                <button
                  onClick={() => runGroup(group)}
                  disabled={!weekId || groupRunning}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 16px', borderRadius: 6,
                    border: `1.5px solid ${group.color}`,
                    background: groupRunning ? group.bg : 'transparent',
                    color: group.color,
                    cursor: weekId && !groupRunning ? 'pointer' : 'default',
                    fontWeight: 600, fontSize: 12,
                    opacity: weekId ? 1 : 0.5,
                  }}
                >
                  {groupRunning ? '● Running…' : '▶ Run'}
                </button>
              </div>

              {/* Sub-agent terminals */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.modules.length}, 1fr)`, gap: 0 }}>
                {group.modules.map((mod, idx) => (
                  <div key={mod.id} style={{ borderLeft: idx > 0 ? `1px solid ${group.border}` : 'none' }}>
                    {/* Sub-agent label */}
                    <div style={{
                      background: group.color, color: '#fff',
                      padding: '5px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span>{mod.label}</span>
                      {running[mod.id] && <span style={{ opacity: 0.7 }}>● live</span>}
                    </div>
                    {/* Terminal */}
                    <div style={{
                      background: '#0a1628', padding: 14,
                      minHeight: 260, maxHeight: 380,
                      fontFamily: 'monospace', fontSize: 12,
                      color: '#d0d8e8', whiteSpace: 'pre-wrap',
                      overflowY: 'auto', lineHeight: 1.6,
                    }}>
                      {(lines[mod.id] || []).length === 0 ? (
                        <span style={{ color: '#4a5a78' }}>{weekId ? 'Ready…' : 'Loading…'}</span>
                      ) : (
                        (lines[mod.id] || []).map((l, i) => (
                          <span key={i} style={{
                            color: l.startsWith('──') ? '#e8a020'
                                 : l.startsWith('✓') ? '#72d8a8'
                                 : l.startsWith('✗') ? '#ff6b6b'
                                 : '#d0d8e8',
                          }}>{l}</span>
                        ))
                      )}
                      {running[mod.id] && (lines[mod.id] || []).length > 0 && (
                        <span style={{ color: '#4a5a78' }}>▌</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
