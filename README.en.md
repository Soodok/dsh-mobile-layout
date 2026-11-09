# dsh-mobile-layout

> English docs ｜ [中文版](README.md)

[![CI](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/ci.yml/badge.svg)](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/ci.yml)
[![Release](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/release.yml/badge.svg)](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@xiaopb/dsh-mobile-layout?label=npm)](https://www.npmjs.com/package/@xiaopb/dsh-mobile-layout)

**DSH phone / tablet touch layout plugin (v0.4.12)**

Docs: [Architecture](docs/architecture.md) ｜ [Technical notes](docs/technical-notes.md) ｜ [Theme token contract](docs/theme-tokens.md) ｜ [Presets](docs/preset-v2.md) ｜ [Changelog](CHANGELOG.md) ｜ [中文版](README.md)

A Cordis plugin that turns the DSH web client into a one-handed, touch-first layout on **phone portrait** screens — **without modifying the official kernel or replacing the official layout plugin**. Outside phone portrait, landscape and desktop keep the official layout pixel-for-pixel; **tablet / wide screens (since 0.4.8) only gain one extra sidebar swipe gesture**, with the official layout untouched.

---

## Features

- **Sidebar → Drawer**: swipe right from anywhere in the left ~60% of the screen (QQ-style, mid-left start — full-screen gesture phones reserve the hard edge for system back); **finger-following drag with velocity/position snap on release**; tap-mask or left-swipe to close. Gesture is the only entry — no button (so it never covers a sub-page's own back button); the listener lives on `window` in the capture phase and works on every plugin page. Auto-collapses only on real navigation (blank taps, search, account menu, etc. stay open).
- **Bottom action bar**: new / chat / file / image / plugins / more, pinned right above the composer.
- **Add panel**: **reveal / cover transition** against the soft keyboard (content-adaptive height; the keyboard slides over to cover the panel and slides away to reveal it, with the input row position preserved via viewport-jump compensation — no animation crossing); open/close slide animations (skipped automatically for reduce-motion users); a 4×2 icon grid with horizontal paging beyond 8 items; icons are **color-coded by function** (12 soft tints across blue / orange / violet / green — same type keeps the same color, no clashes on screen, new items auto-assigned by alias hash).
- **Sessions / plugins sheets**: grouped by workspace with sticky headers and relative timestamps, capped at 64% of screen height; **drag the grabber down to dismiss**, styled after the engine's v1.4.57 official sheet (28px corners, raised surface, large title, pill primary action).
- **Composer merged into the bottom panel**: flat, full-width, single 1px divider; tightened empty state; permission & model short-name chips stay on the input row (**"Full access" is always red**, in both Chinese and English).
- **Fullscreen settings when managed**: enhanced Native, Merged and Floating use a brand row, swipeable tabs and back button; Native `minimal` keeps the official dialog untouched. Swipe left/right on the content area to switch tabs; only a right-swipe from the leftmost tab exits the panel.
- **Restyled pickers**: model / permission sub-menus become bottom-sheet lists with the theme-blue selected state; no soft keyboard pops up when a picker opens in the empty state (search-box autofocus guard — tapping the search box still focuses normally).
- **Exclusive overlays + history stack**: drawer / bottom sheet / add panel never stack; closed layer-by-layer. The add panel is also mutually exclusive with the soft keyboard in both directions (opening it first drops composer focus; tapping the input while the panel is open closes the panel first, and the keyboard rises only after the panel is gone).
- **Three layout presets**: **Native** (stock DSH) / **Merged** (composer joined with the bottom bar) / **Floating** (mobile-app form), one tap in Settings, see below.
- **Tablet wide-screen sidebar gesture** (since 0.4.8): on tablets / wide windows the sidebar is a persistent column that collapses into a narrow rail — **swipe left to collapse, swipe right to expand, starting anywhere in the left half of the screen** (threshold-triggered official toggle and transition, no finger-following); while an official modal dialog is on screen the gesture yields entirely, and swipes starting in the right half belong to the content. Shared engine with the phone drawer gesture; desktop hosts never enable it.
- **Live i18n**: every self-drawn label (layout-mode cards, bottom nav, panels) refreshes **instantly** when the official language changes — no restart needed; falls back to `<html lang>` / system language.
- **Token & compatibility contracts**: size/color tokens have a machine-readable catalog, reference CSS and override guide; official data-* / ARIA dependencies and feature probes are registered and checked for drift, with missing features degrading independently.
- **Accessibility & motion**: `aria-modal`, focus in/out, honors system "reduce motion".

### Three layout presets (Native / Merged / Floating)

The three layouts are **Native / Merged / Floating**: Native is DSH untouched; Merged joins the composer and the bottom bar into one block (v1); Floating lifts the composer card and adds a five-item nav (v2). There is exactly one place to switch: **Settings → General → Layout mode, right under Appearance**, offering three cards with mini wireframe thumbnails. Switching is instant, round-trips cleanly, and **plugin-provided config pages** (e.g. pet config, plugin market) are handled as well.

- **Native**: hands the layout back to DSH; the default `minimal` setting keeps the official settings dialog untouched. `enhanced` is an optional phone-only fullscreen takeover (brand row, swipeable tabs and back button); tablets / desktops always keep the official two-column dialog. The only attachment exception is one paperclip button that opens a nearby "Choose image / Choose file" menu. It appears inside the App across phone/tablet, portrait/landscape and fullscreen/windowed forms, but never on desktop hosts.
- **Merged**: composer and bottom bar joined into one block; empty-session card styling uses a stable plugin-owned state marker instead of a transient host class variant.

Floating is the **mobile-app form factor**: a five-item bottom nav acts as the page switcher, the composer floats, and the add panel becomes a two-level menu.

- **Five-item nav**: Sessions / Automations / Plugins / Workbench / Settings, using DSH's own icon set; the current page is tinted with the official blue (`--dsw-alias-state-business-primary`). Sessions acts as "go home" — from other pages it returns to the session page; tapped again on the session page it opens the session sheet. Plugins / Automations / Settings are **pages**, not sheets, so the nav stays put (tapping the active one returns to the session). **The per-page swap belongs to the capsule style only**: with capsule the session page becomes Sessions / Plugins / Permission / Model / More; the transparent dock always keeps the five destinations above, with no More / Back page.
- **Workbench**: toggles the official right panel (`sidebarRight.toggleExpanded`); at phone widths the official code makes it fullscreen and the panel leaves room for the nav; **swipe sideways to dismiss**, and from a plugin/automation page it closes that page first.
- **Add panel (self-drawn)**: level 1 has three attachment tiles (**image / camera / file**) plus one row per official section; tapping a section opens level 2. The command UI service supplies localized labels, descriptions and sections, but a row is shown only when its official DOM action also exists. Clicks still go through the official node, preserving upload, permission and picker behavior.
- **Cover-style drawers**: add / model / permission / workspace pickers slide up over the page instead of pushing content up; the session sheet is a fixed 55% of the viewport, leaving blank space when there are few rows.
- **Native conversation body**: the message list, dates, tool-call rows, code blocks and thinking / step rows are rendered entirely by DSH's own components — no injected nodes, no tagging, no font / line-height / spacing overrides, no date separators or collapse toggles. `[data-dshm-center]` is only a layout anchor. The single exception is the **user message bubble** in dark mode: only the official `--dsw-specific-bubble` token is overridden (theme blue mixed at 30%), never the structure.
- **Transparent bottom bar**: no fill and no divider, so the composer's soft shadow can spill into the nav row instead of being cut off.
- **Capsule dock style (optional)**: the dock can also float as a rounded capsule (official card surface + 1px outline + official panel shadow) with a drawer grabber at the bottom — one tap collapses the nav items, another restores them. Collapsing is a user action one tap away from the full nav, so page-switching semantics are unchanged. The transparent dock stays the default; entry: Settings → General → Layout mode → "Dock style" under Floating, remembered per device. Dock height is driven by `--dshm-v2-nav-total` (default `var(--dshm-v2-nav)`, i.e. the nav row), so the extra grabber row needs no hardcoded offsets.
- **Engine status band**: the host's own "engine ready" band is a native view (not in the DOM, not styleable, does not resize the viewport). `--dshm-engine-bar` (default 56px) reserves its height for panel headers; set it to `0px` if you always collapse the band first.

## Why it's good

| | |
|---|---|
| **Zero intrusion** | All styles are scoped under `data-dshm-mode="mobile"`; uninstall or anchor failure restores the official layout. |
| **Single-file build** | `lib/client.js` is the shipped artifact — no build step, no runtime dependencies. |
| **Conservative by form** | Detects three hosts (Android shell / desktop Electron / browser); the desktop DeepSeek Harness app **never activates** the mobile layout at any window size. Layout changes apply to phone portrait only; tablet / wide screens (since 0.4.8) gain only a swipe gesture, with the official layout untouched pixel-for-pixel. |
| **Touch-first** | 44px touch targets, swipe gestures, one-handed reach; finger-following drawer on phones, threshold-triggered sidebar on tablets. |
| **Stable theming** | Hash-based tint assignment — new feature icons are colored automatically, no code change. |
| **Adaptive geometry** | Gutters / radii / heights are all CSS variables (`clamp()` + safe-area insets) — no hardcoded px, scales across devices. |
| **Hardcoded-value guard** | CI scans the injected styles for fixed px layout values; **any new violation fails the build**, legacy ones live in a baseline that shrinks over time. |
| **Verified on device** | Three presets, settings modes, the add panel, feature probes and service binding checked on Medium Phone API 35; **262** CI unit tests pass. |

---

## How it works

![How dsh-mobile-layout works](docs/assets/diagram-overview.svg)

## Screenshots

> Real device screenshots of v0.4.0 on the MuMu emulator (physical 720×1280, CSS viewport 400×684), light theme. Full page galleries per preset: [Native](docs/preset-default.md) ｜ [Merged](docs/preset-classic.md) ｜ [Floating](docs/preset-v2.md).

<table>
  <tr>
    <th align="center"><a href="docs/preset-default.md">Native (stock)</a></th>
    <th align="center"><a href="docs/preset-classic.md">Merged (v1)</a></th>
    <th align="center"><a href="docs/preset-v2.md">Floating (v2)</a></th>
  </tr>
  <tr>
    <td align="center"><img src="docs/assets/screens/preset-default/home.png" width="200"><br><sub>Home</sub></td>
    <td align="center"><img src="docs/assets/screens/preset-classic/home.png" width="200"><br><sub>Home</sub></td>
    <td align="center"><img src="docs/assets/screens/preset-v2/home.png" width="200"><br><sub>Home</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/assets/screens/preset-default/settings.png" width="200"><br><sub>Settings (full-screen since 0.4.7)</sub></td>
    <td align="center"><img src="docs/assets/screens/preset-classic/settings.png" width="200"><br><sub>Settings · layout mode</sub></td>
    <td align="center"><img src="docs/assets/screens/preset-v2/settings-general.png" width="200"><br><sub>Settings · layout mode</sub></td>
  </tr>
</table>

Archived screenshots of the early release (v0.1.6, single-column v1 layout) live in a separate page: [docs/archive-v0.1.6.md](docs/archive-v0.1.6.md).

---

## Version Compatibility

> "DSH version" below refers to the host core / official UI layout package `@deepseek-ai/dsh-client-ui-layout`, **not** the Android app's `versionName`. Evidence and declaration semantics: [technical notes §3.15](docs/technical-notes.md).

### Plugin version → supported DSH versions

| Plugin version | `engines.dsh` | `dshReleases` entries | Verified DSH versions | `0.2.2-rc.1` | Notes |
|---|---|---|---|---|---|
| **0.4.12** (current) | `>=0.2.1-rc.2` | `0.2.1-rc.2`, `0.2.1-rc.5`, `0.2.2-rc.1` → `compatible` | `0.2.1-rc.2` / `0.2.1-rc.5` / `0.2.2-rc.1` | ✅ compatible | Dock style-layer isolation (transparent restores the five destinations / capsule keeps per-page items), native dialogue body and command cards, dark-mode capsule blue shadow + edge highlight, gray TAB and settings-picker highlights, dark-blue user bubbles; use 0.4.12 for installs and upgrades |
| 0.4.11 | `>=0.2.1-rc.2` | Same releases (`compatible`) | Same verified versions | ✅ compatible | Capsule form (header card / centered segmented control / one-line composer / popover lift / thinking-step collapse); superseded by 0.4.12 |
| 0.4.10 | `>=0.2.1-rc.2` | Same releases (`compatible`) | Same verified versions | ✅ compatible | Three-preset hardening, command candidate metadata, stable empty-state marker, token / contract / drift gates; superseded by 0.4.12 |
| 0.4.9 | `>=0.2.1-rc.2` | Same releases (`compatible`) | Same verified versions | ✅ compatible | Add-panel takeover timing, click and preset-cleanup fixes |
| 0.4.7 | `>=0.2.1-rc.2` | `0.2.1-rc.2`, `0.2.1-rc.5`, `0.2.2-rc.1` → `compatible` | `0.2.1-rc.2` / `0.2.1-rc.5` / `0.2.2-rc.1` | ✅ **first adapted release** | Official `data-shortcut-modal` contract + `settings.general.item` slot; unified full-screen settings for all three presets; unknown engines degrade to `safe` |
| 0.4.4 – 0.4.6 | `>=0.2.1-rc.2` | `0.2.1-rc.2`, `0.2.1-rc.5` → `compatible` | `0.2.1-rc.2` / `0.2.1-rc.5` | ❌ incompatible (unlisted = `unknown`) | On 0.2.2-rc.1: layout-mode picker breaks, the native preset settings page becomes a clipped floating window, and the settings page cannot be closed. Upgrade to 0.4.8 |
| 0.1.6 – 0.4.3 | `>=0.2.1-rc.2` | none (field added in 0.4.4) | `0.2.1-rc.2` / `0.2.1-rc.5` (historical results carried into 0.4.4) | ⚠️ unverified | Only a range declaration, no per-release entry; not recommended for newer engines |

### DSH version → recommended plugin version

| DSH / official UI layout | Host app | Recommended plugin | Verdict |
|---|---|---|---|
| `0.2.2-rc.1` | Android app 1.5.0 · BUILD `2026.11.06-4566c0be` | **≥ 0.4.12** | ✅ Verified on AVD; do not use 0.4.6 or older |
| `0.2.1-rc.5` | — (no recorded mapping) | 0.4.12 (0.4.4 – 0.4.11 also work) | ✅ `compatible` |
| `0.2.1-rc.2` | — (no recorded mapping) | 0.4.12 (minimum declared line) | ✅ `compatible` |
| Other / unlisted | — | 0.4.12 | ⚪ `unknown`: no settings takeover, `safe` degradation; force with `localStorage['dshm-compat'] = 'safe'` |

**Declaration semantics**: `engines.dsh` drives install-time checks (the core's `evaluatePluginCompatibility()` reads only it and `peerDependencies`). `dsh.compatibility.dshReleases` is a per-release declaration for marketplace indexing, **not** used at install time; unlisted versions count as `unknown`. Both fields have been `>=0.2.1-rc.2` in every release, so "installs successfully" does not mean "adapted".

The tables are derived from each release tag's `package.json` (e.g. `git show v0.4.8:package.json`) plus the 0.4.7 – 0.4.12 test records; the three 0.2.2-rc.1 regressions are listed in the [0.4.7 changelog](CHANGELOG.md).

### 0.4.7 adaptation notes

- **Engine**: supports `@deepseek-ai/dsh-client-ui-layout 0.2.2-rc.1` (Android app 1.5.0); see `dsh.compatibility` in `package.json`.
- **Settings entry**: the layout-mode picker registers on the official `settings.general.item` slot; older engines fall back to DOM injection (`legacy`), and missing capabilities fall back to no takeover (`safe`).
- **Settings page**: all three presets use the same phone full-screen layout; tablets and desktops keep the official two-column dialog. Settings dialogs are identified by `data-shortcut-modal="settings"`, so the sidebar drawer is never mistaken for one.
- **Diagnostics**: read `window.__dshmCompat` from the console / CDP (`mode`, `settingsPath`, `settingsSlotSeen`, `dialogContract`, `engineVersion`, `reason`).
- **Rollback**: `localStorage['dshm-compat'] = 'legacy'` forces the old injection path, `'safe'` disables settings takeover, `localStorage['dshm-settings-slot'] = 'off'` disables only the slot path. The full-screen settings layout is gated by the source constant `SETTINGS_UNIFIED_FULLSCREEN`.

### 0.4.12 changes

- **Dock style layers fully isolated**: the transparent dock is back to the original five destinations (Sessions / Automations / Plugins / Workbench / Settings, no paging); the capsule dock keeps its per-page items. The paperclip is injected only in capsule mode, leaving the official ⊕ row untouched in transparent mode.
- **Intermittent ⊕ fix**: a real `pointerdown` clears a stale ghost state (`ensureAddMenuCoherent` + generation counter), and the mask ignores clicks for 250 ms so a double tap no longer opens and immediately closes the panel; transparent and capsule behave identically.
- **Native dialogue body and commands**: date separators, tool chips, code-block collapse, thinking / step rows, terminal-card grid and wrap toggles are gone; the dialogue page injects no nodes and tags nothing. Typing `/` uses the same self-drawn add panel as ⊕.
- **Dark-mode polish**: capsule shadow and 1 px edge highlight use the theme blue; the top TAB gets a gray track + light-gray thumb + outlines; layout-mode / dock-style selected states match the official Appearance cards via official tokens (both themes); user message bubbles turn dark blue by overriding only `--dsw-specific-bubble`.
- **Docs and gates**: technical notes §3.19–§3.24, the capsule doc, token / official-attribute registries and unit tests are in sync; `npm run check` is green.

### 0.4.10 changes

- **Optional Native settings takeover**: the default preset now defaults to `minimal`, leaving the official settings dialog untouched; `enhanced` opts into the phone fullscreen panel. Classic and Floating keep their plugin settings panel.
- **Feature-level compatibility probes**: delayed DOM/services are rechecked after mount and observed capabilities stay sticky; a missing feature only degrades its own path rather than gating the whole engine by version regex.
- **Token contract**: size and color tokens are documented in [`docs/theme-tokens.md`](docs/theme-tokens.md), with a machine-readable catalog, reference stylesheet and three-way drift check.
- **Command UI metadata**: the Floating add panel uses official command candidates for localized labels, descriptions and sections, while clicks remain on verified official DOM actions.
- **Stable empty state**: the classic dashed card is driven by the retained session's `blank` state plus plugin-owned anchors, not a transient host class variant.
- **Compatibility gates**: official `data-*` and ARIA roles, feature coverage, contract drift, color literals and `!important` growth are checked by `npm run check`.

### 0.4.8 changes

- **Tablet wide-screen sidebar gesture**: in the wide form factor (tablet / wide window) the plugin injects only one gesture layer on top of the official layout — swipe left to collapse the sidebar, swipe right to expand, starting anywhere in the left half of the screen; threshold-triggered official toggle and transition (no finger-following). Official modal dialogs (`data-shortcut-modal` / `role=dialog[aria-modal]`) make the gesture yield entirely; swipes starting in the right half belong to the content. Phone drawer semantics unchanged; desktop hosts never enable it.
- **Second-round 0.2.2-rc.1 fixes** (audit report: `.workbuddy/plan/audit-022rc1-fix-plan.md`): Floating-preset settings entry chain rework (temporarily lifting drawer `inert` before tapping the account menu, so the gear no longer flashes the drawer open), settings content flush against the edges / unscrollable, Native-preset edge-swipe to open the drawer, misplaced status band, stray header rows on the settings page, dead Automations key on Floating, and more — see the [0.4.8 changelog](CHANGELOG.md).
- **Diagnostics**: `window.__dshmCompat` gains `settingsPathNote` (`'awaiting-slot'` = the slot is available but the settings page has not been opened yet — not a degradation).
- **Known limitation**: pressing the system Back key while the drawer is open does not close it. This belongs to the phone back-stack project and needs a matching Android shell change; it is out of scope for 0.4.8.

---

## Installation

```sh
dsh plugin --profile web add @xiaopb/dsh-mobile-layout
```

## Develop / Release

No runtime or dev dependencies; the client is a single-file artifact (no build), `lib/client.js` is what ships.

```sh
npm run check             # syntax → 262 tests → package → geometry/token/color/contract/compat/important gates
npm test                  # unit tests only (262)
npm run hardcode:check    # geometry hardcode guard
npm run tokens:check      # token catalog / client / docs / reference CSS consistency
npm run colors:check      # fail on new raw colors
npm run contracts:check   # official data-* and ARIA role registry
npm run compat:check      # FEATURE_KEYS compatibility coverage
npm run important:check   # fail on !important growth
npm run pack:dry          # preview package files
```

Pushing a `v*` tag triggers Release (npm Trusted Publishing with `NPM_TOKEN` fallback, then polls until the version is public). Device acceptance needs a device and is done manually per section 6 of `docs/technical-notes.md`.

## License

MIT
