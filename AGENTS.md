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
| `--color-bg` | `#121526` | `#f5f6fb` | `bg-bg` |
| `--color-surface` | `#1a1e33` | `#ffffff` | `bg-surface` |
| `--color-text` | `#e4e8f7` | `#171a2b` | `text-text` |
| `--color-divider` | text 10% | text 10% | `border-divider` |
| `--panel` | `#161a2d` | `#eef0f8` | `bg-panel` |
| `--rail` | `#14182a` | `#ffffff` | `bg-rail` |
| `--muted` | `#8e97b8` | `#666e8c` | `text-muted` |
| `--income` | `#7ddba0` | `#147d4d` | `text-income` |
| `--expense` | `#f2849b` | `#cf3d5e` | `text-expense` |
| `--warn` | `#e8c987` | `#9a6b12` | `text-warn` |
| `--color-accent` | `#8c9eff` | `#4a56d6` | `text-accent` |
| `--color-on-accent` | `#121526` | `#ffffff` | `text-on-accent` |

**The theme departs from the artboard on purpose.** The canvas is a neutral black with
one red accent, `#ec3013`, and a ramp of greys; this is a navy ground with a periwinkle
accent and a pastel ramp of seven distinct hues. The artboard is still the source for
every shape, spacing value, label and number — only the colour tokens above are ours.

**A primary or selected control is the accent's glass, never a slab of it** —
`.btn-primary`, a checked `.seg-opt`, a range end in the calendar, a ticked `.perm-cell`,
the current page: a tinted body (`--accent-glass-bg`), an edge of the accent and
`--accent-glass-fg` ink. `.accent-glass` is the same recipe for a one-off. The only
solid accent left is the L of the logo tile.

The accent is now per-theme, and **nothing on it is ever a literal `#fff`**: a pastel
accent is too light to carry white in dark, so whatever sits on a solid accent reads
`--color-on-accent` (7.28:1 dark, 5.84:1 light). That also retires the two costs the red
carried — white on it measured 4.20:1, and it sat 2° of hue from `--expense`, so brand
emphasis and "money out" read as one colour.

Chart ramp `--c1` … `--c7` (rose, sand, teal, green, blue, purple, peach) —
dark: `#e28aab #dcc594 #6cc3d8 #86cf96 #6f9fe6 #a88ae0 #e9a585`;
light: `#d9648f #c9a75a #3fa5bf #55b06c #5a82d8 #8d68d0 #e08a63`.
Every chart mark is a hairline of its own colour around a translucent body: `.glass-fill`
on a bar, a track fill or a share, `.glass-slice` on the donut's paths. `<ProgressTrack>`
and `<StackedBar>` already carry it; a hand-drawn bar must add it. Legend swatches stay
solid, so the key reads at 9px.
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
| IconChoice | the same tile as a radio · accent when checked | `<IconChoiceField>` |
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

**Manual entry is where a balance starts, not where it stays.** A typed balance that
never moves is a second set of books: you record spending the app can see and the
wallet card keeps quoting a figure that ignores it. So the backend answers with two
numbers — `balance`, the figure its owner stated, and `current_balance`, that figure
plus every transaction filed against the wallet since. The cards, the shares, the
headline and a card's free limit all print the running one; the balance *field* in the
editor keeps the stated one, because filling it with the running figure would make
opening the sheet and saving a silent reconciliation. `wallets.balance_updated_at` is
what separates them: only rows dated after it count, since the figure given for that
moment already contains everything before it. Restating the balance moves that line
forward, which is the whole of what reconciling means here.

Two consequences on this screen. A wallet nothing has touched since it was stated still
reads `Updated {formatSince(...)}`; one that has moved reads `From Rp100.000 stated 7
days ago`, because the headline is then a figure nobody typed and the line has to say
where it came from. And any wallet can now go negative, not just a card — so the
summary keeps **Owed on cards** for cards alone and gives an overdrawn bank account or
e-wallet its own **Overdrawn** line. Folding the two together would call being short on
a bank account a credit-card debt.

### The fifth departure: one wallet form, and the screen reordered around it

Because nothing refreshes a balance, editing one has to be reachable — and the
artboard has no edit affordance at all. Every card now carries a pencil, and
both it and the dashed card at the end of the grid open the same
`<WalletEditorProvider>` slide-over: name, kind, icon, currency, reference, balance,
`includeInTotal`, plus `creditLimit` + `dueDay` when the kind is `card`. It opens
saying how stale the figure is, and posts to `saveWalletAction` — one
`<form action>` over `POST /wallets` or `PATCH /wallets/{id}`, closing on the
toast the action hands back.

Every input on it is named for the backend's own json tag — `type`, not `kind`;
`credit_limit`, not `creditLimit` — from `WALLET_FIELD` in `lib/wallet-fields.ts`.
That is what lets a rejected save land on the field that caused it: the API keys
its `errors` array by the tag, and `failureState` keys its map by the input's
`name`, with no translation table in between to fall out of date.

Two figures are read before the call, because the backend cannot phrase their
failure better than the sheet can: `parseFigure` in `lib/format.ts` is the
inverse of `formatFigure` — it drops the grouping dots and, on a currency quoted
with cents, reads a comma as the decimal point, because that is exactly how the
field printed the figure being typed over. It answers `null` rather than 0: a
balance that could not be read must stop the save, never quietly zero the card.

`reference` is the one field whose meaning follows the type, so the editor asks
for it by name — account number, registered number, card number — from
`REFERENCE_HINT` in `lib/wallet-fields.ts`. **Cash maps to `null` there, and the
field is replaced by a line saying so**: cash has no number behind it, which is
exactly why `walletMeta` prints `CASH_META` for it. That table lives outside
`lib/data/` because the editor re-reads it on every change of the Type select,
and a client component may never import `lib/data/`.

Two more things fell out of that, and both must stay:

1. **The artboard's inline "Add wallet" panel is gone.** It sat directly under
   the dashed card that linked to it, so the link scrolled the page a few pixels
   and nothing appeared to happen. Worse, it carried fewer fields than the
   editor — no reference, no credit limit — so a card could not be created
   whole. Add and edit are one form for that reason; splitting them is what let
   them drift apart in the first place.
2. **Balance summary leads the screen** as a full-width panel above the grid,
   rather than sharing a `SplitGrid` row with the panel that was deleted. Inside
   it, `MoneyHeld` (stat + the card-debt and non-base-currency lines) and
   `HeldSplit` (the `StackedBar` + legend) are the two halves of a `SplitGrid`
   that collapses to one column on a phone. Read top-down the legend now names
   the very cards printed under it.

The replacement for syncing, when it comes, is **CSV import** of an m-BCA or Livin'
e-statement — free, and nobody's permission is needed. It belongs to transactions, not
here.

### The sixth departure: a category is a record, not a hard-coded key

The artboard's `CATS` map is eight fixed keys, and the whole app leans on the count:
`CategoryKey` is a union, the seven-step ramp is handed out by position, and
`ICON_BY_CATEGORY` is exhaustive over it. The backend keeps categories in two tables
now, so the list is something people change — and the moment it is, "the seventh
category is `c7`" stops being true.

**What the backend actually holds** (migrations 000020–000024), because the two words
do not mean what they look like: `master_categories` is a global list of **names
only** — id and name, seven rows, Housing through Others — and `categories` is
**per user**, with `master_category_id` (nullable, `ON DELETE SET NULL`), `name`,
`type` (`income` | `expense`), soft delete, and one name per user enforced by a
partial unique index on `(user_id, LOWER(name))`. `SeedDefaults` copies the seven
master rows into a new account at registration, **all as `expense`**, so a fresh user
has no income category at all until they add one. The routes are the full set —
`GET|POST /categories`, `GET|PATCH|DELETE /categories/{id}`, and
`GET /categories/options?slug=filter|budget`, where `budget` narrows to expense.

`/categories` is that list, and it is **a menu of its own, sitting beside Budgets
rather than inside it**. Three reasons, in the order they matter:

- Each is a backend resource with its own table, CRUD and error codes, and the one
  place they touch is `GET /categories/options?slug=budget` — the budget form
  *reading* this list, never owning it. `ON DELETE RESTRICT` on
  `budgets.category_id` is that boundary in SQL: a category with a budget against
  it cannot be removed from the screen that owns categories.
- A menu is the only unit this app grants a permission on. Renaming or removing a
  category reaches every transaction filed under it, so who may do that has to stay
  separable from who may set a limit. (Nothing enforces it yet — `/categories` is
  behind `Authenticate` only, as `/users` and `/roles` still are.)
- Adjacency was never the argument for merging: the menus table already has parent
  groups, and `budgets` sits under **money** (`a0000000-…-0002`). A `categories` row
  in that same parent puts the two under one rail heading with no code at all.

Migration id `b0000000-0000-0000-0000-000000000015` is reserved for it in
`MENU_CATALOGUE`; until that row exists, `/auth/me` returns no such menu and the rail
cannot draw it. The two screens link to each other instead of sharing a page: the
"New budget" panel carries a **Categories** link (and says so in its empty state), and
the category list carries a **Budgets** one.

Four things the screen states rather than assumes:

1. **It states no money figure at all.** What was spent per category is the dashboard's
   donut and the insights ranking; what is left of a limit is the budgets screen. A
   second copy of either would be a number with two owners, and the two would disagree
   the first time one changed. This screen answers only what nothing else does: which
   categories exist, which way each runs, what it is drawn with, and where it came
   from. The stat strip counts rows, not rupiah. **Keep it that way** — the pull to
   add "spent this month" here is exactly the duplication the split was meant to avoid.
2. **The colour is stored, not counted.** `<ColorChoiceField>` asks for a ramp step and
   the editor posts it as `color`, so adding a category above another one does not
   repaint the donut under it. Migration **000026** adds `categories.icon` and
   `categories.color` for it — `VARCHAR(50)` / `VARCHAR(10)`, both `NOT NULL DEFAULT
   ''`, holding the same `""`-means-default contract as `roles.icon` and
   `wallets.icon`, and not nullable only because rows written before them would come
   back NULL into a non-pointer string. `stepOf` resolves `""` from
   `MASTER_DEFAULTS` — the seven master ids are pinned by migrations 000020 and
   000023 — and then, for a category with no master row, `index % 7`. That last step
   is the weak one: past seven, two categories share a step, and two slices of one
   colour cannot be told apart.
   **A colour may also be the person's own.** The last tile of `<ColorChoiceField>` is
   the browser's colour well, and what it picks is stored as `#rrggbb` in the same
   `VARCHAR(10)` — so `ColorKey` is `RampStep | HexColor`, and `colorOrBlank` is the one
   reader of either. A step is a class and follows the theme; a hex cannot be a class
   Tailwind saw at build time, so it is the one inline style in the app, and only ever
   through `paintClass` + `paintStyle` (or `sliceClass` + `sliceStyle` on the donut).
   Spread both — never index `RAMP_BG` with a category's colour. The cost is stated in
   the form: a hex is the same in light and dark, so a colour chosen against one ground
   may sit badly on the other.
3. **The fallback stays.** `Others` (master `…-0007`) is where spending nobody named
   lands and what the add-transaction sheet hangs "name this category" on, so it is
   the one row the sheet will not remove and the one whose type it will not change —
   an income bucket would swallow unnamed spending silently. Nothing else is guarded,
   because nothing else can be: there is no transactions table and no budgets table
   back there to point at a category yet.
4. **Naming Other on a transaction is the same act as adding one here.** The
   add-transaction sheet reveals "Name this category" when the fallback is picked, and
   what it creates joins the same list — one way a category comes into being, not
   two. `getCategoryPicker()` reads the API for exactly that reason: a category added
   on this screen is selectable on the very next transaction.

The reader is `lib/data/category-list.ts` rather than `categories.ts` because that
name is the artboard fixture the ledger still reads. That fixture is also the picker's
fallback when the API cannot be reached: the sheet it feeds saves nothing yet and
every other screen is summed from those same rows, so falling back keeps the mock
whole instead of leaving an empty select. `budgets.ts` and `ledger.ts` are still on
the fixture — making `CategoryKey` dynamic is the next step, not this one, and it is
what will let a budget be measured against a category the API returned.

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
| `WalletEditorProvider` | the add/edit slide-over over `saveWalletAction`, plus the kind select that reveals a card’s fields |
| `CategoryEditorProvider` | the add/edit sheet over `saveCategoryAction`, plus the type select the icon follows |
| `BudgetEditorProvider` / `NewBudgetForm` | the shared budget form over `saveBudgetAction`, and the sheet every row's pencil opens |
| `IconChoiceField` | the catalogue search — a lazy fetch of the index, the query, and the pick it adds to the radios |
| `ThresholdField` | the Notify-me-at segments, the Custom field they reveal, and the line pricing the choice |
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
step cheap: **users, roles, wallets, categories, budgets, the audit log and the
sidebar menus are live** —
they call `ledgerline-backend` through `lib/api/`, and no component changed when they
stopped being fixtures. Every other domain is still a typed fixture behind the same
signature.

Wallets is the one screen served by two calls that must agree: `GET /wallets` for the
cards and `GET /wallets/overview` for the headline. `getWalletsScreen()` awaits both
together and hands back one object, because the summary bar is a split of the very
cards printed under it — read a moment apart, the legend could name a wallet the total
does not count. The overview is summed in SQL, so the totals are never re-derived here;
only the per-wallet shares are, from the same list the cards come from. Both read the
running balance — the same per-wallet expression, reached through a derived table in
`wallet_repository.go`, so a headline summing one figure while the cards print another
is not a state the two can reach. Nothing syncs a balance, so the age of the figure it
started from is measured against `todayInJakarta()` — the real day, not a fixture's
frozen `TODAY`.

**An icon key is a contract, not a picture.** `roles.icon` (migration 000019),
`wallets.icon` and `menus.icon` are each a `VARCHAR(50)` holding a *name this app can
draw* — a sprite symbol or a `lucide:` catalogue icon, never a path, never markup. The
column takes any string, so the contract is kept here, in two strengths.
`iconNameOrBlank` in `lib/icon-choice.ts` checks a sprite name exactly and a catalogue
name by shape only, because it is imported by client forms and the full name list is
two thousand strings none of them needs. `knownIconOrBlank` in `lib/api/icon-key.ts` is
the strict one — it also asks the generated name set — and it is what every action
sends through and every reader draws through, so a name that would render an empty tile
is neither stored nor shown.

`""` is the column's own way of saying "no icon of its own", which is why an action
stores that rather than guessing a default. Only the read path knows enough to resolve
it, and it resolves it differently per domain: `defaultRoleIcon` gives the shield /
group pair the roles list drew before the column existed, `ICON_BY_KIND` gives a wallet
its kind's tile. Every seeded role is still `NULL` there and renders exactly as it
always did.

`<IconChoiceField>` is the one picker every screen uses. Its shortlist is a radio group
rather than a select — the whole point of the field is seeing the icon, and native
radios mean the arrow keys work and the common answers post with JavaScript off. Under
the shortlist a search box reaches the whole catalogue; a match that is picked joins the
radios as the checked one, which is how it posts. It takes `value` +
`onChange` or a bare `defaultValue`, exactly as `<SelectField>` does, because roles want
a plain form while the wallet editor drives it: a new wallet's icon follows the Type
select until someone picks a tile, and then it stops. Each domain names its own
shortlist (`ROLE_ICON_CHOICES`, `WALLET_ICON_CHOICES`) and `withCurrent` appends
whatever the record is already wearing, so a value set through the API stays selectable
rather than silently swapping on the next save.

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
in `ERROR_CODES.md` (generated from `internal/domain/error_codes.go`, which is the one
to read when the two disagree — as they do today: the six `WALLET_*` codes are in the
Go file and not yet in the document); `API_ERROR_CODES`
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

Gaps in the API the screens work around today, each marked where it bites:

- `GET /users` has no `role` or `status` filter, so one `per_page=100` window is
  fetched and the two selects are applied on the server. Past that many accounts they
  need to be real query params.
- `GET /roles` sends an empty `permissions` array — only `GET /roles/{id}` hydrates it
  — so the list shows no grant count and the user editor shows the role's description
  in place of the artboard's inherited-module tags.
- `PATCH /wallets/{id}` reads an absent `credit_limit` or `due_day` as "unchanged", so
  neither can be cleared on a wallet that is still a card — blanking the field in the
  sheet keeps the stored figure, and `CardFields` says so. Changing the kind away from
  `card` clears both, which is the only way back today.
- A transaction has to be kept in the currency of the wallet it names, and its type
  has to match its category's — `TRANSACTION_CURRENCY_MISMATCH` and
  `TRANSACTION_CATEGORY_MISMATCH`, both enforced on create and on patch. The
  add-transaction sheet posts `IDR` whatever wallet is picked, so the USD Paypal wallet
  is now refused rather than filed where no balance would ever count it. The fix is for
  the sheet to offer base-currency wallets only, or to post the chosen wallet's own
  currency; `GET /wallets/options` answers `{id, name}` and cannot say which is which,
  so that narrowing needs the field added there.
- Spending past what a wallet holds is allowed on purpose. A stated balance is a claim
  about a date, so refusing a real entry against a possibly stale figure would only
  punish recording late — it reads as a negative balance and an **Overdrawn** line
  instead of an error.
- Nothing under `/wallets` is written to the audit log: `walletService` is handed an
  `AuditLogRepository` and never calls it, so adding, editing and removing a wallet
  leave no trail the way a user or a role does.
- Actions are dotted codes (`auth.login`) and the backend ships no label for them,
  unlike modules and severities. `lib/audit-labels.ts` names the ones it knows and
  prettifies the rest, so a newly recorded action reads sensibly without a release.
- `GET /categories` returns the list whole and does not page. Fine for a household's
  handful; past that it needs the same `page` / `per_page` the other lists take.
- `DELETE /categories/{id}` checks budgets and nothing else. `CategoryService.Delete`
  refuses with `CATEGORY_IN_USE` while a budget limits the category, but a category
  with transactions filed under it soft-deletes cleanly — and every budget read joins
  `categories` on `deleted_at IS NULL`, so what was filed under it stops being counted
  anywhere. The rest of what the sheet states (the Others bucket itself) still lives
  only in the client.
- A new account is seeded with the seven master rows **all as `expense`**, so it has
  no income category until someone adds one. Nothing in the API says which row is the
  fallback either — the client reads that off `master_category_id` being `…-0007`.
- Nothing under `/categories` is written to the audit log, the same gap `/wallets`
  has — and it bites harder here, since a rename reaches every transaction filed
  under the category.
- **`spent` is summed from transactions now.** `spentThisCycle` in
  `budget_repository.go` sums the expense rows of the budget's own category *and*
  currency inside the calendar month, negated because the table stores an expense
  negative. It replaced the literal `0::bigint AS spent`; nothing on this side
  changed but the numbers, which is what the wiring was for.
- **`rollover` is computed too, with three limits worth knowing.** `carried_over`
  is last cycle's unspent amount and nothing older, because `budgets` keeps no
  history of `monthly_limit` — last cycle is measured with *today's* limit, so
  raising a limit enlarges the carry it hands this cycle. It is clamped at 0, so
  last cycle's overspend is not carried as a debt. And it is 0 in the cycle a
  budget was created in, which is the only reason a brand-new rollover budget does
  not start on a doubled limit. `remaining`, `used_percent` and `is_over` all
  answer against `monthly_limit + carried_over`, while `total_budget_allocated`
  and the overview's `shares` stay the plan alone.
- `GET /budgets` and `/budgets/overview` take no `?period=`; the service reads
  `time.Now()` in the server's own zone, so the cycle is the server's month rather
  than Jakarta's. It only shows near a month boundary, and only until the endpoint
  takes a period. The two halves do not even read the same clock: `spent` and
  `carried_over` are windowed by Postgres's `date_trunc('month', NOW())`, while
  `days_left` and `cycle_elapsed_percent` come from Go's `time.Now()`.
- `GET /budgets` returns the list whole and does not page, as `/categories` does.
- Nothing under `/budgets` is written to the audit log, the same gap `/wallets` and
  `/categories` have.
- `GET /categories/options` answers `{id, name}` only, so it cannot say which
  categories already have a budget. `toChoices` subtracts the budget list on this
  side; past a household's handful that belongs in the query.
- There is no `GET /menus`. `/auth/me` returns only the menus the signed-in role may
  *read*, which is the right list for the rail and the wrong one for the role editor,
  so `MENU_CATALOGUE` in `lib/access/menus.ts` carries the ids migration 000008 pins.
  Delete it the day that endpoint exists.

### The ledger is the only place a money figure is typed

The artboard hand-wrote its rows *and* its totals, and the two never agreed: its
fourteen transactions add up to Rp6.958.000 against a headline of Rp12.780.000,
its recurring rows to Rp5.705.000 a month against a stated Rp5.891.000, and its
balance card claimed +3.4% on a month that kept Rp8.670.000 — a figure no
opening balance can make true. So the totals were deleted, and August 2026 was
written out in full instead: 54 rupiah rows in `lib/data/transactions.ts`, plus
two in USD on the Wise account that is kept in it.

`lib/data/ledger.ts` is the one reducer over those rows, and **nothing
downstream of it states a money figure of its own**. The dashboard's four stats,
both trend charts, the donut, what each budget has spent, the insights ranking
and every subtitle that counts something are all the same rows asked a different
question, so a figure on one screen cannot disagree with the same figure on
another. Adding a transaction moves all of them at once, which is the whole
point — and the day `getTransactions` starts calling the API, only the reader
under `ledger.ts` changes.

Four things are genuinely input rather than derived, and each says so where it
sits: the `limit` and `threshold` on a budget (someone chose those), the
`OPENING_BALANCE` August started from (a month of movements says how much the
balance changed, never what it started at), the five month-end rollups before
the ledger begins, and the recurring schedule's `dueDay` + `amount`.

Two of the artboard's own bugs were fixed on the way and must stay fixed: the
bar under "August allocated" now splits the *limits* rather than the spending
donut it was drawing, and a budget turns amber at its own stated threshold
rather than at one flat 85% for every row. Weekdays are derived from the row's
ISO date — every one the artboard printed was a day out.

**A row states what it is quoted in, and a total never crosses that.** Every
`Transaction` carries a `currency`, and it is stored on the row rather than
inherited from the wallet, because a Wise account holds several at once. The
`WalletName` union already had `Wise USD` in it while the ledger printed every
figure through a rupiah-only helper, so dollars were being added to rupiah and
the answer shown with an "Rp" in front — the same guess the wallets summary
refuses to make. So `formatSignedRupiah` is gone: `formatSignedMoney(amount,
currency)` is the one way a row prints, and there is no rupiah-only signed
helper left to reach for by accident.

Anywhere rows are summed the answer is a `MoneySum[]`, one total per currency,
never a number. The transactions overview reports the base currency at stat
weight and puts the rest in the card's `note` — "Plus $1.180,00, unconverted" —
and a day heading prints its nets side by side rather than adding them. The
rupiah bounds on the Amount filter exclude a non-base row rather than pretend to
measure it, since "Under Rp100.000" cannot be true or false of twenty dollars.

`ledger.ts` reduces `rowsThisMonth`, which is the base currency alone, so the
dashboard, the donut, what a budget has spent and the insights ranking are the
rupiah rows and nothing else — that filter is what an exchange rate would one
day replace. `entryCount` and `walletCount` are the exception and read
`allRowsThisMonth`: they count rather than add, and a subtitle saying "54
entries" over a "Shown: 56 entries" card is two numbers disagreeing about rows
the reader can see.

### A budget is a limit somebody chose, and nothing else

Its `monthly_limit`, `alert_threshold_percent`, `is_fixed` and `rollover` are input;
what it has spent is summed per cycle by the backend and never stored. `budgets`
(migration 000027) holds one row per category, enforced by
`budgets_user_category_unique_idx`, with the fixed rule in SQL as well as in the
form: `budgets_fixed_threshold_check` refuses any threshold but 100 on a fixed row.

**A carry moves the denominator, so every line that uses it says so.** `rollover`
was a stored flag with no consequence until the backend started summing
transactions; now a budget that underspent last cycle arrives with `carried_over`
beside its `spent`, and `remaining`, `used_percent` and `is_over` are all measured
against `monthly_limit + carried_over`. So that sum is what a card states the
spend against — `spendableOf` in `lib/data/budgets.ts`, the mirror of
`Budget.EffectiveLimit()` in the service — because "Rp30.000 of Rp2.000.000"
beside "Rp3.470.000 left" is two answers to one question. Naming the rest is the
other half of that: the meta line reads "Rp1.500.000 rolled over" in place of
"rolls over", the allocation panel prints "plus Rp800.000 rolled over" under a
total that is still the plan alone and tags the share "of allocation + rollover"
rather than quoting a denominator it did not divide by, and `alertNote` prices the
threshold against the carry too, since that is the figure the alert will fire on.
A budget with rollover on and nothing carried in still says "rolls over" — that
is the setting, and it holds for the cycles after this one.

**Two calls serve the screen, and `getBudgetsScreen()` awaits them together** —
`GET /budgets` for the cards, `GET /budgets/overview` for the panel above them —
for the reason `getWalletsScreen()` does: the header states the sum of the very
cards printed under it, and read a moment apart the two could disagree in front of
somebody who can add six figures themselves. A failure on either empties the whole
screen; only `GET /categories/options?slug=budget` degrades on its own, because it
feeds nothing but the "New budget" panel, which then says why it is offering
nothing.

**Every percentage is the backend's whole number, used as it arrives.** `toneFor`
here and `budgetAttention` in the service compare the same two integers —
`used_percent` against `alert_threshold_percent` — so a card cannot be amber while
the attention list above it stays silent. Re-deriving a ratio on this side is how
that pair would come apart, which is also why the overview's `shares` are taken as
apportioned rather than recomputed: the backend already gave the rounding leftovers
to the last share so the ribbon closes.

**Notify me at is a threshold, not a menu of three.** The artboard offered 70/80/90
— 70% was used by nothing, and the 75% Utilities was already set to could not be
reached at all. `THRESHOLD_PRESETS` is now the values actually in use (75/80/90) and
`Custom` reveals a field for everything else, read by `parsePercent`, which answers
`null` rather than 0 for the same reason `parseFigure` does: a threshold read as 0%
would alert on every budget at once and give no sign that it failed. The presets post
`alert_threshold` as native radios, so the three common answers still work with
JavaScript off; only Custom needs it. Under the control sits the figure the
percentage lands on, because nobody thinks "85%" — they think about when they will be
told, and the limit is already on screen to say it with.

Add and edit are one `<BudgetFields>`, the lesson wallets already records. It matters
twice over here: before this a threshold could only be chosen at creation, and the
six budgets that already existed had no edit affordance at all. A budget's category
cannot be changed, because the pairing of a category with a limit is what the budget
*is*; and only the seven spending categories can be budgeted, since a budget for
anything a transaction cannot carry would read Rp0 for ever — the artboard's own
select offered Education, Travel and Gifts & donations, none of which qualify.

**The track shows where the threshold is.** A row states "Alerts at 80% of limit" in
words and then draws a bar that said nothing about where 80% fell — the one number
deciding when the row turns amber was invisible on the thing measuring it, which
started to matter the moment the threshold became free text. `<ProgressTrack marker>`
scores it. The tick stands 4px proud of the track at both ends on purpose: tinted to
read against the rail it would vanish on a pale fill, and tinted for the fill it would
vanish on the rail, so it is drawn where neither can hide it. Shading the rail past the
threshold instead was tried and rejected — quieter, but it reads as a smudge rather
than a mark, and it disappears exactly when the fill is deep enough to matter.

**A settled fixed payment greys out.** Taking rent out of amber was right; leaving it
the same colour as a budget at 62% was not — "paid in full" is a state, not the absence
of one. A fixed commitment that has landed takes the `muted` tone and its tag reads
**Paid** rather than "100%", because a percentage of a single payment says nothing: it
is paid or it is not. The eye should pass over what is done and stop on what is not,
which is also why the attention list names the two tones it wants rather than excluding
the one it does not.

**A fixed payment has no approach to warn about.** Rent goes from nothing to its whole
limit in one transaction, so a threshold on it fires every month, for ever, with
nothing to be done — an alarm that always sounds is the same as none. `isFixed` takes
such a budget out of amber entirely: it reports only when it goes *over*, which on a
fixed commitment means the amount itself changed, and that is the thing worth being
told. The editor hides the threshold control for one, and `budgetsSubtitle` quotes the
lowest threshold among the budgets that still have one. Raising the threshold to 100%
instead does not work — `toneFor` warns at `>=`, and rent lands on exactly 100%.

**What has been spent is a fact, not a caption.** The artboard set it as an 11.5px
muted line under the allocation bar — the smallest text on the panel, for the figure
the screen is opened to read. It is an `InsetBlock` now, with the amount at stat
weight and the share as a `Tag`, so it reads as its own statement rather than a
footnote on the total above it. Under it sits the pace: a share of the allocation
means nothing alone, and 90% spent with 87% of the cycle gone is the sentence someone
can act on, so the overview's `cycle_elapsed_percent` supplies it. The amount stays
`text-text` — tinting spend green when it is on plan would collide with `--income`,
which in this app means money coming *in*.

**A budget has no icon of its own, and the form does not ask for one.** The tile
and the ramp step both ride in on the category — `BudgetResponseDTO` carries the
category's `icon` and `color`, and a category with neither falls back to
`ICON_BY_CATEGORY_KIND.expense` and to its position in the ramp. Asking twice is
what would let one category read two ways depending on which screen you were on,
so the choice lives on `/categories` and nowhere else. That is also why the ramp
step is *stored* rather than counted: adding a budget above another one must not
repaint the bar under it.

`lib/format.ts` owns money formatting. The artboard's `F()` is
`'Rp' + Math.abs(n).toLocaleString('de-DE')` — Indonesian dot grouping, with the sign
carried separately as `+ ` / `− ` (U+2212 minus, not a hyphen). Always use the helper.

---

## 5. Icons

Lucide, 24×24, `stroke-width:2`, `stroke-linecap/linejoin:round`, on `currentColor`.
They ship as one sprite: `<IconSprite />` renders the `<symbol>` set once in the root
layout, and `<Icon name="wallet" />` renders `<svg><use href="#i-wallet" /></svg>`.

`IconName` is a union type — adding an icon means adding a symbol *and* the name. Never
paste raw `<path>` data into a screen.

**The sprite is the app's chrome; the catalogue is what a person may pick.** A wallet, a
category or a role can wear any Lucide icon, and 2,141 of them cannot ride in a sprite
inlined on every page. So they live in two static files under `public/icons/`, written
by `npm run icons` from `lucide-static` and committed:

- `lucide-<version>.svg` — every icon as a `<symbol>` (≈98 KB gzipped). `<Icon>` points
  `<use>` at it, so the browser fetches it the first time a catalogue icon is drawn and
  never again.
- `lucide-<version>.json` — `[name, tags]` rows (≈44 KB gzipped). `<IconChoiceField>`
  fetches it the first time its search box is used, never with the page, and matches a
  query against the name and the tags in the browser, drawing 60 results at most.

The version is in the file name because `next.config.ts` serves `/icons/*` immutable,
and `proxy.ts` leaves that path alone — a redirect to `/sign-in` is not a JSON index.

A catalogue icon is stored **with its prefix**, `lucide:piggy-bank`, and `IconKey` is
`IconName | CatalogueIconName`. The prefix is not decoration: the sprite's names were
coined here (`gear`, `cup`, `bag`), several collide with a Lucide icon that is a
different drawing, and a bare name must keep meaning the sprite for every row already
stored. The longest is 45 characters, inside the columns' `VARCHAR(50)`. Decorative icons get `aria-hidden`; an icon that
is the only content of a control needs an accessible name on the control.

---

## 6. Routes

```
(auth)/  sign-in · register · reset-password        no app shell
(app)/   layout = nav rail + AppHeader
         /                    Dashboard
         /transactions  /budgets  /wallets  /categories  /goals  /recurring
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

**Every fill grows; none of them snap.** `animate-grow-x` is the one way a track fills,
so it belongs to the primitive rather than the screen: `<ProgressTrack>` carries it, and
`<StackedBar>` wraps its shares in a single element that carries it, so the whole ribbon
wipes in from the left as one. Animating each share on its own does not work — a
transform leaves the laid-out width behind, so the shares would grow in place and the
empty rail would stripe through between them. A hand-rolled `.track` + `.track-fill`
pair is therefore always a bug: it loses the animation and duplicates the primitive.
Use `<ProgressTrack>` and override the height with a `h-*` utility, which wins over the
components layer, as `/mobile` does for its 6px rails.

The whole set is disabled under `@media (prefers-reduced-motion: reduce)` — that block is
copied from the artboard and must not be dropped.

Focus is never the browser default:
`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`.
The `.input` focus ring is the accent border plus a 3px accent-18% halo, per the artboard.
