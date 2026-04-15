const RESET_AGENTS = [
  {
    id: 'competitive_intel',
    index: '0',
    label: 'Competitive Intelligence',
    color: '#1a3a5c',
    bg: '#f0f4f8',
    border: '#c0d0e0',
    description: 'Full competitor assortment scan · price architecture · shelf strategy · promotional cadence',
    modules: [
      {
        id: 'comp_assortment',
        label: 'Assortment Benchmarking',
        description: 'Compare Kroger range depth vs Walmart, Target, Aldi per subcategory. Identify exclusive items, gaps, and overlap.',
      },
      {
        id: 'comp_pricing',
        label: 'Price Architecture Audit',
        description: 'Map competitor price ladders across segments. Identify where Kroger is structurally over- or under-priced vs the market.',
      },
      {
        id: 'comp_promo',
        label: 'Promo & Shelf Intelligence',
        description: 'Analyse competitor promotional frequency, depth, and featured placement. Spot patterns in display and endcap use.',
      },
    ],
  },
  {
    id: 'assortment',
    index: '1',
    label: 'Assortment Agent',
    color: '#9a1f1f',
    bg: '#fdf0f0',
    border: '#f5c6c6',
    description: 'Full range review · new item evaluation · delist decisions · PL expansion plan',
    modules: [
      {
        id: 'reset_range_review',
        label: 'Range Review',
        description: 'Score every SKU on velocity trend, margin contribution, and space productivity. Produce a prioritised delist shortlist and gap analysis.',
      },
      {
        id: 'reset_new_items',
        label: 'New Item Pipeline',
        description: 'Evaluate vendor submissions and market innovations. Recommend new listings with forecast velocity and margin, mapped to identified gaps.',
      },
    ],
  },
  {
    id: 'pricing',
    index: '2',
    label: 'Pricing Agent',
    color: '#5a2d82',
    bg: '#f8f4ff',
    border: '#d8c8f5',
    description: 'Full price architecture reset · price ladder design · PL–NB gap calibration · large moves >10%',
    modules: [
      {
        id: 'reset_price_arch',
        label: 'Price Architecture',
        description: 'Design the category price ladder across segments. Identify structural gaps or compressions that undermine value communication.',
      },
      {
        id: 'reset_price_moves',
        label: 'Significant Price Moves',
        description: 'Evaluate price changes exceeding the weekly ±10% cap. Model revenue, margin, and price index impact at reset cadence.',
      },
    ],
  },
  {
    id: 'planogram',
    index: '3',
    label: 'Planogram Agent',
    color: '#2a6e3f',
    bg: '#f2fbf5',
    border: '#b8dfc8',
    description: 'Full shelf reset · space allocation by subcategory · new layout design · modular flow',
    modules: [
      {
        id: 'reset_space_alloc',
        label: 'Space Reallocation',
        description: 'Rebalance linear feet across subcategories based on revenue per foot, growth trend, and strategic priority from the CM brief.',
      },
      {
        id: 'reset_layout',
        label: 'Layout Design',
        description: 'Propose the optimal planogram layout: adjacencies, flow, feature slots, and PL shelf placement target.',
      },
    ],
  },
  {
    id: 'promotions',
    index: '4',
    label: 'Promotions Agent',
    color: '#a05c00',
    bg: '#fffaee',
    border: '#f0d8a0',
    description: 'Full promotional calendar design · vendor co-funding negotiation · event sequencing',
    modules: [
      {
        id: 'reset_promo_calendar',
        label: 'Promo Calendar',
        description: 'Build the promotional calendar for the next period. Sequence events to avoid cannibalization, balance NB and PL, and maximise incremental revenue.',
      },
      {
        id: 'reset_vendor_funding',
        label: 'Vendor Funding Plan',
        description: 'Model vendor co-funding requirements. Identify which events need vendor support and flag strategic negotiations.',
      },
    ],
  },
  {
    id: 'loyalty',
    index: '5',
    label: 'Loyalty Agent',
    color: '#0a6e7a',
    bg: '#f0fbfc',
    border: '#a0d8e0',
    description: 'Customer segment strategy · loyalty programme integration · personalised offer planning',
    modules: [
      {
        id: 'reset_loyalty_segments',
        label: 'Segment Strategy',
        description: 'Profile the key loyalty segments buying this category. Recommend how the reset assortment, pricing, and promos should be tuned per segment.',
      },
      {
        id: 'reset_loyalty_offers',
        label: 'Personalised Offer Plan',
        description: 'Design the loyalty offer calendar for the reset period. Map SKUs to segments, set offer depths, and model incremental loyalty revenue.',
      },
    ],
  },
]

export default function CategoryResetPanel() {
  return (
    <div style={{ maxWidth: 1300, margin: '32px auto', padding: '0 20px 60px' }}>

      {/* Page header */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0ddd6', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8a7f6e', textTransform: 'uppercase', marginBottom: 6 }}>
              Category Reset
            </div>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 24, fontWeight: 400, color: '#1a1812', margin: 0, marginBottom: 6 }}>
              Quarterly Reset Workspace
            </h2>
            <p style={{ fontSize: 14, color: '#6b6456', margin: 0, maxWidth: 680, lineHeight: 1.6 }}>
              Agents for structured quarterly category reviews. Each agent performs a deeper, longer-horizon analysis than the weekly run — incorporating competitor intelligence, structural price moves, full planogram resets, and promotional calendar design.
            </p>
          </div>
          <div style={{ background: '#fffaee', border: '1px solid #f0d8a0', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#a05c00', fontWeight: 500, whiteSpace: 'nowrap' }}>
            ⚠ Agents not yet configured
          </div>
        </div>
      </div>

      {/* Agent sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {RESET_AGENTS.map(group => (
          <div key={group.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${group.border}`, overflow: 'hidden' }}>

            {/* Group header */}
            <div style={{ background: group.bg, borderBottom: `1px solid ${group.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: group.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {group.index}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.label}</div>
                <div style={{ fontSize: 12, color: '#6b6456', marginTop: 1 }}>{group.description}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                  border: `1.5px solid ${group.border}`, fontSize: 11,
                  color: '#8a7f6e', fontWeight: 500,
                }}>
                  Not configured
                </span>
              </div>
            </div>

            {/* Sub-agent cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.modules.length}, 1fr)`, gap: 0 }}>
              {group.modules.map((mod, idx) => (
                <div key={mod.id} style={{
                  borderLeft: idx > 0 ? `1px solid ${group.border}` : 'none',
                  padding: 0,
                }}>
                  {/* Sub-agent label bar */}
                  <div style={{
                    background: group.color, color: '#fff',
                    padding: '5px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                  }}>
                    {mod.label}
                  </div>

                  {/* Placeholder body */}
                  <div style={{
                    background: '#0a1628',
                    minHeight: 200,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    {/* Description */}
                    <p style={{ fontSize: 12, color: '#8a9ab8', lineHeight: 1.7, margin: 0 }}>
                      {mod.description}
                    </p>

                    {/* Placeholder state */}
                    <div style={{
                      marginTop: 20,
                      borderTop: '1px solid #1e2e48',
                      paddingTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#4a5a78',
                      }} />
                      <span style={{ fontSize: 11, color: '#4a5a78', fontFamily: 'monospace' }}>
                        Agent not yet configured — run will be available at next release
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}
