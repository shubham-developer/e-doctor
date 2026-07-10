<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:codebase-conventions -->
# Codebase conventions

These conventions were established while reworking the pharmacy module and apply project-wide to all new/touched code, not just pharmacy.

## Client-side API calls
- Never call `fetch()` directly in components. Use `apiClient` from `@/lib/apiClient` (`get`/`post`/`put`/`patch`/`delete`) — it wraps `fetch` + JSON parsing once instead of repeating `fetch(...).then(r => r.json())` boilerplate everywhere.
- Responses follow `{ success, data, error? }`. Check `data.success` before using `data.data`; show `data.error` via toast on failure.
- Lookup/reference data for dropdowns (doctors, charges, pharmacy masters, dosages, medicines) comes from the React Query hooks in `@/lib/lookups` (`useDoctors`, `useCharges(module?)`, `usePharmacyMasters(type)`, `useMedicineDosages`, `useMedicines`) — don't fetch these endpoints ad hoc in components. The query cache dedupes concurrent requests and survives modal reopens; load failures toast automatically via the global `QueryCache` handler in `lib/queryProvider.tsx`.
- Any mutation that changes lookup data must invalidate its query key (e.g. `queryClient.invalidateQueries({ queryKey: ["doctors"] })`), or dropdowns serve stale options for up to the 5-min staleTime.

## Types
- Single-use types stay local to the file that uses them — don't extract "just in case."
- Types shared across multiple files must be defined once and imported, not copy-pasted. Copy-pasted types drift silently (e.g. one file's `Medicine` missing fields another file's has) — that's a real bug waiting to happen, not just style.
- Cross-module shared types go in `lib/types/<domain>.ts` (e.g. `lib/types/pharmacy.ts`). Types shared only within one module's own component split go in `components/<module>/types.ts`.

## Currency / money formatting
- Never format money with bare `n.toFixed(2)`. Use `formatAmount(n, tenant?.currency)` (or `useCurrency()`) from `@/lib/context`.
- Grouping is locale-aware: `en-IN` (lakh/crore, e.g. `1,20,200.00`) for `INR`, `en-US` (`120,200.00`) for every other tenant currency.
- When displaying an amount, prefix with the tenant's actual symbol (`tenant?.currencySymbol`, fallback `'₹'`) — formatted number alone is not enough (this was a real bug in the printed bill receipt).

## Component architecture
- `app/**/page.tsx` files should be thin shells: own top-level state, own data that's shared across child components (e.g. dropdown lookups needed by a modal), and compose components. They should not contain the modals/lists/forms themselves.
- One component per file under `components/<module>/`. Split a page into components as soon as it holds more than one logical modal/form/list, rather than letting everything accumulate in one page file.
- Dropdown lookup lists don't need lifting to parents anymore — the `@/lib/lookups` React Query hooks cache them, so components can call the hooks directly. Lifting still applies to non-lookup data a parent genuinely owns and shares (e.g. the record being edited).

## Common component reuse
- Record lists (paginated, sortable, searchable) must use `DataTable` (`@/components/ui/data-table`) — never hand-roll a `<table>`. Exception: static read-only line-item breakdowns inside a detail/receipt dialog (e.g. `components/pharmacy/BillDetailsModal.tsx`, inventory purchase/issue line items) and inline-editable order-line grids (per-row `Select`/`Input` cells) may use a raw `<table>`, since `DataTable` has no footer-row or inline-edit support — match that existing pattern rather than inventing a new one.
- Add/Edit modals and simple detail/view dialogs must use `FormDialog` (`@/components/common/FormDialog`) instead of hand-rolling `Dialog`+`DialogContent`+`DialogHeader`+`DialogTitle`+footer markup. Pass the title via `title`, footer buttons via `footer`, and put the form/body in `children` (wrap it yourself in `px-5 py-4 space-y-*` — `FormDialog` doesn't add body padding). Field labels inside it use `<Label>` from `@/components/ui/label`, not a raw `<label className="...">` string.
- Paginated lists must use `TablePagination` (`@/components/common/TablePagination`) instead of hand-rolled Prev/Next buttons, so pagination controls/text read the same across modules.
- Don't duplicate navigation the sidebar's nested menu already provides. If a module's sub-routes (e.g. Inventory's Items/Purchases/Issues/Vendors/Categories) are already listed as `children` in `lib/nav.ts`, the page itself should not also render its own tab/link bar for those same routes.
- Don't render a page-level `<h1>` that just repeats what the Topbar breadcrumb (`components/layout/Topbar.tsx`, driven by `lib/nav.ts`) already shows for that route. Keep only elements that add real information (status badges, counts, refresh state, subtitles) — check `bed-setup`/other no-title pages in `app/dashboard/settings/` for the pattern.

## Typography / headings
- Body text: `text-xs`/`text-sm` for tables and dense UI, `text-2xs` (custom, 0.625rem) only for micro-labels/badges that need to go below `text-xs` — never a `text-[Npx]` arbitrary value.
- `<h1>` — module/page title (the title of a route's top bar, e.g. "Patient List", "Billing"): `text-lg font-semibold text-gray-800`.
- `<h2>` — non-modal section/card header nested inside a page (e.g. "Roles", "Supplier List"): `text-sm font-semibold text-gray-800`.
- Modal/dialog titles: use `<DialogTitle>` from `@/components/ui/dialog` with no className override — it already renders `text-base leading-none font-medium` and wires up `aria-labelledby` for accessibility. Don't hand-roll an `<h2>` inside a `<Dialog>`; every `<Dialog>` usage should have exactly one `<DialogTitle>`.
- Hand-rolled (non-`<Dialog>`) modal overlays should still match `text-base font-medium` for their title so they read consistently with real dialogs, even though they can't use `<DialogTitle>` itself.
- `<h3>` uppercase eyebrow/stat-label (e.g. card labels like "Total Collection"): `text-xs font-semibold text-gray-700 uppercase tracking-wide`.
- Entity-name headers (e.g. patient name in a detail-page top bar): `text-sm font-bold text-gray-900 uppercase tracking-wide truncate` — distinct from the plain page-title role above because it's user-generated, variable-length data, not a static label.

## SearchableSelect (`@/components/ui/searchable-select`)
- `className` only styles the outer wrapper `<div>` — it does NOT reach the trigger `<button>`. Use `triggerClassName` to size/style the actual visible trigger (e.g. `"h-8 text-xs px-2"` for compact table rows).
- The trigger's selected-label text sets its own color explicitly (`text-gray-900` when selected) so it stays visible even inside a `text-white` ancestor (e.g. a colored top bar) — don't remove that in favor of inherited color.

## Search inputs / lists
- Any search box wired to a server-side fetch (via `DataTable`'s `onSearchChange` or similar) must be debounced (~300ms) before triggering the request. Keep a `searchInput` (raw, drives the input) separate from the debounced `search` (drives the fetch).

## Database
- The MongoDB instance here is standalone, not a replica set — multi-document transactions (`session.withTransaction()`) are NOT available and will throw if used. Verify with `mongosh <uri> --eval "db.hello().setName"` before assuming transactions work.
- Where you'd normally wrap dependent writes in a transaction (e.g. deduct stock + create a bill), use compensating writes instead: perform the risky write first, and if the dependent write fails, explicitly revert it in a `catch`.
<!-- END:codebase-conventions -->
