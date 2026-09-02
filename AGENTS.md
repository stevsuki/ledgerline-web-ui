<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ledgerline

A personal/household finance workspace (Jakarta persona, IDR-first) with a full RBAC
admin surface. Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4.

---

## 1. The design is the specification

`Ledgerline/` holds the exported Claude Design canvas. **It is the source of truth for
every pixel.** Never invent a color, radius, spacing value, label, or number — read it
out of these files:

| File | What to take from it |
| --- | --- |
| `Ledgerline/Finance App.dc.html` | The whole app. Lines 15–126 are the theme override + SHAPE CONTRACT; lines 172–1490 are the 17 screens' markup; lines 1491–2238 are the fixture data and every computed label. |
| `Ledgerline/_ds/modernist-*/styles.css` | Base design-system component layer: `.btn`, `.input`, `.field`, `.radio`, `.seg`, `.tag`, `.table`, `.card`, focus rings, disabled states. |
| `Ledgerline/_ds/modernist-*/readme.md` | Intent behind the system, interaction-state rules, do / don't. |
| `Ledgerline/uploads/*.png` | Reference screenshots of the admin app the RBAC screens were modelled on. Context only — the `.dc.html` already absorbed them. |

**The artboard overrides the design system.** `styles.css` describes Modernist (Archivo,
light ground, 0px radius). The artboard's inline `<style>` block replaces the font, the
ground, and every radius. When the two disagree, **the artboard wins**.

### Reading the artboard

It is a template dialect, not runnable HTML:

- `{{ expr }}` — a value from `renderVals()` / `accessVals()` at the bottom of the file.
- `<sc-if value="{{ x }}">` — conditional. `hint-placeholder-*` attributes are editor
  hints; ignore them.
- `<sc-for list="{{ xs }}" as="x">` — a loop.
- `<svg><use href="#i-name"></use></svg>` — a sprite icon (symbols at lines 128–170).

The `<script type="text/x-dc">` block is a real, readable React-ish class. Port its
`const` fixtures verbatim into `lib/data/` and its derived-value expressions into the
matching server function. Do not round its numbers or reword its copy.

---

## 2. Design tokens

Declared once in `app/globals.css`, then mapped into Tailwind with `@theme inline` so
utilities stay theme-reactive. **Never hard-code a hex, a font name, or a shadow.**

Dark is the default; light is `html[data-theme="light"]`.

| Token | Dark | Light | Utility |
| --- | --- | --- | --- |
| `--color-bg` | `#0d0f14` | `#f7f8fa` | `bg-bg` |
| `--color-surface` | `#15181f` | `#ffffff` | `bg-surface` |
| `--color-text` | `#e7eaf1` | `#171a21` | `text-text` |
| `--color-divider` | text 11% | text 10% | `border-divider` |
| `--panel` | `#12151b` | `#f1f3f7` | `bg-panel` |
| `--rail` | `#101319` | `#ffffff` | `bg-rail` |
| `--muted` | `#8a93a6` | `#6b7385` | `text-muted` |
| `--income` | `#3ecf8e` | `#12855c` | `text-income` |
| `--expense` | `#ff6a4d` | `#d8402a` | `text-expense` |
| `--warn` | `#e5a94a` | `#a06a12` | `text-warn` |
| `--color-accent` | `#ec3013` — same in both themes, never overridden | | `text-accent` |

Two known costs of keeping the artboard's red, recorded so they are not rediscovered as
bugs: white on `#ec3013` measures **4.20:1**, under the 4.5 AA floor for the labels on
`.btn-primary`; and the accent sits **2° of hue** from `--expense` `#ff6a4d`, so brand
emphasis and "money out" read as the same colour (an over-limit card's accent border
beside its expense-red bar is the clearest case).

Chart ramp `--c1` … `--c7` —
dark: `#ff563c #e7eaf1 #9aa3b6 #6a7387 #454c5c #2b313c #ffc4b8`;
light: `#ec3013 #171a21 #6b7385 #9aa2b1 #c3c9d4 #e3e7ee #ffb3a3`.
Category → ramp step is positional: Housing=c1, Food & drink=c2, Transport=c3,
Subscriptions=c4, Utilities=c5, Health=c6, Other=c7.

Shadows `--shadow-sm/md/lg` are per-theme. Type is **Plus Jakarta Sans** 400/500/600/700
for both heading and body, loaded via `next/font/google`. Headings are weight 600 with
`letter-spacing:-.02em`, never 700+.

---

## 3. The shape contract

Copied from the artboard (lines ~96–108). Every surface in the app is one of these.
Reuse the primitive in `components/ui/` — do not re-derive the numbers inline.

| Shape | Rule | Primitive |
| --- | --- | --- |
| Panel | 1px divider · radius 16 · `shadow-md` · `bg-surface` | `<Panel>` |
| InsetBlock | 1px divider · radius 12 · `bg-panel`, inside a Panel | `<InsetBlock>` |
| IconTile | 34×34 (32 in dense rows) · 1px divider · radius 10 | `<IconTile>` |
| Control | height 38 · radius 12 · `bg-panel` — `.btn`, `.input`, `.seg` share it | `.btn` / `.input` / `.seg` |
| Checkbox | 22×22 · radius 6 · 1.5px border | `<PermissionCheckbox>` |
| Tag | pill (radius 99) · padding 4/11 | `.tag` |
| Track | radius 99, fill radius 99 | `<ProgressTrack>` |
| Overlay | slide-over / dropdown · radius 20 · `shadow-lg` | `<SlideOver>` / popover |
| PhoneFrame | radius 20 · `shadow-lg` | `<PhoneFrame>` |
| Rhythm | panel inset `--pad-panel` · header row 19 · body row 14 · gaps 16/24 | `.panel-pad` |

Above those sit the compositions — the arrangements that came up on four screens or
more. Reach for one of these before writing the markup again:

| Composition | Where it repeats | Component |
| --- | --- | --- |
| Padded card: title, meta line, column of fields | budgets, wallets, goals, recurring, shared, reminders, settings, insights | `<SectionPanel>` |
| "Nothing matched" / "the API failed" line in a table | users, roles, audit, transactions | `<PanelNotice>` / `<EmptyState>` |
| Label · `spent / limit` · track | dashboard, shared | `<MeterRow>` |
| Swatch · name, and the row of them | dashboard, insights, shared | `<LegendItem>` / `<LegendList>` |
| One track divided into shares | budgets, shared | `<StackedBar>` |
| Two-up form fields that stack when halved | wallets, goals, settings | `<FieldGrid>` |
| Clear-every-filter link | transactions, audit | `<FilterReset>` |

Typography inside panels, from the artboard: panel title 16.5px/600/`-.015em`; kicker
10.5px uppercase `.12em` muted 600; stat value 24.5px/600/`-.03em`; row primary 13.5px;
row secondary 11.5px muted. Every money figure carries `tabular-nums`.

### Rhythm: horizontal is one token, vertical varies

Inside a panel, **every** header, column head and body row is inset by `--pad-panel` on
both sides — that is what makes a column head line up with the rows under it.
`.panel-head`, `.panel-row`, `.panel-row-dense`, `.column-head`, `.column-head-access`
and the two loose-block classes `.panel-pad` / `.panel-pad-x` all read it, so they step
together and can never drift apart.

It is a token rather than the artboard's flat 24px because 24px on each side of a 360px
phone spends 48 of its pixels on nothing. Both insets step down with the viewport, and
`--header-h` follows, because the header sheds a row of chrome at the same widths:

| | `--pad-screen` | `--pad-panel` | `--header-h` |
| --- | --- | --- | --- |
| ≥ 64rem | 28px | 24px | 73px |
| < 64rem | 20px | 20px | 69px |
| < 40rem | 16px | 16px | 62px |

Those are Tailwind's own `lg` and `sm`, so a `lg:` or `sm:` utility flips on exactly the
same frame the tokens do. **Never write `px-6` or `p-6` on a panel** — use `.panel-pad`
/ `.panel-pad-x`, or the primitive that already carries them.

Only the vertical step changes between screens, so override it with a `py-*` utility
rather than inventing another class (Tailwind's utility layer is emitted after the
components layer, so it wins):

| Screen | Column head | Row |
| --- | --- | --- |
| Users, audit | `.column-head-access` (13px, panel fill, `.1em`) | `.panel-row py-3` (12px) |
| Roles | `.column-head-access` | `.panel-row` (14px) |
| Transactions | `.column-head` (15px, page ground, `.12em`) | `.panel-row` (14px) |
| Recurring, insights ranking | `.column-head` | `.panel-row-dense` (15px) |
| Reminders (bills, alerts) | — | `.panel-row py-4` (16px) |
| Shared members | — | `.panel-row py-[17px]` (17px) |

Stat cards come in the artboard's three sizes — `<StatCard size="compact | regular |
large">`. Transactions is compact (15/18, 20px value); recurring is regular (19/22, 24px);
users and audit are large (19/22, 24.5px).

### Two deliberate departures from the artboard

The canvas was drawn at one width, which hid two alignment bugs. Both are fixed here,
and both must stay fixed:

1. **One gutter for the whole screen.** The artboard insets its header by 20px and its
   content by 28px, so the page title sits 8px left of the first card. `<AppScreen>`
   gives the header and the content the same `.screen-gutter` (28px) and the same
   nesting, so they align to the pixel.
2. **Content is centred, not left-pinned.** The artboard caps each screen
   (1200 / 1240 / 1340) but never centres it, so every pixel of leftover space piles up
   on the right — at 1920 that is 434px on the right against 0 on the left. The cap now
   lives in `--screen-max`, set once by `<AppScreen maxWidth>`, and both the header bar
   and `<ScreenStack>` centre within it.

`main` no longer scrolls; the column around it does. That keeps the sticky header and the
content in one box so a scrollbar cannot shift one edge and not the other.

### The third departure: the canvas has no narrow width

The artboard is one desktop frame, so nothing in it says what a phone gets. These rules
fill that in, and every new screen must hold them:

- **The rail undocks below `lg`.** Docked, it costs a 390px phone between 62 and 208px of
  a 390px screen. Below `lg` `.nav-rail` goes `position: fixed` and slides in over the
  content, driven by `data-nav` on the shell exactly as the docked width is driven by
  `data-rail`. Closed, it is `visibility: hidden`, which is what keeps it out of the tab
  order. `<NavDrawer>` owns the button, the scrim, Escape, and closing on navigation.
- **The header drops chrome, it does not wrap into three rows.** Each piece leaves at the
  width where it stops earning its place — currency tag at `xl`, global search at `md`,
  the add-transaction *label* (not the button) at `sm` — so what is left holds one row at
  360px. `<AppHeader>` is the only place that decides this.
- **A fixed-column table folds; it does not scroll sideways.** Transactions and recurring
  drop to `icon · name · amount` under `md` and fold the other columns into the meta line
  under the name. Reserve `<TableScroll>` for the access tables, where every column is a
  distinct fact and there is nowhere to fold it to.
- **Every `minmax()` floor is `min(100%, Npx)`.** A bare `minmax(316px, 1fr)` cannot go
  under 316px, so on a 320px phone it pushes the whole page sideways. `<CardGrid>`,
  `<SplitGrid>`, `<FieldGrid>` and `<StatGrid>` all do this for you.
- **An overlay is capped against the viewport, not just its trigger** — `w-[min(320px,
  calc(100vw-2rem))]`. That covers the notification popover, the export popover and the
  date-range grid.
- **Sticky is a two-column idea.** `lg:sticky` only, or a stacked phone gets a panel that
  pins itself over the list it belongs beside.

### The fourth departure: nothing syncs with a bank

The artboard draws Ledgerline as an app wired into BCA, GoPay and Wise — "Synced 12
minutes ago" under a balance, a **Connected institutions** panel, a "Reconnect" tag.
None of that is reachable: BCA's production API wants a corporate agreement, and every
aggregator that covers Indonesian banks is paid B2B. **Ledgerline is manual entry**, and
the screens have to say so rather than imply a connection that is not there.

So on `/wallets`: the integrations panel is gone (with the `Integration` type and
`getIntegrations` behind it), and the sync line is now `Updated {formatSince(...)}` —
how stale a figure is has to be stated when nothing refreshes it for you. Its slot in
the `SplitGrid` holds **Balance summary** instead: money held, a `StackedBar` of each
wallet's share, and — below it — card debt and any non-base currency as their own lines.
That split is not decoration. With no exchange rate to hand, one figure covering an IDR
account, a USD account and a credit card would be a guess, so `BASE_CURRENCY` states the
total and everything it cannot honestly absorb sits under the bar.

A wallet is stored as data, not as the sentences the artboard printed: `kind` +
`reference` compose the meta line, `creditLimit` + `dueDay` compose a card's, and
`balance` is a number in the wallet's own currency (negative on a card is money owed).
`formatMoney` / `formatBalance` in `lib/format.ts` handle the non-rupiah currencies.

The replacement for syncing, when it comes, is **CSV import** of an m-BCA or Livin'
e-statement — free, and nobody's permission is needed. It belongs to transactions, not
here.

---

## 4. Architecture — SSR first, CSR only where it must be

**Default to a Server Component.** A file gets `"use client"` only when it needs state,
an event handler, or a browser API — and then it stays as small as possible, with the
data it renders passed in as props from the server.

### What must stay on the server

- All data loading. `lib/data/*` is imported by pages only, never by a client file.
- All filtering, sorting, grouping, and pagination. These read `searchParams`, so the
  server renders the exact list the user asked for. **Never ship the full dataset to the
  browser and filter it there.**
- Page metadata via `generateMetadata`.
- Theme and rail state, read from cookies in the layout so the first paint is correct
  and there is no flash.

### The complete list of client components

Keep it this short. Adding one is a decision, not a detail.

| Component | Why it must be client |
| --- | --- |
| `NavLink` | `usePathname()` for the active state |
| `ThemeToggle` / `ThemeSegment` | writes the theme cookie, flips `data-theme` optimistically |
| `RailToggle` | writes the rail cookie |
| `NavDrawer` | the mobile rail's open flag — `aria-expanded`, Escape, close on navigation |
| `NotificationBell` | open/close popover, outside click, Escape |
| `FilterForm` | debounced typing, instant selects, focus-preserving replace |
| `TrendChart` | hover tooltip over the bars |
| `CategoryDonut` | hover highlights slice + legend row |
| `TransactionSlideOver` | modal state, focus trap, Escape |
| `UserEditorProvider` | same, plus `useActionState` over `saveUserAction` |
| `RoleForm` | the live permission grid, posting to `saveRoleAction` |
| `RemoveUserButton` / `RemoveRoleButton` | confirm before the delete form posts |
| `Toast` | timed dismissal |
| `SignInForm` / `RegisterForm` | `useActionState` — pending state, inline errors |
| `ResetRequestForm` / `NewPasswordForm` | same |
| `AppError` (`app/error.tsx`) | an error boundary must be a client component |

The auth forms and the two access editors post to real mutations — Server Actions in
`lib/auth/actions.ts` and `lib/access/actions.ts`. Each is a thin
`<form action={formAction}>` over one of them, so the auth cards still work with
JavaScript switched off; the client half only adds the pending label and the per-field
error. The role matrix posts one hidden `grant` value per ticked cell rather than a
JSON blob, so the server reads the permission rows straight off the `FormData`.

### URL contract

State that survives a reload lives in the URL, never in React state:

```
/transactions   ?q= &category= &wallet= &range= &amount= &page= &size=
/users          ?q= &role= &status= &sort= &page= &size=
/roles          ?q= &sort= &page= &size=
/audit          ?q= &actor= &module= &status= &severity= &from= &to= &page= &size=

/sign-in        ?next= &status=
/reset-password ?step=request|reset
```

Filter bars are plain `<form method="get">` — they work with JavaScript disabled, and
`FilterForm` only adds timing on top: a `<select>` applies at once, typing waits out a
350ms debounce, and Enter applies immediately. Each goes through `router.replace`, not
a native submit, so the search box keeps focus and caret while the rows update behind
it and the back button does not walk one keystroke at a time. Parse every param through
`lib/search-params.ts`; never trust a raw string. Changing any filter resets `page` to 1
— which is simply what happens, since `page` is not one of the bar's fields.

`?sort=` is the backend's own convention — a column name, `-` prefixed for descending —
and only the columns `dto.userSort` / `dto.roleSort` whitelist are accepted, so
`readSort` drops anything else before it leaves. `<SortHeader>` is a link that rewrites
the param, so ordering ships no JavaScript and survives a reload.

### Data layer

`lib/data/<domain>.ts` exports `async` query functions (`getTransactions(filters)`,
`getUsers(filters)`, …) that pages `await`. That async boundary is what made the next
step cheap: **users, roles, the audit log and the sidebar menus are live** — they call
`ledgerline-backend` through `lib/api/`, and no component changed when they stopped
being fixtures. Every other domain is still a typed fixture behind the same signature.

The audit log is the one that filters, sorts and pages entirely in the database:
`/audit-logs` takes every filter the bar sets, `/audit-logs/overview` feeds the four
cards, `/audit-logs/options` fills the dropdowns, and `/audit-logs/export` streams the
CSV that `app/(app)/audit/export/route.ts` pipes to the browser — the token is in an
http-only cookie, so the download has to pass through the server. `detail_text` is what
a row prints; the structured `details` beside it is narrowed per kind in
`lib/api/audit-detail.ts` and is what a future detail drawer will read.

The API layer is server-only. `lib/api/client.ts` is the single door; each endpoint
module narrows its payload into a real type; an expected failure — a rejected login, a
validation error, an unreachable API — comes back as `{ ok: false }` rather than a
throw. The access token is read from the http-only cookie by `requireAccessToken()` and
never enters a React tree.

**`code` is the contract, `message` is for people.** The backend publishes its catalogue
in `ERROR_CODES.md` (generated from `internal/domain/error_codes.go`); `API_ERROR_CODES`
in `types/api.ts` mirrors it, and `MESSAGE_BY_CODE` in `lib/auth/form-state.ts` is the
only place a code becomes a sentence. Never branch on `message`, and never parse it. A
code released after this client was written lands on `UNKNOWN` and keeps the message the
API sent, so a new backend release degrades to the backend's own wording rather than to
"we could not read that".

Two fields ride along with every failure. `request_id` matches the `X-Request-ID` header
and the server's log line, so it is printed — but only on `INTERNAL_ERROR`, where the
fault is theirs and someone will go looking for the log. `retryAfterSeconds` comes off
the `Retry-After` header, which the backend sets on a locked account, the reset
cooldown, and the rate limiter; `WAIT_LEAD` turns it into "try in about 4 minutes"
rather than a vague "wait a moment".

**A failed `/auth/me` is not automatically a dead session.** Only `AUTH_TOKEN_MISSING`,
`AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED` and `UNAUTHORIZED` end one; a 500, a timeout
or an unreachable API means the backend is unwell while the cookie is still good.
`requireProfile()` redirects on the first set and **throws** on the second — redirecting
there would both lie and loop, because the proxy sends a live cookie straight back to
`/dashboard`. `app/error.tsx` catches the throw.

Three gaps in the API the screens work around today, each marked where it bites:

- `GET /users` has no `role` or `status` filter, so one `per_page=100` window is
  fetched and the two selects are applied on the server. Past that many accounts they
  need to be real query params.
- `GET /roles` sends an empty `permissions` array — only `GET /roles/{id}` hydrates it
  — so the list shows no grant count and the user editor shows the role's description
  in place of the artboard's inherited-module tags.
- Actions are dotted codes (`auth.login`) and the backend ships no label for them,
  unlike modules and severities. `lib/audit-labels.ts` names the ones it knows and
  prettifies the rest, so a newly recorded action reads sensibly without a release.
- There is no `GET /menus`. `/auth/me` returns only the menus the signed-in role may
  *read*, which is the right list for the rail and the wrong one for the role editor,
  so `MENU_CATALOGUE` in `lib/access/menus.ts` carries the ids migration 000008 pins.
  Delete it the day that endpoint exists.

`lib/format.ts` owns money formatting. The artboard's `F()` is
`'Rp' + Math.abs(n).toLocaleString('de-DE')` — Indonesian dot grouping, with the sign
carried separately as `+ ` / `− ` (U+2212 minus, not a hyphen). Always use the helper.

---

## 5. Icons

Lucide, 24×24, `stroke-width:2`, `stroke-linecap/linejoin:round`, on `currentColor`.
They ship as one sprite: `<IconSprite />` renders the `<symbol>` set once in the root
layout, and `<Icon name="wallet" />` renders `<svg><use href="#i-wallet" /></svg>`.

`IconName` is a union type — adding an icon means adding a symbol *and* the name. Never
paste raw `<path>` data into a screen. Decorative icons get `aria-hidden`; an icon that
is the only content of a control needs an accessible name on the control.

---

## 6. Routes

```
(auth)/  sign-in · register · reset-password        no app shell
(app)/   layout = nav rail + AppHeader
         /                    Dashboard
         /transactions  /budgets  /wallets  /goals  /recurring
         /insights  /shared  /reminders
         /users  /roles  /roles/new  /roles/[roleId]  /audit
         /settings  /mobile
```

The artboard's `auth` screen shows sign-in, register and reset side by side — that is a
canvas showcase, not a screen. It ships as three real routes; the card markup inside each
is copied exactly. `/mobile` stays a single preview page of the three phone frames, as
designed.

Page title and subtitle come from `PAGE_META` in `lib/nav.ts`, taken verbatim from the
artboard's `titles` map. Each page renders `<AppHeader title subtitle />` as its first
child — the header is sticky, so it is shared markup without a parallel-route slot.

---

## 7. Code quality — the build must stay SonarQube-clean

Non-negotiable, because these are the rules that actually get flagged:

- **No `any`**, no non-null `!`, no unchecked casts. Model the data with real types in
  `types/`. TypeScript runs `strict`.
- **No nested ternaries** (S3358). The artboard is full of them — unwind each into a
  small named helper or a lookup table (`const TONE_BY_STATUS = {...}`).
- **No duplicated blocks** (S4144, S1192). A repeated string literal becomes a constant;
  a repeated markup block becomes a component. Stat cards, filter bars, pagination bars
  and progress rows repeat across five screens each — build them once.
- **Cognitive complexity ≤ 15** per function (S3776). Split long page components into
  named section components rather than one giant JSX return.
- **Every `.map()` needs a stable `key`** — a domain id, not the array index.
- **Accessibility is a Sonar rule too**: every `<button>` gets an explicit `type`, every
  form control gets a real `<label htmlFor>`, tables use `<th scope>`, icon-only buttons
  get `aria-label`, popovers get `aria-expanded`/`aria-controls`, dialogs get
  `role="dialog" aria-modal`. Interactive things are `<button>`/`<a>` — never a
  `<div onClick>`.
- **No dead code**: no unused imports, variables, parameters, or commented-out blocks.
- **No magic numbers in logic**. Layout numbers belong in Tailwind/`globals.css`;
  business numbers belong in a named constant.
- Prefer `readonly` arrays and `as const` for fixtures so nothing mutates them.

Before declaring work done: `npm run lint` and `npx tsc --noEmit` must both be clean, and
`npm run build` must succeed.

---

## 8. Motion and accessibility

The artboard defines the motion vocabulary — port it into `globals.css` as-is: panels
rise (`m-pop`, 0.5s, `cubic-bezier(.22,1,.36,1)`, staggered 0.06s per card), bars grow
from the bottom, progress tracks fill from the left, overlays slide in, buttons lift 1px
on hover and settle to `scale(.975)` on press.

The whole set is disabled under `@media (prefers-reduced-motion: reduce)` — that block is
copied from the artboard and must not be dropped.

Focus is never the browser default:
`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`.
The `.input` focus ring is the accent border plus a 3px accent-18% halo, per the artboard.
