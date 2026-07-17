# Product Requirements Document — Portfolio Website

> **Version:** 1.0  
> **Date:** July 17, 2026  
> **Stack:** Astro (Static) · Tailwind CSS v4 · GSAP (Core + ScrollTrigger)  
> **Status:** Draft — awaiting approval

---

## 1. Overview

A **developer portfolio website** built with Astro, designed to showcase software engineering work with an emphasis on **performance**, **smoothness**, and **minimalist aesthetics**. Styling is handled by **Tailwind CSS v4** (CSS-first config, automatic tree-shaking). Animations are powered by **GSAP Core + ScrollTrigger** — loaded selectively per page to keep the JS footprint minimal.

### Design Philosophy

| Principle | Implementation |
|---|---|
| **Performance-first** | Static HTML, optimized images via `astro:assets`, preloaded fonts, selective JS loading |
| **Lightweight** | Tailwind v4 (tree-shaken, CSS-first — no JS config). GSAP loaded only where animations exist — no global bundle |
| **Minimalist** | Monochrome palette with a single accent, generous whitespace, restrained typography |
| **Smooth** | GSAP ScrollTrigger for scroll-driven reveals, View Transitions API for page navigation, CSS micro-interactions |

---

## 2. Target Audience

- **Recruiters & hiring managers** evaluating engineering candidates
- **Potential collaborators** or clients assessing technical capability
- **Peers & community** discovering open-source or technical writing

---

## 3. Site Structure

```
/                  → Home (single-page with all sections)
/projects/[slug]   → Individual project detail page
```

### 3.1 Sections (Home Page — Single Scroll)

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero** | Name, title, one-liner tagline, primary CTA (e.g. "View my work") |
| 2 | **About** | Brief bio (2–3 paragraphs), professional photo, personality |
| 3 | **Projects** | Grid/list of featured projects with thumbnail, title, short description, tech tags |
| 4 | **Experience / Timeline** | Chronological career history — company, role, dates, bullet highlights |
| 5 | **Tech Stack** | Visual grid of technologies/tools with proficiency indication |
| 6 | **Contact** | Contact form or mailto CTA, social links (GitHub, LinkedIn, etc.) |

### 3.2 Project Detail Page (`/projects/[slug]`)

| Element | Description |
|---|---|
| Hero image/video | Full-width visual of the project |
| Overview | What the project is and why it was built |
| Tech stack | Technologies used, with rationale |
| Key features | Bulleted highlights |
| Challenges & solutions | 1–2 interesting engineering problems solved |
| Links | Live demo, source code, case study |
| Navigation | ← Previous / Next → project links |

---

## 4. Design Specification

### 4.1 Color Palette

```
--color-bg:           #0A0A0A       (near-black background)
--color-bg-elevated:  #141414       (cards, elevated surfaces)
--color-bg-subtle:    #1A1A1A       (section alternation)
--color-text:         #E8E8E8       (primary text)
--color-text-muted:   #888888       (secondary text)
--color-border:       #2A2A2A       (subtle dividers)
--color-accent:       #6366F1       (indigo — links, CTAs, highlights)
--color-accent-hover: #818CF8       (lighter accent on hover)
--color-accent-glow:  rgba(99,102,241,0.15)  (subtle glow effects)
```

> [!NOTE]
> The accent color (indigo `#6366F1`) was chosen for its WCAG AA contrast ratio against dark backgrounds while remaining visually distinctive without being aggressive.

### 4.2 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Headings | **Inter** (Google Fonts) | 700 | `clamp(1.5rem, 4vw, 3.5rem)` |
| Body | **Inter** | 400 | `clamp(0.9rem, 1.2vw, 1.1rem)` |
| Mono/Code | **JetBrains Mono** | 400 | `0.875rem` |

- Fonts loaded via `<link rel="preload">` with `font-display: swap`
- Max 2 font families to minimize network requests

### 4.3 Spacing & Layout

- **Max content width:** `1200px`, centered
- **Section padding:** `clamp(4rem, 8vw, 8rem) 0`
- **Grid system:** Tailwind's grid utilities (`grid`, `grid-cols-*`, `auto-fit` via arbitrary values)
- **Border radius:** `rounded-lg` for cards, `rounded` for buttons/tags

### 4.4 Responsive Breakpoints

| Breakpoint | Target |
|---|---|
| `≤ 480px` | Mobile (small) |
| `≤ 768px` | Mobile / Tablet |
| `≤ 1024px` | Tablet / Small desktop |
| `> 1024px` | Desktop |

---

## 5. Interactions & Animations

### 5.1 Animation Strategy — "Selective GSAP"

GSAP is powerful but heavy if misused. The strategy is **surgical usage**:

| Rule | Detail |
|---|---|
| **No global GSAP bundle** | Import GSAP + ScrollTrigger only in components that need it, via Astro `<script>` tags |
| **CSS-first for simple states** | Hover effects, focus rings, color transitions → Tailwind utilities + CSS `transition` |
| **GSAP for orchestrated motion** | Staggered reveals, timeline-based hero entrances, scroll-linked progress |
| **Tree-shake aggressively** | Only `gsap` core + `ScrollTrigger` plugin — no other plugins |

> [!TIP]
> **Expected JS cost:** GSAP core (~23KB) + ScrollTrigger (~5KB) = **~28KB gzipped**. This ships only on pages with scroll animations, not globally.

### 5.2 Page Transitions (View Transitions API)

- Astro's built-in `<ViewTransitions />` for smooth cross-page navigation
- Shared element transitions for project cards → project detail pages
- Fade + slide transition for page content swap (`200ms ease-out`)

### 5.3 Scroll Reveals (GSAP ScrollTrigger)

- **Technique:** `gsap.from()` + `ScrollTrigger` with `start: "top 80%"` trigger point
- **Effect:** Fade-up (`y: 30 → 0`, `opacity: 0 → 1`, `ease: "power2.out"`)
- **Duration:** `0.6–0.8s`, staggered by `0.1s` per item in lists/grids
- **Batch mode:** Use `ScrollTrigger.batch()` for project grids and tech stack to minimize ScrollTrigger instances
- **Cleanup:** Register all triggers and kill on page transition via `astro:before-swap` event

### 5.4 Hero Entrance Animation (GSAP Timeline)

```
tl = gsap.timeline({ defaults: { ease: "power3.out" } })
  .from(".hero-greeting", { y: 40, opacity: 0, duration: 0.6 })
  .from(".hero-name",     { y: 40, opacity: 0, duration: 0.6 }, "-=0.3")
  .from(".hero-tagline",  { y: 30, opacity: 0, duration: 0.5 }, "-=0.3")
  .from(".hero-cta",      { y: 20, opacity: 0, duration: 0.4 }, "-=0.2")
```

### 5.5 Micro-interactions (CSS only — no GSAP)

| Element | Interaction | Implementation |
|---|---|---|
| Links | Underline expands from left on hover | Tailwind `after:` pseudo + `hover:after:scale-x-100` |
| Project cards | Slight lift + border accent glow | `hover:-translate-y-1 hover:shadow-accent` |
| Buttons | Background fill sweep + subtle scale | `hover:scale-[1.02]` + CSS `transition` |
| Nav links | Active indicator slides to current section | CSS `transition` on indicator element |
| Tech stack icons | Gentle scale on hover with tooltip | `hover:scale-110` + CSS tooltip |
| Timeline items | Left-border accent color fade-in | GSAP ScrollTrigger (grouped with scroll reveals) |

> [!IMPORTANT]
> All animations must respect `prefers-reduced-motion: reduce`. GSAP animations wrapped in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`. CSS transitions disabled via Tailwind `motion-reduce:transition-none`.

---

## 6. Technical Architecture

### 6.1 Astro Configuration

```
astro.config.mjs
├── output: 'static'           (fully static build)
├── site: TBD                  (production URL)
├── prefetch: true             (link prefetching for instant nav)
└── integrations:
    └── @astrojs/tailwind       (Tailwind CSS v4 integration)
```

### 6.2 Project Structure

```
src/
├── layouts/
│   └── BaseLayout.astro       (HTML shell, meta, fonts, Tailwind entry)
├── components/
│   ├── Nav.astro              (sticky navigation)
│   ├── Hero.astro             (includes GSAP timeline script)
│   ├── About.astro
│   ├── ProjectCard.astro
│   ├── ProjectGrid.astro
│   ├── Timeline.astro
│   ├── TimelineItem.astro
│   ├── TechStack.astro
│   ├── Contact.astro
│   └── Footer.astro
├── pages/
│   ├── index.astro            (home — composes all sections)
│   └── projects/
│       └── [slug].astro       (dynamic project detail)
├── content/
│   └── projects/              (Markdown/MDX files for each project)
│       ├── project-one.md
│       └── project-two.md
├── styles/
│   └── global.css             (Tailwind directives + custom @theme tokens)
├── scripts/
│   └── animations.ts          (GSAP ScrollTrigger setup, batch reveals)
└── assets/
    └── images/                (optimized via astro:assets)
```

### 6.3 Content Strategy

- Projects defined as **Astro Content Collections** (type-safe Markdown/MDX)
- Frontmatter schema enforced via `defineCollection` + `z.object` (Zod)
- Project frontmatter:

```yaml
---
title: "Project Name"
description: "One-line summary"
thumbnail: "./thumbnail.webp"
tags: ["Astro", "TypeScript", "PostgreSQL"]
featured: true
liveUrl: "https://..."
sourceUrl: "https://github.com/..."
order: 1
publishedAt: 2026-01-15
---
```

### 6.4 JS Budget Strategy

| Concern | Approach | JS Cost |
|---|---|---|
| Scroll reveals & hero entrance | GSAP Core + ScrollTrigger (selective import) | ~28KB gzipped |
| Page transitions | Astro View Transitions (built-in runtime) | ~2KB |
| Navigation highlighting | CSS `:target` or Astro-generated `aria-current` | 0 KB |
| Contact form | HTML `<form>` with `action` to external service (Formspree/Netlify Forms) | 0 KB |
| Mobile menu | CSS-only hamburger via `:has()` + hidden checkbox pattern | 0 KB |
| Micro-interactions | Tailwind utilities + CSS `transition` | 0 KB |

> [!TIP]
> Total client-side JS budget: **~30KB gzipped**. GSAP is the only JS dependency and is loaded only on pages with animations. Everything else is CSS-only.

---

## 7. Performance Targets

| Metric | Target |
|---|---|
| **Lighthouse Performance** | ≥ 95 |
| **First Contentful Paint** | < 1.0s |
| **Largest Contentful Paint** | < 1.5s |
| **Cumulative Layout Shift** | < 0.05 |
| **Interaction to Next Paint** | < 100ms |
| **Total JS shipped** | < 35KB gzipped (GSAP + View Transitions) |
| **Total CSS shipped** | < 12KB gzipped (Tailwind tree-shaken output) |
| **Total page weight** | < 250KB (excluding images) |

### Image Optimization

- All images processed via `astro:assets` (`<Image />` component)
- Format: **WebP** primary, **AVIF** where supported, PNG fallback
- Responsive `srcset` with `widths` attribute
- Lazy loading via native `loading="lazy"` (eager for hero/above-fold)
- Aspect ratios defined to prevent CLS

---

## 8. SEO & Accessibility

### SEO

- Unique `<title>` and `<meta name="description">` per page
- Open Graph + Twitter Card meta tags
- Canonical URLs
- Structured data (`Person` schema for homepage, `SoftwareSourceCode` for projects)
- Auto-generated `sitemap.xml` via `@astrojs/sitemap`
- `robots.txt`

### Accessibility (WCAG 2.1 AA)

- Semantic HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- Skip-to-content link
- All images have descriptive `alt` text
- Color contrast ratios ≥ 4.5:1 (text) / 3:1 (large text)
- Keyboard-navigable (visible focus rings)
- `prefers-reduced-motion` respected
- `prefers-color-scheme` ready (future light mode toggle)
- Proper heading hierarchy (`h1` → `h2` → `h3`)

---

## 9. Deployment & Hosting

| Option | Notes |
|---|---|
| **Vercel** (recommended) | Zero-config Astro support, edge CDN, instant rollback |
| **Netlify** | Alternative with built-in form handling |
| **Cloudflare Pages** | Alternative with Workers integration |

- CI/CD: Push to `main` → auto-deploy
- Preview deployments on pull requests

---

## 10. Development Phases

### Phase 1 — Foundation ✅ *(current)*
- [x] Astro project initialization (minimal template)
- [x] PRD creation and approval
- [ ] Tailwind CSS v4 integration + `@theme` tokens (colors, typography, spacing)
- [ ] GSAP installation (`gsap` + `@gsap/scroll-trigger`)
- [ ] Base layout component

### Phase 2 — Core Sections
- [ ] Navigation (sticky, scroll-aware)
- [ ] Hero section
- [ ] About section
- [ ] Projects grid + Content Collection setup
- [ ] Project detail page template

### Phase 3 — Extended Sections
- [ ] Experience / Timeline
- [ ] Tech Stack grid
- [ ] Contact section + form integration
- [ ] Footer

### Phase 4 — Polish & Interactions
- [ ] GSAP ScrollTrigger scroll reveals (batch mode for grids)
- [ ] GSAP hero entrance timeline
- [ ] View Transitions integration
- [ ] Micro-interactions via Tailwind hover/focus utilities
- [ ] Responsive testing across breakpoints
- [ ] `prefers-reduced-motion` audit (`gsap.matchMedia` + `motion-reduce:`)

### Phase 5 — Production Readiness
- [ ] SEO meta tags + structured data
- [ ] Sitemap + robots.txt
- [ ] Image optimization pass
- [ ] Lighthouse audit (target ≥ 98)
- [ ] Accessibility audit (axe-core)
- [ ] Deployment setup

---

## 11. Non-Goals (Out of Scope — v1)

- ❌ Blog / writing section (future v2)
- ❌ Dark/light mode toggle (CSS-ready but not implemented)
- ❌ CMS integration (content lives in Markdown)
- ❌ Analytics dashboard
- ❌ i18n / multi-language support
- ❌ Authentication or user accounts

---

## 12. Success Criteria

The portfolio is considered **complete** when:

1. All 6 sections render correctly on mobile, tablet, and desktop
2. Lighthouse performance score ≥ 98 on every page
3. Total client JS < 35KB gzipped (GSAP only meaningful dependency)
4. All animations respect `prefers-reduced-motion`
5. WCAG 2.1 AA compliance passes automated audit
6. Page loads feel instant (< 1s FCP, smooth transitions)
7. Project content is easily updatable via Markdown files
