const MODULES = [
  {
    id: 'supply_risk',
    label: 'Supply Risk',
    color: '#9a1f1f',
    bg: '#fdf0f0',
    what: 'Scores every SKU for out-of-stock risk each week and recommends reorders before stockouts happen.',
    cadence: 'Daily',
    inputs: [
      'Units on hand & units on order',
      'Vendor lead time & historical fill rate',
      'Rolling 4-week and 12-week velocity',
      'Upcoming promotions (next 8 weeks)',
      'Safety stock policy from CM brief',
    ],
    algorithm: 'Rule-based risk scoring (0–10) driven by days of supply vs vendor lead time, promo uplift adjustment, and chronic fragility flags. The agent interprets the scores and writes reorder recommendations.',
    output: 'Risk level + recommended order quantity per SKU',
    autonomy: 'Can auto-execute orders when risk ≥ 8 and autonomy is set to Auto in the CM brief. Always escalates strategic vendors.',
  },
  {
    id: 'sku_agent',
    label: 'SKU Management',
    color: '#6b2a2a',
    bg: '#fdf5f5',
    what: 'Reviews the active range every week to identify declining SKUs, range gaps, and PL penetration shortfalls — giving the CM an early signal before issues become structural.',
    cadence: 'Weekly',
    inputs: [
      'Rolling 12-week velocity per SKU vs same period prior year',
      'Gross margin % and revenue contribution ranking',
      'Space share vs revenue share by subcategory',
      'PL revenue penetration vs CM brief target per subcategory',
      'OOS rate (flags supply-fragile SKUs before delisting)',
    ],
    algorithm: 'Computes YoY velocity change per SKU using the most recent 12 weeks vs the equivalent prior-year window. Flags delist candidates (velocity down >15% YoY, below-median margin, not PL). Identifies range gaps by comparing subcategory revenue share vs space share. Calculates PL penetration per subcategory and flags where it trails the brief target by >5pp.',
    output: 'Per-SKU recommendation (delist / invest / monitor) with reason code, YoY velocity change, margin, and one-sentence rationale',
    autonomy: 'Never auto-executes delistings. All recommendations require CM review. Delist proposals flagged to buying team before actioning.',
  },
  {
    id: 'pricing',
    label: 'Pricing Advisor',
    color: '#5a2d82',
    bg: '#f8f4ff',
    what: 'Recommends everyday price changes (EDLP) 4–8 weeks out by combining price elasticity estimates with competitor price intelligence and CM brief strategy guardrails.',
    cadence: 'Weekly',
    inputs: [
      '52-week price/volume history per SKU (non-promo, non-OOS weeks)',
      'Competitor prices: Walmart, Target, Aldi (latest non-promo scrape)',
      'CM brief: price position target, max price index, PL-to-NB gap policy',
      'Pack size and segment (controls for non-price volume drivers)',
      'Season and holiday flags (elasticity controls)',
    ],
    algorithm: 'Per-SKU log-log OLS regression on non-promo, non-holiday, non-OOS weeks with within-season de-meaning (removes seasonality fixed effects). Slope = price elasticity. Falls back to subcategory industry priors when fewer than 6 clean observations. Price index = Kroger price ÷ avg competitor price × 100. Circe compares index to CM brief max (105) and recommends changes where expected weekly revenue or margin delta > threshold.',
    output: 'Per-SKU: current vs recommended price, % change, effective week, price index move, elasticity used, rationale',
    autonomy: 'Never auto-executes. CM must approve every price change. Changes capped at ±10% per cycle; larger moves deferred to category reset.',
  },
  {
    id: 'promo_monitor',
    label: 'Promo Monitor',
    color: '#a05c00',
    bg: '#fffaee',
    what: 'Checks that active promotions are live and tracking to forecast — flags deviations early so the CM can act before revenue is lost.',
    cadence: 'Daily',
    inputs: [
      'Actual units sold vs forecast lift this week',
      'Average sell price vs committed promo price',
      'Stock on hand vs remaining promo days',
      'Competitor pricing (counter-promo check)',
      'Base velocity (rolling 4-week average)',
    ],
    algorithm: 'Deviation detection: compares actual lift vs forecast lift (±15% threshold), checks price is live (sell price ≤ promo price × 1.05), verifies stock covers remaining promo days × 1.5 safety factor. The agent quantifies revenue at risk and writes the deviation report.',
    output: 'Deviation type + severity + revenue at risk per active promo SKU',
    autonomy: 'Never auto-executes. Always notifies the CM. Escalates if revenue at risk > $5,000 or a strategic vendor promo is affected.',
  },
  {
    id: 'promo_commit',
    label: 'Promo Commit',
    color: '#1a5fa0',
    bg: '#f0f4ff',
    what: 'Recommends which SKUs to promote and with what mechanic for open promo slots 8–12 weeks out, ranked against the CM brief guardrails.',
    cadence: 'Weekly',
    inputs: [
      'Historical lift by SKU, mechanic, discount depth and season',
      'Projected supply position at target promo week',
      'Competitor pricing context',
      'CM brief: preferred mechanics, budget remaining, min lift, min margin',
      'Existing promo calendar (no conflicts)',
      'Past CM decisions and rejection reasons',
    ],
    algorithm: 'Candidate SKUs are filtered through CM brief guardrails (min lift multiplier, min promo margin, max cannibalization, budget check). Passing candidates are ranked by CM brief mechanic preference. The agent ranks the top options, references past rejection patterns, and explains the trade-off vs annual targets.',
    output: 'Top 3–5 ranked promo options with mechanic, forecast lift, margin impact and budget effect',
    autonomy: 'Never auto-executes. CM must approve every commitment. Director escalation triggered if budget impact > $50,000 or a strategic vendor is involved.',
  },
  {
    id: 'planogram',
    label: 'Planogram Advisor',
    color: '#2a6e3f',
    bg: '#f2fbf5',
    what: 'Monitors shelf facing efficiency weekly and recommends repositions and refacings — separating quick micro-adjustments from structural changes that require a full reset.',
    cadence: 'Weekly (decide quarterly)',
    inputs: [
      'Current facings and shelf position per SKU (top/middle/bottom)',
      'Revenue per facing vs category average',
      'Rolling 4-week velocity and OOS rate',
      'Category space context (linear feet, sections, next reset date)',
      'Position visibility multipliers (eye-level 1.0×, top 0.65×, bottom 0.45×)',
      'Reset cost context ($50 micro-adjustment, $500 full reset)',
    ],
    algorithm: 'Scores each SKU on revenue-per-facing vs category average, position visibility match to velocity, and OOS rate. Flags misplacements (high-velocity SKUs on bottom/top shelf) and facing imbalances. Screens changes against reset cost: only recommends if projected annual revenue uplift > 3× reset cost. Separates immediate micro-adjustments from next-reset structural changes.',
    output: 'Per-SKU: facing delta, position change, implementation timing (immediate vs next reset), weekly revenue impact and rationale',
    autonomy: 'Never auto-executes. CM approves all changes. Micro-adjustments (1–2 SKUs, ≈$50 cost) presented separately from full reset recommendations.',
  },
  {
    id: 'loyalty',
    label: 'Loyalty Analyzer',
    color: '#0a6e7a',
    bg: '#f0fbfc',
    what: 'Analyses loyalty card purchase behaviour to identify retention risks, acquisition signals, and category anchors — then recommends loyalty-targeted actions per SKU.',
    cadence: 'Weekly',
    inputs: [
      'Loyalty card units and revenue per SKU (last 4 weeks)',
      'Buyer type split: new, repeat (re-bought within 4 weeks), lapsed (5–12 week gap)',
      'Average basket size (category items per transaction)',
      'Loyalty penetration trend vs prior 4-week period',
    ],
    algorithm: 'Classifies each SKU into one of four signals: Anchor (repeat rate >65% — habitual purchase, defend position), Acquisition (new buyer % elevated — trial behaviour), Retention Risk (lapsed buyer % >35% — switching or stopping), Basket Builder (high avg basket size — cross-sell driver). The agent prioritises SKUs with the sharpest signal and recommends loyalty programme actions.',
    output: 'Per-SKU loyalty signal, buyer type breakdown, avg basket size, and a specific loyalty action recommendation',
    autonomy: 'Never auto-executes. All loyalty offer recommendations require CM approval. Personalised offer designs are flagged to the loyalty programme team.',
  },
]

const ROWS = [
  { key: 'what',      label: 'What it does' },
  { key: 'cadence',   label: 'Runs' },
  { key: 'inputs',    label: 'Inputs' },
  { key: 'algorithm', label: 'Algorithm' },
  { key: 'output',    label: 'Output' },
  { key: 'autonomy',  label: 'Autonomy' },
]

export default function AgentOverview() {
  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px 60px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8a7f6e', textTransform: 'uppercase', marginBottom: 8 }}>
          How it works
        </div>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 32, fontWeight: 400, color: '#1a1812', marginBottom: 12, lineHeight: 1.2 }}>
          Five Agents · Seven Modules
        </h1>
        <p style={{ fontSize: 15, color: '#6b6456', maxWidth: 680, lineHeight: 1.7 }}>
          The agent runs seven independent modules grouped into five capability areas:
          Assortment, Pricing, Planogram, Promotions, and Loyalty.
          Deterministic rules extract the signal from the database — Circe adds judgement,
          context and language the category manager can act on.
        </p>
      </div>

      {/* Comparison table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e0ddd6', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...thBase, width: 140, background: '#faf9f6', borderRight: '2px solid #e8e4dc' }} />
              {MODULES.map(m => (
                <th key={m.id} style={{ ...thBase, background: m.bg, borderRight: '1px solid #e8e4dc' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                      background: m.color, color: '#fff', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{m.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => (
              <tr key={row.key} style={{ background: ri % 2 === 0 ? '#fff' : '#fdfcfa' }}>
                <td style={{
                  ...tdBase,
                  fontWeight: 600, fontSize: 11, color: '#8a7f6e',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  background: ri % 2 === 0 ? '#faf9f6' : '#f5f3ef',
                  borderRight: '2px solid #e8e4dc',
                  whiteSpace: 'nowrap',
                }}>
                  {row.label}
                </td>
                {MODULES.map(m => (
                  <td key={m.id} style={{ ...tdBase, borderRight: '1px solid #f0ece4' }}>
                    {Array.isArray(m[row.key]) ? (
                      <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8, color: '#3d3628' }}>
                        {m[row.key].map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    ) : row.key === 'cadence' ? (
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                        background: m.bg, color: m.color,
                        fontSize: 12, fontWeight: 600, border: `1px solid ${m.color}33`,
                      }}>{m[row.key]}</span>
                    ) : row.key === 'autonomy' ? (
                      <div style={{ color: '#3d3628', lineHeight: 1.6 }}>
                        {m[row.key].split('. ').map((sentence, i, arr) => (
                          <span key={i}>
                            {sentence}{i < arr.length - 1 ? '. ' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#3d3628', lineHeight: 1.6 }}>{m[row.key]}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Time horizon diagram */}
      <div style={{ marginTop: 32, background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6', padding: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8a7f6e', textTransform: 'uppercase', marginBottom: 24 }}>
          Time horizons
        </div>

        {/* Column headers: Now / +2wks / +8wks / +12wks */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: 0, marginBottom: 8 }}>
          <div />
          {['Now — this week', '+2 weeks', '+8 weeks', '+12 weeks'].map(label => (
            <div key={label} style={{ fontSize: 11, fontWeight: 600, color: '#1a1812', textAlign: 'center', paddingBottom: 8, borderBottom: '2px solid #e8e4dc' }}>
              {label}
            </div>
          ))}
        </div>

        {/* Continuous axis line */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: 0, marginBottom: 16 }}>
          <div />
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: 3, background: '#e8e4dc', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#0a1628', transform: 'translateX(-50%)' }} />
            </div>
          ))}
        </div>

        {/* Module bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              label: 'Supply Risk',
              color: '#9a1f1f', bg: '#fdf0f0',
              colStart: 2, colSpan: 2,
              desc: 'Reorder now — prevent OOS in the next 1–2 weeks',
            },
            {
              label: 'SKU Management',
              color: '#6b2a2a', bg: '#fdf5f5',
              colStart: 2, colSpan: 2,
              desc: 'Weekly range review — flag declining SKUs and PL gaps',
            },
            {
              label: 'Promo Monitor',
              color: '#a05c00', bg: '#fffaee',
              colStart: 2, colSpan: 2,
              desc: 'Active this week — is the live promo on track?',
            },
            {
              label: 'Promo Commit',
              color: '#1a5fa0', bg: '#f0f4ff',
              colStart: 4, colSpan: 2,
              desc: 'Plan and commit promo events 8–12 weeks out',
            },
            {
              label: 'Planogram',
              color: '#2a6e3f', bg: '#f2fbf5',
              colStart: 2, colSpan: 4,
              desc: 'Monitor weekly · decide at quarterly reset (structural changes every ~13 weeks)',
            },
            {
              label: 'Loyalty',
              color: '#0a6e7a', bg: '#f0fbfc',
              colStart: 2, colSpan: 2,
              desc: 'Weekly buyer behaviour — anchor, acquisition, retention risk signals',
            },
            {
              label: 'Pricing',
              color: '#5a2d82', bg: '#f8f4ff',
              colStart: 3, colSpan: 3,
              desc: 'Recommend EDLP changes effective 4–8 weeks out · max ±10% per cycle',
            },
          ].map(bar => (
            <div key={bar.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: 0, alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: bar.color, paddingRight: 12, textAlign: 'right' }}>
                {bar.label}
              </div>
              {[1,2,3,4].map(col => (
                col >= bar.colStart && col < bar.colStart + bar.colSpan ? (
                  col === bar.colStart ? (
                    <div key={col} style={{
                      gridColumn: `span ${bar.colSpan}`,
                      background: bar.bg,
                      border: `1.5px solid ${bar.color}55`,
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      color: bar.color,
                      fontWeight: 500,
                    }}>
                      {bar.desc}
                    </div>
                  ) : null
                ) : (
                  <div key={col} />
                )
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0ece4', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { color: '#9a1f1f', label: 'Supply Risk — daily, short horizon' },
            { color: '#6b2a2a', label: 'SKU Management — weekly, range health review' },
            { color: '#a05c00', label: 'Promo Monitor — daily, current week' },
            { color: '#1a5fa0', label: 'Promo Commit — weekly, long horizon' },
            { color: '#2a6e3f', label: 'Planogram Advisor — weekly monitor, quarterly decision' },
            { color: '#0a6e7a', label: 'Loyalty Analyzer — weekly, buyer behaviour signals' },
            { color: '#5a2d82', label: 'Pricing Advisor — weekly, effective 4–8 weeks out' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
              <span style={{ fontSize: 12, color: '#6b6456' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const thBase = {
  padding: '16px 18px',
  textAlign: 'left',
  borderBottom: '2px solid #e8e4dc',
  verticalAlign: 'bottom',
}

const tdBase = {
  padding: '14px 18px',
  verticalAlign: 'top',
  borderBottom: '1px solid #f0ece4',
  lineHeight: 1.6,
}
