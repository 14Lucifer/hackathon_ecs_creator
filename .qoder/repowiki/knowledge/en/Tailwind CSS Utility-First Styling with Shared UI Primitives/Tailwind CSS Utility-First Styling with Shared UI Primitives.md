---
kind: frontend_style
name: Tailwind CSS Utility-First Styling with Shared UI Primitives
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/tailwind.config.js
    - frontend/postcss.config.js
    - frontend/package.json
    - frontend/src/index.css
    - frontend/src/components/ui.jsx
---

The frontend uses a utility-first styling approach built on **Tailwind CSS v3** (with PostCSS + Autoprefixer) and a Vite/React toolchain. There is no external component library; visual consistency is achieved through a small set of shared primitives defined in `src/index.css` and reusable React components in `src/components/ui.jsx`.

### System overview
- **Build pipeline**: Vite → PostCSS → Tailwind → Autoprefixer, configured via `postcss.config.js` and `tailwind.config.js`. The Tailwind content scan covers `./index.html` and all `src/**/*.{js,jsx}` files.
- **Global stylesheet**: `src/index.css` boots Tailwind (`@tailwind base/components/utilities`) and declares application-wide `@layer components` primitives: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.label`, `.card`, `.th`, `.td` — each composed from Tailwind utilities via `@apply`.
- **Shared UI layer**: `src/components/ui.jsx` exports small presentational components (`Badge`, `Spinner`, `Modal`, `ErrorBanner`, `PasswordReveal`, `ToastProvider`/`useToast`). These components are styled almost entirely with inline Tailwind class strings rather than separate CSS modules or CSS-in-JS.
- **Pages**: All pages under `frontend/src/pages/{admin,user}/` compose the above primitives and Tailwind classes directly in JSX `className` attributes.

### Design tokens & conventions
- **Color palette**: Relies on Tailwind's default gray/blue/red/yellow/orange scale; status semantics are centralized in `BADGE_STYLES` inside `ui.jsx` (e.g. `pending` → yellow, `approved` → green, `rejected` → red).
- **Typography**: Uses Tailwind defaults (`text-sm`, `font-medium`, `font-semibold`, `uppercase tracking-wider` for table headers). No custom font families or type scales are extended.
- **Spacing / layout**: Flexbox and spacing utilities (`gap-*`, `p-*`, `space-y-*`, `flex items-center justify-between`) dominate; no custom spacing scale is added to `tailwind.config.js`.
- **Responsive strategy**: Purely responsive via Tailwind breakpoint prefixes where needed; no media-query overrides exist outside Tailwind's built-ins.
- **No theme customization**: `tailwind.config.js` extends an empty `theme.extend` object and registers no plugins, so the app runs against Tailwind's default design system out of the box.

### Rules developers should follow
1. **Style with Tailwind utilities** — avoid writing new raw CSS; prefer composing existing utilities in `className` strings.
2. **Reuse primitives** — use `.btn`, `.card`, `.input`, `.label`, `.th`, `.td` from `index.css` instead of re-typing their utility combinations.
3. **Use shared components** — for badges, modals, error banners, spinners, and toasts, import from `components/ui.jsx` rather than recreating them per page.
4. **Keep colors semantic** — when adding new statuses or states, extend `BADGE_STYLES` (and `BADGE_LABELS`) in `ui.jsx` instead of hardcoding color classes at call sites.
5. **Do not modify the global Tailwind config** unless you need to add a new color, spacing step, or plugin; keep the default palette as the source of truth.