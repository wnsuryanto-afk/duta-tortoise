# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

**Duta Tortoise** is an internal farm-management web app for a tortoise/reptile
breeding operation. It is a **Base44 app**: a React SPA whose backend (data
entities, auth, serverless functions, integrations) is hosted by the
[Base44](https://base44.com) platform. There is no backend code in this repo —
the frontend talks to Base44 through the `@base44/sdk`.

Any change pushed to this repo is also reflected in the Base44 Builder, and the
app is published from Base44. The UI language is **Indonesian** (labels,
comments, and copy are in Bahasa Indonesia); keep that convention when adding
user-facing strings.

## Tech stack

- **React 18** + **Vite 6** (JavaScript/JSX, `type: module`, **no TypeScript** —
  but `.jsx`/`.js` files are type-checked in a loose `checkJs` mode via `jsconfig.json`)
- **React Router v6** (`react-router-dom`) — all routing in `src/App.jsx`
- **@tanstack/react-query v5** for all server state (fetch/cache/mutate)
- **Tailwind CSS 3** + **shadcn/ui** (new-york style, Radix primitives) in `src/components/ui`
- **@base44/sdk** for data, auth, serverless functions, and integrations
- **lucide-react** icons, **recharts** charts, **framer-motion** animations,
  **sonner**/`react-hot-toast` toasts, **date-fns**/**moment** dates

## Commands

```bash
npm install        # install deps
npm run dev        # start Vite dev server
npm run build      # production build to ./dist
npm run lint       # eslint (quiet); lint:fix to auto-fix
npm run typecheck  # tsc against jsconfig.json (checkJs)
npm run preview    # preview the production build
```

Local dev needs an `.env.local` with `VITE_BASE44_APP_ID` and
`VITE_BASE44_APP_BASE_URL` (see `README.md`). `.env*` files are gitignored — never
commit secrets.

## Architecture

### Entry & providers

`src/main.jsx` → `src/App.jsx`. `App.jsx` wraps everything in a stack of
providers (order matters):

```
QueryClientProvider (query-client.js)
  └ ThemeProvider → AuthProvider → ViewAsProvider → TourProvider
      └ Router → Routes → <AppLayout/> (layout route) → page components
```

- **AuthProvider** (`src/lib/AuthContext.jsx`) checks Base44 app public settings
  and user auth. On `user_not_registered` it renders `UserNotRegisteredError`;
  on `auth_required` it redirects to login. All real pages render only after auth
  resolves.
- **AppLayout** (`src/components/layout/AppLayout.jsx`) is the shell: `Sidebar`,
  top bar (notifications, theme toggle, profile), tour controller, and forces
  profile completion for non-owners before the app is usable.

### Data layer — Base44 SDK

The single client lives in `src/api/base44Client.js` (exports `base44`). **Always
import it as `import { base44 } from "@/api/base44Client"`** — do not construct
new clients. It exposes:

- `base44.entities.<EntityName>` — CRUD: `.list(sort, limit)`, `.filter(query, sort, limit)`,
  `.get(id)`, `.create(obj)`, `.update(id, obj)`, `.delete(id)`
- `base44.auth.me()` — current user (wrapped by `useCurrentUser`)
- `base44.functions.invoke("name", payload)` — call a Base44 serverless function
- `base44.integrations.Core.*` — `InvokeLLM`, `GenerateImage`, `SendEmail`, `UploadFile`

There are **~70 entities** (defined in Base44, not in this repo). A few
overridden schemas are checked in under `src/entities/*.json` (`User`,
`UserProfile`, `PrinterConfig`). Core domain entities include: `Tortoise`,
`Breeding`, `Incubator`/`IncubatorReading`, `HealthRecord`/`HealthReminder`,
`Enclosure`, `Sale`/`BuyerProfile`/`WaitingList`, `FeedStock`/`FeedingLog`/
`PakanHarian`/`PelletRecipe`, `WarehouseItem`/`StockMovement`, `FinanceTransaction`/
`PettyCash*`, HR/payroll (`Attendance`, `OvertimeLog`, `SalarySlip`, `Kasbon`,
`SalaryConfig`), SOP/tasks (`SOPTask`, `DailyChecklist`, `MaintenanceLog`,
`IncidentalTask`), `Notification`, `ActivityLog`, `WhatsAppLog`/`WhatsAppSettings`.

**Serverless functions** invoked from the client include `sendWhatsApp`,
`claudeAI`, `recordTortoiseDeath`, `getRotasiUkur`, `notifyNewUser`,
`recalculateBuyerProfiles`, and various stock-migration helpers. To find them,
grep for `base44.functions.invoke`.

### Server state pattern

Use **react-query for everything that touches Base44**. Typical component:

```jsx
const { data, isLoading } = useQuery({
  queryKey: ["tortoises"],
  queryFn: () => base44.entities.Tortoise.list("-name", 500),
});
```

The shared client (`src/lib/query-client.js`) sets `staleTime: 5min`,
disables refetch-on-focus/reconnect, and has custom retry/backoff that retries
HTTP 429 (rate limit) up to 3× with escalating delay. Respect this — Base44 rate
limits, so avoid unbounded `.list()` calls and prefer `.filter(...)` with limits.
After mutations, `invalidateQueries` the relevant keys.

### Roles & permissions

`src/lib/permissions.js` is the **single source of truth** for access control.
Roles: `owner`, `manajer`, `admin`, `kepala_feeder`, `keeper`, `investor`.

- `NAV_ACCESS[role]` — which nav sections a role sees (drives the Sidebar)
- `PAGE_PERMISSIONS[role][section]` — `canCreate/canEdit/canDelete/canViewPrice/canViewSales`
- Helpers: `canAccess(role, section)`, `getPerms(role, section)`,
  `canPerformAction(role, section, action)`, `isOwner`, `isManagerLevel`,
  `canViewActivityLog`, `canAccessPettyCash`

Always read the current role from **`useCurrentUser()`** (`src/lib/useCurrentUser.js`),
which returns `{ user, role, realRole, isPreviewMode, isViewingAs }`. `role` is
the **effective** role (accounts for the owner's "View As" mode);
`isPreviewMode` is true when an owner previews another role — disable edits in
that state. When adding a new page/section, wire it into both `NAV_ACCESS` and
`PAGE_PERMISSIONS` and guard the UI with these helpers — do not invent ad-hoc role
checks.

### Directory map

```
src/
  api/            base44Client.js (the SDK client — import from here)
  entities/       overridden Base44 entity schemas (*.json)
  pages/          ~75 route-level screens (one per feature area)
  components/
    ui/           shadcn/ui primitives — do not hand-edit; generated
    layout/       AppLayout, Sidebar (nav is driven by permissions.js)
    dashboard/    role-specific dashboards under dashboard/role/
    common/       shared widgets (error boundary, avatars, pickers…)
    <feature>/    per-domain: tortoise, breeding, health, sales, finance,
                  pettycash, hr, salary, sop, warehouse, stock, pakan, etc.
  lib/            contexts (Auth, Theme, ViewAs, tour), permissions,
                  query-client, domain utils, and custom hooks
  hooks/          reusable hooks (use-mobile, useVoiceInput, etc.)
  utils/          misc (index.ts)
```

Note: two naming variants exist for similar concerns (e.g. `stock`/`stok`,
`pettycash`/`kasbon`) — mostly a Indonesian/English split from incremental
growth. Match the neighboring code when editing a feature; check imports rather
than assuming.

## Conventions

- **Imports use the `@/` alias** for `src/` (configured in `jsconfig.json` and the
  Base44 Vite plugin). Use `@/components/...`, `@/lib/...`, `@/api/base44Client`.
- **shadcn/ui**: components in `src/components/ui` are generated (config in
  `components.json`, base color `neutral`, CSS variables). Prefer composing them;
  don't rewrite primitives. Use `cn()` from `@/lib/utils` for class merging.
- **Styling** is Tailwind-only; theme tokens/animations in `tailwind.config.js`
  and `src/index.css`. Dark mode via `next-themes` + `ThemeContext`.
- **User-facing text is Indonesian.** Match existing tone and terminology
  (e.g. "kura" = tortoise, "kandang" = enclosure, "pakan" = feed, "gaji" = salary,
  "kasbon" = cash advance).
- **Activity logging**: mutations to key entities should be recorded via
  `logActivity` (`src/lib/logActivity.js`), which produces human-readable
  Indonesian field diffs. Follow the existing pattern when touching audited
  entities.
- **Lint**: ESLint (flat config) covers `src/pages`, `src/components` (excluding
  `components/ui` and `src/lib`). `unused-imports/no-unused-imports` is an
  **error** — remove dead imports. Prefix intentionally-unused vars/args with `_`.
- Wrap risky screens with `PageErrorBoundary` (see `common/`), as the layout does.

## Adding a feature (typical flow)

1. If new data is needed, add/extend the entity **in Base44** (not this repo);
   only override its JSON in `src/entities/` if the app needs a local schema.
2. Create the page under `src/pages/`, and feature components under
   `src/components/<feature>/`.
3. Register the route in `src/App.jsx` (import + `<Route>` inside the `AppLayout`
   layout route).
4. Add the section to `NAV_ACCESS` / `PAGE_PERMISSIONS` in `src/lib/permissions.js`
   and to the Sidebar `NAV_GROUPS` (`src/components/layout/Sidebar.jsx`).
5. Fetch/mutate through react-query + the `base44` client; guard actions with
   `useCurrentUser()` + permission helpers; log audited mutations.
6. `npm run lint` and `npm run typecheck` before committing.

## Gotchas

- No conventional backend/tests in-repo — behavior depends on the live Base44 app.
- `base44/.app.jsonc` is gitignored; `base44/config.jsonc` holds build/serve commands.
- The Base44 Vite plugin injects HMR/navigation/analytics/visual-edit agents and
  supports legacy `@/entities`, `@/integrations` imports (behind
  `BASE44_LEGACY_SDK_IMPORTS`); new code should import from `@base44/sdk` / the
  `base44` client instead.
- `src/backups/` holds one-off JSON snapshots from past refactors — not runtime code.
