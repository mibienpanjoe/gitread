# Gitread — Visual Identity Guide
Version: v1.0, 2026-04-03

---

## Brand Essence

**Name:** Gitread — a portmanteau of "Git" (version control, the source of truth) and "read" (to interpret, to narrate). The name implies the act of reading someone's commit history and translating it into a human story. It is direct, technical, and slightly literary.

**Tagline:** *Your GitHub, read back to you.*

**Personality traits:**
- **Honest** — the data is real; the AI doesn't flatter
- **Sharp** — minimal, dense with signal, no decorative chrome
- **Technical without being cold** — built by developers, for developers, readable by everyone
- **Confident** — archetype labels and strengths are assertive, not hedged

**Design principles:**
1. **Signal over decoration** — every visual element carries meaning (charts, stats, badges); nothing is purely ornamental
2. **Scannable first** — a recruiter must be able to assess a developer in 10 seconds; visual hierarchy must support this
3. **Dark mode native** — developers live in dark mode; the primary experience is dark with an accessible light variant
4. **Typography does the work** — a font system that reads as both technical and polished, without looking like a generic SaaS dashboard

---

## Color System

### Primary Palette

| Token | Name | Hex (Dark) | Hex (Light) | Use |
|-------|------|------------|-------------|-----|
| `--color-primary` | Terminal Green | `#22D3A0` | `#059669` | Primary CTAs, accent highlights, active states |
| `--color-bg` | Ink | `#0D1117` | `#F6F8FA` | Page background |
| `--color-surface` | Deep Slate | `#161B22` | `#FFFFFF` | Card/panel backgrounds |
| `--color-border` | Graphite | `#30363D` | `#D0D7DE` | Card borders, dividers |
| `--color-text-primary` | Snow | `#E6EDF3` | `#1F2328` | Headlines, body text |
| `--color-text-secondary` | Ash | `#7D8590` | `#656D76` | Labels, metadata, timestamps |

The palette is deliberately GitHub-adjacent — developers will feel at home, and the data will look native. Terminal Green (`#22D3A0`) breaks from GitHub's blue as a differentiating accent that reads as "output", "result", "generated".

### Secondary Palette

| Token | Name | Hex | Use |
|-------|------|-----|-----|
| `--color-accent-blue` | Electric Blue | `#58A6FF` | Links, secondary highlights |
| `--color-accent-purple` | Muted Purple | `#BC8CFF` | Archetype badge, AI-generated labels |
| `--color-accent-orange` | Amber | `#F0883E` | Warning states, score indicators (mid-range) |

### Semantic Colors

| Token | Hex (Dark) | Use |
|-------|------------|-----|
| `--color-success` | `#3FB950` | High match scores (≥70), positive trends |
| `--color-warning` | `#D29922` | Mid match scores (40–69), stable trends |
| `--color-error` | `#F85149` | Low match scores (<40), API errors, destructive actions |
| `--color-info` | `#58A6FF` | Informational states, loading indicators |

### Neutral Scale (Dark Mode)

| Token | Hex | Use |
|-------|-----|-----|
| `--neutral-900` | `#0D1117` | Page background |
| `--neutral-800` | `#161B22` | Card background |
| `--neutral-700` | `#21262D` | Hover states, table row backgrounds |
| `--neutral-600` | `#30363D` | Borders |
| `--neutral-400` | `#7D8590` | Secondary text |
| `--neutral-200` | `#C9D1D9` | Tertiary text, chart labels |
| `--neutral-100` | `#E6EDF3` | Primary text |

### CSS Custom Properties (global `:root`)

```css
:root {
  --color-primary: #22D3A0;
  --color-bg: #0D1117;
  --color-surface: #161B22;
  --color-border: #30363D;
  --color-text-primary: #E6EDF3;
  --color-text-secondary: #7D8590;
  --color-accent-purple: #BC8CFF;
  --color-success: #3FB950;
  --color-warning: #D29922;
  --color-error: #F85149;
}

[data-theme="light"] {
  --color-primary: #059669;
  --color-bg: #F6F8FA;
  --color-surface: #FFFFFF;
  --color-border: #D0D7DE;
  --color-text-primary: #1F2328;
  --color-text-secondary: #656D76;
}
```

---

## Typography

| Role | Font | Weights | Source |
|------|------|---------|--------|
| Display | **Geist** | 600, 700 | Vercel/Google Fonts |
| Body | **Inter** | 400, 500, 600 | Google Fonts |
| Monospace | **JetBrains Mono** | 400, 500 | Google Fonts |

**Geist** is chosen for display use: it reads as modern and technical (designed by Vercel), has excellent legibility at large sizes, and pairs well with the dark background. Inter is the industry standard for dense data interfaces — body text, labels, stats. JetBrains Mono is used for usernames, code references, stat values, and anything that should feel like terminal output.

### Type Scale

| Name | Size | Line Height | Font | Use |
|------|------|-------------|------|-----|
| `text-4xl` | 36px | 1.2 | Geist 700 | Hero headings, profile title on landing |
| `text-3xl` | 30px | 1.25 | Geist 600 | Section titles, profile name |
| `text-2xl` | 24px | 1.3 | Geist 600 | Card headers, archetype label |
| `text-xl` | 20px | 1.4 | Inter 600 | Sub-section headers |
| `text-lg` | 18px | 1.5 | Inter 500 | Lead body text, card summaries |
| `text-base` | 16px | 1.6 | Inter 400 | Standard body copy |
| `text-sm` | 14px | 1.5 | Inter 400 | Secondary text, labels, chart annotations |
| `text-xs` | 12px | 1.4 | Inter 400 | Metadata, timestamps, captions |
| `mono-base` | 15px | 1.5 | JetBrains Mono 400 | Usernames, stat values, language names |
| `mono-sm` | 13px | 1.4 | JetBrains Mono 400 | Inline code, IDs |

---

## Spacing & Layout

**Base unit:** 4px (`--spacing-1: 4px`)

| Token | Value | Use |
|-------|-------|-----|
| `--spacing-1` | 4px | Minimum gap, icon padding |
| `--spacing-2` | 8px | Tight component padding |
| `--spacing-3` | 12px | Standard inline spacing |
| `--spacing-4` | 16px | Card internal padding |
| `--spacing-6` | 24px | Section gaps |
| `--spacing-8` | 32px | Large section separation |
| `--spacing-12` | 48px | Page section breaks |
| `--spacing-16` | 64px | Hero padding |

**Responsive breakpoints (Tailwind defaults):**
| Name | Min-width | Target |
|------|-----------|--------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Standard desktops |

**Maximum content width:** 1200px, centered.
**Profile page column layout:** Single column on mobile → two-column grid on `lg` (left: profile card + stats; right: charts + repos).

---

## Component Styling

### Buttons

**Primary (CTA):**
```css
background: var(--color-primary);
color: #0D1117;
font: Inter 600 15px;
border-radius: 6px;
padding: 10px 20px;
transition: background 150ms ease;

:hover { background: #1ab889; }
:focus-visible { box-shadow: 0 0 0 3px rgba(34, 211, 160, 0.3); outline: none; }
:disabled { opacity: 0.4; cursor: not-allowed; }
```

**Secondary (outlined):**
```css
background: transparent;
border: 1px solid var(--color-border);
color: var(--color-text-primary);
border-radius: 6px;
padding: 10px 20px;

:hover { background: var(--neutral-700); border-color: var(--color-text-secondary); }
```

**Ghost (text action):**
```css
background: transparent;
color: var(--color-accent-blue);
padding: 6px 12px;
:hover { background: rgba(88, 166, 255, 0.1); }
```

---

### Cards

Profile cards, repo cards, and stat panels share a common card style:
```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 20px;
```

Cards do not use shadows in dark mode (shadows are invisible on dark backgrounds). In light mode:
```css
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

---

### Archetype Badge

The developer archetype gets a distinct badge treatment — it should feel special, not like a tag:
```css
background: rgba(188, 140, 255, 0.12);
border: 1px solid rgba(188, 140, 255, 0.3);
color: #BC8CFF;
border-radius: 20px;
padding: 6px 16px;
font: Inter 600 14px;
letter-spacing: 0.01em;
```

---

### Inputs & Search

The GitHub username search input on the landing page is a central, prominent element:
```css
background: var(--color-surface);
border: 1.5px solid var(--color-border);
border-radius: 8px;
padding: 14px 16px 14px 44px;   /* left padding for icon */
font: JetBrains Mono 400 16px;
color: var(--color-text-primary);
width: 100%; max-width: 480px;

:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(34, 211, 160, 0.15);
  outline: none;
}
::placeholder { color: var(--color-text-secondary); }
```

A monospace font is used for the username input to reinforce the terminal aesthetic and make username typing feel native.

---

### Charts (Recharts)

**Language donut chart:**
- Size: 160px diameter on desktop, 120px on mobile
- No legend below the chart — language labels float alongside the slices
- Colors: cycle through `[#22D3A0, #58A6FF, #BC8CFF, #F0883E, #3FB950, #D29922, #F85149]`
- Center label: top language name in JetBrains Mono 14px

**Activity heatmap (90-day commit chart):**
- Style: vertical bar chart, not a GitHub-style grid (bar chart is more readable at small sizes)
- Bar color: `var(--color-primary)` at full opacity for days with commits; `var(--color-border)` for zero-commit days
- No x-axis labels on mobile — only show every 2 weeks; show weekly on desktop
- Tooltip: `"3 commits on Jan 4"` in Inter 13px

---

### Job Match Score Indicator

The 0–100 score is rendered as a large numeric display with a color-coded ring:
- Score ≥ 70: `--color-success` ring and text
- Score 40–69: `--color-warning` ring and text
- Score < 40: `--color-error` ring and text

The number is rendered in Geist 700 at 48px. The ring is an SVG circle with `stroke-dashoffset` driven by the score value.

---

## Motion & Animation

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | 100ms | Hover state colour transitions |
| `--duration-base` | 200ms | Button press, input focus ring |
| `--duration-slow` | 300ms | Modal/panel open, skeleton fade-in |
| `--duration-chart` | 600ms | Chart entry animation |
| `--easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `--easing-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Elements transitioning on-screen |

**Key animations:**
- Profile card fade-up on load: `opacity 0→1, translateY 12px→0`, 300ms, `--easing-out`
- Chart bars animate up from baseline: 600ms staggered, `--easing-out`
- Score ring fills from 0 to final value: 800ms, `--easing-out`
- Skeleton loading shimmer: `background-position` animation, 1.5s infinite

**`prefers-reduced-motion`:** All animations MUST be disabled (set `transition: none`, `animation: none`) when `prefers-reduced-motion: reduce` is detected.

---

## Page-Level Patterns

### Landing Page (`/`)

```
┌─────────────────────────────────────────┐
│  [Gitread logo]              [GitHub ↗] │  ← 64px header
├─────────────────────────────────────────┤
│                                         │
│      Your GitHub,                       │  ← Hero, centered
│      read back to you.                  │     Geist 700, 48px
│                                         │
│  [🔍 Enter a GitHub username ________]  │  ← Search input, max-w-480px
│              [Generate Profile →]       │  ← Primary button
│                                         │
│  ── Or try an example ──────────────── │
│  [torvalds]  [sindresorhus]  [gaearon]  │  ← Clickable username chips
│                                         │
└─────────────────────────────────────────┘
```

Background: subtle dot grid pattern at 5% opacity on `--color-bg`.

### Profile Page (`/u/{username}`)

Desktop layout (2-column grid, 1fr 2fr):
```
┌──────────────────┬───────────────────────────┐
│ [Avatar]         │ [Language Donut Chart]    │
│ @username        │ [Activity Heatmap]        │
│ [Archetype Badge]│                           │
│ [Title]          ├───────────────────────────┤
│ [Bio]            │ Top Repositories          │
│ [Strengths list] │ [Repo Card × 5]           │
├──────────────────┤                           │
│ Stats at a Glance│                           │
│ ★ stars  🍴 forks│                           │
│ 📁 repos  🗓 age  │                           │
├──────────────────┤                           │
│ Skill Progression│                           │
│ [Progress bar]   │                           │
├──────────────────┤                           │
│ Suggested Project│                           │
│ [Callout block]  │                           │
└──────────────────┴───────────────────────────┘
│          Job Description Match              │  ← Full-width panel
│  [Paste job description _______________]    │
│  [Score it →]                               │
└─────────────────────────────────────────────┘
```

Mobile: single column, same section order.

---

## Accessibility Checklist

- [ ] All body text meets WCAG 2.1 AA contrast ratio (4.5:1 minimum). `--color-text-primary` on `--color-bg` is 14.5:1 in dark mode.
- [ ] Large text (≥18px or bold ≥14px) meets 3:1 contrast minimum
- [ ] All interactive elements (buttons, inputs, links) have visible `:focus-visible` indicators with 3px offset ring
- [ ] Touch targets are ≥ 44×44px on all mobile interactive elements
- [ ] Color is never the sole indicator of state — score level uses color + numeric value + label text
- [ ] Chart colors are distinguishable for common color vision deficiencies (no red/green-only pairs as sole differentiators)
- [ ] All `<img>` elements have meaningful `alt` text; avatar images use `alt="{username}'s GitHub avatar"`
- [ ] `prefers-reduced-motion` disables all animations (see Motion section above)
- [ ] Semantic HTML used throughout: `<main>`, `<section>`, `<article>` for profile sections, `<nav>` for header, `<button>` for actions
- [ ] Chart data is also available in text form (screen reader accessible table or aria-label) — charts are visual enhancements, not the only data source

---

## Language & Tone Guidelines

**AI-generated content tone:** Direct, specific, non-hedged. Say "Systems programmer specialising in low-level C and kernel development" not "appears to work with C and may have experience in systems programming". The profile reads as a confident narrator, not a cautious algorithm.

**UI copy tone:** Minimal. Labels are nouns ("Strengths", "Top Repos", "Match Score"). CTAs are verb phrases ("Generate Profile", "Score It", "Share Profile"). No filler copy ("Please wait while we analyse your profile..."). Errors are actionable ("GitHub user not found — check the spelling and try again").

**Archetype labels:** Title-case, always prefixed with "The". Examples: "The Fullstack Shipper", "The CLI Craftsman", "The Open Source Contributor", "The Systems Architect", "The Data Engineer", "The Framework Builder". They should feel like a D&D character class — memorable and specific.
