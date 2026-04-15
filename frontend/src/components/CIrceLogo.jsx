/**
 * Circe brand logo — CIRCE wordmark in Georgian serif with eagle wings
 * rising from the top of the final E.
 *
 * Props:
 *   width  – display width in px (height scales proportionally)
 *   color  – fill colour (defaults to brand gold)
 */
export default function CIrceLogo({ width = 200, color = '#e8a020' }) {
  const height = Math.round(width * 108 / 316)

  return (
    <svg
      viewBox="0 0 316 108"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Circe"
    >
      {/*
        ── Wings ──────────────────────────────────────────────────────
        Centred above the E (≈ x 194, y 32 = top of 58 px letters).
        Three feather tiers per side, each a separate filled path so
        the layering is visible. Inner tiers fade slightly for depth.
      */}
      <g transform="translate(194,32)" fill={color}>

        {/* ── Right wing ── */}

        {/* Tier 1 – primary feathers (longest, outermost) */}
        <path d="
          M  2, 0
          C 16,-8  40,-20  66,-28
          C 52,-16  36, -6  24, 0
          Z
        "/>

        {/* Tier 2 – secondary feathers */}
        <path opacity="0.82" d="
          M  6, 0
          C 20,-5  40,-13  60,-17
          C 48, -8  32, -2  20, 0
          Z
        "/>

        {/* Tier 3 – inner coverts */}
        <path opacity="0.62" d="
          M 12, 0
          C 22,-3  36, -7  48, -8
          C 38, -2  26,  1  16,  0
          Z
        "/>

        {/* ── Left wing (mirror) ── */}

        <path d="
          M  -2, 0
          C -16,-8 -40,-20 -66,-28
          C -52,-16 -36, -6 -24, 0
          Z
        "/>

        <path opacity="0.82" d="
          M  -6, 0
          C -20,-5 -40,-13 -60,-17
          C -48, -8 -32, -2 -20, 0
          Z
        "/>

        <path opacity="0.62" d="
          M -12, 0
          C -22,-3 -36, -7 -48, -8
          C -38, -2 -26,  1 -16,  0
          Z
        "/>

        {/* Wing-root jewel */}
        <ellipse cx="0" cy="-1" rx="5" ry="4"/>
      </g>

      {/*
        ── Wordmark ───────────────────────────────────────────────────
        Georgia gives the classical Roman gravitas that suits the name.
        Letter-spacing 6 opens the word up without losing compactness.
      */}
      <text
        x="14"
        y="92"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="58"
        fontWeight="700"
        fill={color}
        letterSpacing="6"
      >CIRCE</text>

      {/*
        ── Hairline rule beneath the wordmark ─────────────────────────
        A single fine line gives the mark a finished, editorial quality.
      */}
      <line x1="14" y1="98" x2="300" y2="98" stroke={color} strokeWidth="1" opacity="0.45"/>
    </svg>
  )
}
