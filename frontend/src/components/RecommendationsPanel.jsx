import { useState, useEffect } from 'react'

const RISK_COLOR = { CRITICAL: '#9a1f1f', HIGH: '#c25000', MEDIUM: '#a05c00', LOW: '#1a7a4a' }
const RISK_BG   = { CRITICAL: '#fdf0f0', HIGH: '#fff4ee', MEDIUM: '#fffaee', LOW: '#f0faf4' }
const SEV_COLOR = { critical: '#9a1f1f', alert: '#c25000', warning: '#a05c00', ok: '#1a7a4a' }

const fmt$ = v => v == null ? '—' : `$${Math.abs(Number(v)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtPP = v => v == null || v === 0 ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(1)} pp`
const fmtPL = v => v == null || v === 0 ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)} pp`
const sign = v => v > 0 ? '+' : ''

function Badge({ text, color, bg }) {
  if (!text) return null
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      color: color || '#1a1812', background: bg || '#f0ece4',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

function SkuManagementCell({ d }) {
  if (!d) return <td style={cellStyle} />
  const REC_STYLE = {
    delist:  { color: '#9a1f1f', bg: '#fdf0f0', label: '✕ Delist' },
    invest:  { color: '#1a7a4a', bg: '#f0faf4', label: '▲ Invest' },
    monitor: { color: '#a05c00', bg: '#fffaee', label: '◉ Monitor' },
  }
  const s = REC_STYLE[d.recommendation] || { color: '#6b6456', bg: '#faf9f6', label: d.recommendation }
  return (
    <td style={{ ...cellStyle, background: s.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Badge text={s.label} color={s.color} bg={s.bg} />
        {d.priority && <Badge text={d.priority} color='#6b6456' bg='#f0ece4' />}
        {d.reason_code && (
          <div style={{ fontSize: 11, color: '#6b6456', fontStyle: 'italic' }}>{d.reason_code.replace(/_/g, ' ')}</div>
        )}
        {d.yoy_velocity_change_pct != null && (
          <div style={{ fontSize: 11, color: d.yoy_velocity_change_pct < 0 ? '#9a1f1f' : '#1a7a4a', fontWeight: 500 }}>
            YoY vel: {d.yoy_velocity_change_pct > 0 ? '+' : ''}{Number(d.yoy_velocity_change_pct).toFixed(0)}%
          </div>
        )}
        {d.margin_pct != null && (
          <div style={{ fontSize: 11, color: '#6b6456' }}>Margin: {Number(d.margin_pct).toFixed(0)}%</div>
        )}
        {d.rationale && <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.rationale}</div>}
      </div>
    </td>
  )
}

function SupplyCell({ d }) {
  if (!d) return <td style={cellStyle} />
  const color = RISK_COLOR[d.risk_level] || '#6b6456'
  const bg = RISK_BG[d.risk_level] || '#faf9f6'
  return (
    <td style={{ ...cellStyle, background: bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Badge text={d.risk_level} color={color} bg={bg} />
        {d.action === 'order' && d.order_qty > 0 && (
          <div style={{ fontSize: 12, color: '#1a1812', fontWeight: 500 }}>Order {d.order_qty} units</div>
        )}
        {d.days_of_supply != null && (
          <div style={{ fontSize: 11, color: '#6b6456' }}>{d.days_of_supply}d supply</div>
        )}
        {d.rationale && <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.rationale}</div>}
      </div>
    </td>
  )
}

function MonitorCell({ d }) {
  if (!d) return <td style={cellStyle} />
  const isOk = d.status === 'on_track'
  const color = SEV_COLOR[d.severity] || '#6b6456'
  return (
    <td style={{ ...cellStyle, background: isOk ? '#f8fbf9' : '#fffaee' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Badge
          text={isOk ? 'On track' : (d.deviation_type?.replace(/_/g, ' ') || d.severity)}
          color={isOk ? '#1a7a4a' : color}
          bg={isOk ? '#e8f5ed' : '#fff0d0'}
        />
        {d.revenue_at_risk > 0 && (
          <div style={{ fontSize: 11, color: '#9a1f1f', fontWeight: 500 }}>
            {fmt$(d.revenue_at_risk)} at risk
          </div>
        )}
        {d.action && !isOk && <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.action}</div>}
      </div>
    </td>
  )
}

function CommitCell({ d }) {
  if (!d) return <td style={cellStyle} />
  return (
    <td style={{ ...cellStyle, background: '#f0f4ff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Badge text={`#${d.rank} ${d.mechanic || ''}`} color='#1a5fa0' bg='#dde8ff' />
        {d.mechanic_desc && <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1812' }}>{d.mechanic_desc}</div>}
        {d.week_target && <div style={{ fontSize: 11, color: '#6b6456' }}>Wk {d.week_target}</div>}
        {d.forecast_lift_x && <div style={{ fontSize: 11, color: '#1a5fa0' }}>{d.forecast_lift_x}× lift</div>}
        {d.rationale && <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.rationale}</div>}
      </div>
    </td>
  )
}

function FinancialCell({ d }) {
  if (!d) return <td style={cellStyle} />

  const typeStyle = {
    protected:   { color: '#1a7a4a', bg: '#f0faf4', label: '▲ Revenue protected' },
    at_risk:     { color: '#9a1f1f', bg: '#fdf0f0', label: '▼ Revenue at risk' },
    incremental: { color: '#1a5fa0', bg: '#f0f4ff', label: '▲ Incremental revenue' },
  }[d.impact_type] || { color: '#6b6456', bg: '#faf9f6', label: 'Impact' }

  const salesIsNeg = d.delta_sales < 0

  return (
    <td style={{ ...cellStyle, background: typeStyle.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: typeStyle.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {typeStyle.label}
        </div>

        {/* Sales */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#8a7f6e' }}>Sales Δ</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: salesIsNeg ? '#9a1f1f' : '#1a7a4a' }}>
            {salesIsNeg ? '−' : '+'}{fmt$(d.delta_sales)}
          </span>
        </div>

        {/* Margin pp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#8a7f6e' }}>Margin pp</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: d.delta_margin_pp < 0 ? '#c25000' : d.delta_margin_pp > 0 ? '#1a7a4a' : '#6b6456' }}>
            {fmtPP(d.delta_margin_pp)}
          </span>
        </div>

        {/* PL penetration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#8a7f6e' }}>PL penet.</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: d.delta_pl_pp > 0 ? '#1a7a4a' : d.delta_pl_pp < 0 ? '#c25000' : '#6b6456' }}>
            {fmtPL(d.delta_pl_pp)}
          </span>
        </div>

        {/* Basis */}
        {d.basis && (
          <div style={{ fontSize: 10, color: '#b0a898', lineHeight: 1.4, marginTop: 2, borderTop: '1px solid #e8e4dc', paddingTop: 4 }}>
            {d.basis}
          </div>
        )}
      </div>
    </td>
  )
}

function LoyaltyCell({ d }) {
  if (!d) return <td style={cellStyle} />
  const SIGNAL_STYLE = {
    anchor:          { label: '⚓ Anchor',          color: '#0a6e7a', bg: '#e8f8fa' },
    acquisition:     { label: '✦ Acquisition',      color: '#1a5fa0', bg: '#e8f0ff' },
    retention_risk:  { label: '▼ Retention risk',   color: '#9a1f1f', bg: '#fdf0f0' },
    basket_builder:  { label: '◈ Basket builder',   color: '#2a6e3f', bg: '#f0faf4' },
  }
  const s = SIGNAL_STYLE[d.loyalty_signal] || { label: d.loyalty_signal, color: '#6b6456', bg: '#faf9f6' }
  return (
    <td style={{ ...cellStyle, background: s.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Badge text={s.label} color={s.color} bg={s.bg} />
        {d.loyalty_pct != null && (
          <div style={{ fontSize: 12, color: '#1a1812' }}>
            <span style={{ color: '#8a7f6e', fontSize: 11 }}>Loyalty </span>
            <span style={{ fontWeight: 700 }}>{Number(d.loyalty_pct).toFixed(0)}%</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6b6456' }}>
          {d.repeat_buyer_pct != null && <span>↻ {Number(d.repeat_buyer_pct).toFixed(0)}% repeat</span>}
          {d.lapsed_buyer_pct != null  && <span style={{ color: d.lapsed_buyer_pct > 35 ? '#9a1f1f' : '#6b6456' }}>↓ {Number(d.lapsed_buyer_pct).toFixed(0)}% lapsed</span>}
        </div>
        {d.avg_basket_size != null && (
          <div style={{ fontSize: 11, color: '#6b6456' }}>Basket: {Number(d.avg_basket_size).toFixed(1)} items</div>
        )}
        {d.recommended_action && (
          <div style={{ fontSize: 11, color: s.color, fontWeight: 500, lineHeight: 1.4 }}>{d.recommended_action}</div>
        )}
        {d.rationale && (
          <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.rationale}</div>
        )}
      </div>
    </td>
  )
}

function PricingCell({ d }) {
  if (!d) return <td style={cellStyle} />
  const isIncrease = d.direction === 'increase'
  const dirColor = isIncrease ? '#1a7a4a' : '#9a1f1f'
  const dirBg    = isIncrease ? '#f0faf4'  : '#fdf0f0'
  return (
    <td style={{ ...cellStyle, background: dirBg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge
            text={`${isIncrease ? '▲' : '▼'} ${d.direction}`}
            color={dirColor}
            bg={isIncrease ? '#e8f5ed' : '#fde8e8'}
          />
          {d.confidence && (
            <Badge
              text={d.confidence}
              color='#6b6456'
              bg='#f0ece4'
            />
          )}
        </div>
        {d.current_price != null && d.recommended_price != null && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1812' }}>
            ${Number(d.current_price).toFixed(2)}
            <span style={{ color: '#8a7f6e', fontWeight: 400 }}> → </span>
            <span style={{ color: dirColor }}>${Number(d.recommended_price).toFixed(2)}</span>
            {d.delta_pct != null && (
              <span style={{ fontSize: 11, color: dirColor, marginLeft: 4 }}>
                ({d.delta_pct > 0 ? '+' : ''}{Number(d.delta_pct).toFixed(1)}%)
              </span>
            )}
          </div>
        )}
        {d.price_index_current != null && (
          <div style={{ fontSize: 11, color: '#6b6456' }}>
            PI: {d.price_index_current} → <span style={{ color: dirColor }}>{d.price_index_recommended}</span>
          </div>
        )}
        {d.effective_week && (
          <div style={{ fontSize: 11, color: '#8a7f6e' }}>Effective wk {d.effective_week}</div>
        )}
        {d.elasticity_used != null && (
          <div style={{ fontSize: 11, color: '#8a7f6e' }}>
            Elasticity: {Number(d.elasticity_used).toFixed(1)}
          </div>
        )}
        {d.rationale && (
          <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.rationale}</div>
        )}
      </div>
    </td>
  )
}

function PlanogramCell({ d }) {
  if (!d) return <td style={cellStyle} />
  const priColor = { high: '#2a6e3f', medium: '#1a7a4a', low: '#4a9a6a' }[d.priority] || '#2a6e3f'
  const implBg = d.implementation === 'immediate' ? '#e8f5ed' : '#f0faf4'
  return (
    <td style={{ ...cellStyle, background: '#f2fbf5' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge text={d.priority} color={priColor} bg={implBg} />
          <Badge
            text={d.implementation === 'immediate' ? 'Now' : 'Next reset'}
            color={d.implementation === 'immediate' ? '#1a5fa0' : '#6b6456'}
            bg={d.implementation === 'immediate' ? '#dde8ff' : '#f0ece4'}
          />
        </div>
        {d.position_change && (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1812' }}>
            {d.current_position} → {d.recommended_position}
          </div>
        )}
        {d.facing_delta != null && d.facing_delta !== 0 && (
          <div style={{ fontSize: 12, color: d.facing_delta > 0 ? '#1a7a4a' : '#c25000', fontWeight: 500 }}>
            {d.facing_delta > 0 ? '+' : ''}{d.facing_delta} facing{Math.abs(d.facing_delta) > 1 ? 's' : ''}
            {d.current_facings != null ? ` (${d.current_facings} → ${d.recommended_facings})` : ''}
          </div>
        )}
        {d.rationale && <div style={{ fontSize: 11, color: '#6b6456', lineHeight: 1.4 }}>{d.rationale}</div>}
      </div>
    </td>
  )
}

function SummaryBar({ summary }) {
  if (!summary) return null
  const { total_delta_sales, avg_delta_margin_pp, total_delta_pl_pp,
          protected_revenue, revenue_at_risk, incremental_revenue,
          planogram_opportunity, price_index_delta_pp, sku_count } = summary

  const tiles = [
    {
      label: 'Net Sales Impact',
      value: `${total_delta_sales >= 0 ? '+' : '−'}${fmt$(total_delta_sales)}`,
      sub: `${sku_count} SKUs with recommendations`,
      color: total_delta_sales >= 0 ? '#1a7a4a' : '#9a1f1f',
      bg: total_delta_sales >= 0 ? '#f0faf4' : '#fdf0f0',
    },
    {
      label: 'Revenue Protected',
      value: `+${fmt$(protected_revenue)}`,
      sub: 'Supply risk actions',
      color: '#1a7a4a', bg: '#f0faf4',
    },
    {
      label: 'Revenue at Risk',
      value: `${fmt$(revenue_at_risk)}`,
      sub: 'Promo deviations if unaddressed',
      color: '#9a1f1f', bg: '#fdf0f0',
    },
    {
      label: 'Incremental Opportunity',
      value: `+${fmt$(incremental_revenue)}`,
      sub: 'Promo commit if approved',
      color: '#1a5fa0', bg: '#f0f4ff',
    },
    {
      label: 'Planogram Opportunity',
      value: `+${fmt$(planogram_opportunity || 0)}`,
      sub: 'Shelf repositioning & refacing',
      color: '#2a6e3f', bg: '#f2fbf5',
    },
    {
      label: 'Avg Margin Impact',
      value: fmtPP(avg_delta_margin_pp),
      sub: 'Weighted avg pp change',
      color: avg_delta_margin_pp < 0 ? '#c25000' : '#6b6456', bg: '#faf9f6',
    },
    {
      label: 'PL Penetration Δ',
      value: fmtPL(total_delta_pl_pp),
      sub: 'vs category weekly base',
      color: total_delta_pl_pp > 0 ? '#1a7a4a' : total_delta_pl_pp < 0 ? '#c25000' : '#6b6456',
      bg: '#faf9f6',
    },
    {
      label: 'Price Index Δ',
      value: price_index_delta_pp != null && price_index_delta_pp !== 0
        ? `${price_index_delta_pp > 0 ? '+' : ''}${Number(price_index_delta_pp).toFixed(1)} pp`
        : '—',
      sub: 'vs competitors (rev-weighted)',
      color: price_index_delta_pp < 0 ? '#1a7a4a' : price_index_delta_pp > 0 ? '#c25000' : '#6b6456',
      bg: '#f8f4ff',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, marginBottom: 16 }}>
      {tiles.map(t => (
        <div key={t.label} style={{ background: t.bg, border: '1px solid #e8e4dc', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#8a7f6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            {t.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.color, marginBottom: 2 }}>{t.value}</div>
          <div style={{ fontSize: 11, color: '#8a7f6e' }}>{t.sub}</div>
        </div>
      ))}
    </div>
  )
}

const cellStyle = { padding: '10px 12px', borderBottom: '1px solid #f0ece4', verticalAlign: 'top', minWidth: 150 }
const thStyle = {
  padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.08em', color: '#8a7f6e', textTransform: 'uppercase',
  borderBottom: '2px solid #e8e4dc', background: '#faf9f6', whiteSpace: 'nowrap',
}

export default function RecommendationsPanel() {
  const [weeks, setWeeks]   = useState([])
  const [weekId, setWeekId] = useState(null)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/weeks')
      .then(r => r.json())
      .then(d => { setWeeks(d); if (d.length) setWeekId(d[0].week_id) })
      .catch(() => {})
  }, [])

  const load = wid => {
    setLoading(true)
    fetch(`/api/recommendations?week_id=${wid}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { if (weekId) load(weekId) }, [weekId])

  const rows = data?.rows || []
  const filtered =
    filter === 'all'       ? rows :
    filter === 'supply'    ? rows.filter(r => r.supply_risk) :
    filter === 'sku'       ? rows.filter(r => r.sku_management) :
    filter === 'pricing'   ? rows.filter(r => r.pricing) :
    filter === 'monitor'   ? rows.filter(r => r.promo_monitor) :
    filter === 'commit'    ? rows.filter(r => r.promo_commit) :
    filter === 'planogram' ? rows.filter(r => r.planogram) :
                             rows.filter(r => r.loyalty)

  return (
    <div style={{ maxWidth: 1300, margin: '32px auto', padding: '0 20px' }}>

      {/* Header controls */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6', padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: '#8a7f6e', textTransform: 'uppercase', marginBottom: 6 }}>Week</div>
          <select
            value={weekId ?? ''}
            onChange={e => { setWeekId(Number(e.target.value)); setFilter('all') }}
            style={{ border: '1px solid #d4cfc4', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#1a1812', background: '#faf9f6', cursor: 'pointer', minWidth: 280 }}
          >
            {weeks.map(w => (
              <option key={w.week_id} value={w.week_id}>
                Week {w.week_id} — {w.week_start_date} → {w.week_end_date}
              </option>
            ))}
          </select>
        </div>

        {rows.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'all',       label: `All (${rows.length})` },
              { id: 'supply',    label: `Supply Risk (${rows.filter(r => r.supply_risk).length})` },
              { id: 'sku',       label: `SKU Mgmt (${rows.filter(r => r.sku_management).length})` },
              { id: 'pricing',   label: `Pricing (${rows.filter(r => r.pricing).length})` },
              { id: 'monitor',   label: `Promo Monitor (${rows.filter(r => r.promo_monitor).length})` },
              { id: 'commit',    label: `Promo Commit (${rows.filter(r => r.promo_commit).length})` },
              { id: 'planogram', label: `Planogram (${rows.filter(r => r.planogram).length})` },
              { id: 'loyalty',   label: `Loyalty (${rows.filter(r => r.loyalty).length})` },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: filter === f.id ? '#0a1628' : '#d4cfc4',
                background: filter === f.id ? '#0a1628' : 'transparent',
                color: filter === f.id ? '#fff' : '#6b6456',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>{f.label}</button>
            ))}
          </div>
        )}

        {data?.generated_at && (
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8a7f6e' }}>
            Last run: {new Date(data.generated_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {!loading && data?.summary && <SummaryBar summary={data.summary} />}

      {/* Loading */}
      {loading && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6', padding: 40, textAlign: 'center', color: '#8a7f6e' }}>
          Loading…
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6', padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1812', marginBottom: 8 }}>No recommendations yet for this week</div>
          <div style={{ fontSize: 14, color: '#6b6456' }}>
            Go to the <strong>Circe</strong> tab, select this week, and run the modules to generate recommendations.
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && rows.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 220, position: 'sticky', left: 0, zIndex: 2 }}>SKU</th>
                <th style={{ ...thStyle, background: '#fdf0f0' }}>Supply Risk</th>
                <th style={{ ...thStyle, background: '#fdf5f5', minWidth: 170 }}>SKU Mgmt</th>
                <th style={{ ...thStyle, background: '#f8f4ff', minWidth: 200 }}>Pricing</th>
                <th style={{ ...thStyle, background: '#fffaee' }}>Promo Monitor</th>
                <th style={{ ...thStyle, background: '#f0f4ff' }}>Promo Commit</th>
                <th style={{ ...thStyle, background: '#f2fbf5', minWidth: 180 }}>Planogram</th>
                <th style={{ ...thStyle, background: '#f0fbfc', minWidth: 180 }}>Loyalty</th>
                <th style={{ ...thStyle, background: '#f4f8f4', minWidth: 180 }}>Financial Impact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.sku_id} style={{ background: i % 2 === 0 ? '#fff' : '#fdfcfa' }}>
                  <td style={{ ...cellStyle, minWidth: 220, position: 'sticky', left: 0, background: i % 2 === 0 ? '#fff' : '#fdfcfa', zIndex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1a1812', marginBottom: 2 }}>{row.description}</div>
                    <div style={{ fontSize: 11, color: '#8a7f6e' }}>
                      {row.sku_id} · {row.brand} ·{' '}
                      <span style={{ color: row.brand_type === 'PL' ? '#1a7a4a' : '#1a5fa0', fontWeight: 600 }}>{row.brand_type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#b0a898', marginTop: 1 }}>{row.subcategory}</div>
                  </td>
                  <SupplyCell d={row.supply_risk} />
                  <SkuManagementCell d={row.sku_management} />
                  <PricingCell d={row.pricing} />
                  <MonitorCell d={row.promo_monitor} />
                  <CommitCell d={row.promo_commit} />
                  <PlanogramCell d={row.planogram} />
                  <LoyaltyCell d={row.loyalty} />
                  <FinancialCell d={row.financial_impact} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
