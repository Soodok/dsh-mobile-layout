# dsh-mobile-layout

> English docs ｜ [中文版](README.md)

[![CI](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/ci.yml/badge.svg)](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/ci.yml)
[![Release](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/release.yml/badge.svg)](https://github.com/XiaoPb/dsh-mobile-layout/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@xiaopb/dsh-mobile-layout?label=npm)](https://www.npmjs.com/package/@xiaopb/dsh-mobile-layout)

**DSH phone / tablet touch layout plugin (v0.4.8)**

Docs: [Architecture](docs/architecture.md) ｜ [Technical notes](docs/technical-notes.md) ｜ [Presets](docs/preset-v2.md) ｜ [Changelog](CHANGELOG.md) ｜ [中文版](README.md)

A Cordis plugin that turns the DSH web client into a one-handed, touch-first layout on **phone portrait** screens — **without modifying the official kernel or replacing the official layout plugin**. Outside phone portrait, landscape and desktop keep the official layout pixel-for-pixel; **tablet / wide screens (since 0.4.8) only gain one extra sidebar swipe gesture**, with the official layout untouched.

---

## Features

- **Sidebar → Drawer**: swipe right from anywhere in the left ~60% of the screen (QQ-style, mid-left start — full-screen gesture phones reserve the hard edge for system back); **finger-following drag with velocity/position snap on release**; tap-mask or left-swipe to close. Gesture is the only entry — no button (so it never covers a sub-page's own back button); the listener lives on `window` in the capture phase and works on every plugin page. Auto-collapses only on real navigation (blank taps, search, account menu, etc. stay open).
- **Bottom action bar**: new / chat / file / image / plugins / more, pinned right above the composer.
- **Add panel**: **reveal / cover transition** against the soft keyboard (content-adaptive height; the keyboard slides over to cover the panel and slides away to reveal it, with the input row position preserved via viewport-jump compensation — no animation crossing); open/close slide animations (skipped automatically for reduce-motion users); a 4×2 icon grid with horizontal paging beyond 8 items; icons are **color-coded by function** (12 soft tints across blue / orange / violet / green — same type keeps the same color, no clashes on screen, new items auto-assigned by alias hash).
- **Sessions / plugins sheets**: grouped by workspace with sticky headers and relative timestamps, capped at 64% of screen height; **drag the grabber down to dismiss**, styled after the engine's v1.4.57 official sheet (28px corners, raised surface, large title, pill primary action).
- **Composer merged into the bottom panel**: flat, full-width, single 1px divider; tightened empty state; permission & model short-name chips stay on the input row (**"Full access" is always red**, in both Chinese and English).
- **Fullscreen settings**: brand row + swipeable tabs + back button; swipe left/right on the content area to switch tabs; the panel follows the finger and slides out only from the leftmost tab's right-swipe (all other directions yield to tab paging).
- **Restyled pickers**: model / permission sub-menus become bottom-sheet lists with the theme-blue selected state; no soft keyboard pops up when a picker opens in the empty state (search-box autofocus guard — tapping the search box still focuses normally).
- **Exclusive overlays + history stack**: drawer / bottom sheet / add panel never stack; closed layer-by-layer. The add panel is also mutually exclusive with the soft keyboard in both directions (opening it first drops composer focus; tapping the input while the panel is open closes the panel first, and the keyboard rises only after the panel is gone).
- **Three layout presets**: **Native** (stock DSH) / **Merged** (composer joined with the bottom bar) / **Floating** (mobile-app form), one tap in Settings, see below.
- **Tablet wide-screen sidebar gesture** (since 0.4.8): on tablets / wide windows the sidebar is a persistent column that collapses into a narrow rail — **swipe left to collapse, swipe right to expand, starting anywhere in the left half of the screen** (threshold-triggered official toggle and transition, no finger-following); while an official modal dialog is on screen the gesture yields entirely, and swipes starting in the right half belong to the content. Shared engine with the phone drawer gesture; desktop hosts never enable it.
- **Live i18n**: every self-drawn label (layout-mode cards, bottom nav, panels) refreshes **instantly** when the official language changes — no restart needed; falls back to `<html lang>` / system language.
- **Accessibility & motion**: `aria-modal`, focus in/out, honors system "reduce motion".

### Three layout presets (Native / Merged / Floating)

The three layouts are **Native / Merged / Floating**: Native is DSH untouched; Merged joins the composer and the bottom bar into one block (v1); Floating lifts the composer card and adds a five-item nav (v2). There is exactly one place to switch: **Settings → General → Layout mode, right under Appearance**, offering three cards with mini wireframe thumbnails. Switching is instant, round-trips cleanly, and **plugin-provided config pages** (e.g. pet config, plugin market) are handled as well.

- **Native**: hands the whole screen back to the official layout; on phones the settings page matches the other two presets as **full-screen** (since 0.4.7 — brand row + swipeable tabs + back button), while tablets and desktops keep the official two-column dialog. The **only exception** is an attach entry in the composer tool row: one paperclip button that opens a nearby "Choose image / Choose file" menu, skipping the "tap ⊕ then find upload in the command list" detour. It shows up everywhere inside the App (phone or tablet, portrait or landscape, full screen or freeform) and stays hidden on desktop.
- **Merged**: composer and bottom bar joined into one block; the empty-state dashed input card gets symmetric side gutters (previously flush left with a 7px skew from the official scrollbar gutter).

Floating is the **mobile-app form factor**: a five-item bottom nav acts as the page switcher, the composer floats, and the add panel becomes a two-level menu.

- **Five-item nav**: Sessions / Automations / Plugins / Workbench / Settings, using DSH's own icon set; the current page is tinted with the official blue (`--dsw-alias-state-business-primary`). Sessions acts as "go home" — from other pages it returns to the session page; tapped again on the session page it opens the session sheet. Plugins / Automations / Settings are **pages**, not sheets, so the nav stays put (tapping the active one returns to the session).
- **Workbench**: toggles the official right panel (`sidebarRight.toggleExpanded`); at phone widths the official code makes it fullscreen and the panel leaves room for the nav; **swipe sideways to dismiss**, and from a plugin/automation page it closes that page first.
- **Add panel (self-drawn)**: level 1 = three attachment tiles (**image / camera / file**) plus one row per official group; tapping a group opens level 2, a list of that group's items with **title + official description**. Data and actions still come from the official nodes — it reads their options and dispatches their `mousedown`; no command semantics are duplicated.
- **Cover-style drawers**: add / model / permission / workspace pickers slide up over the page instead of pushing content up; the session sheet is a fixed 55% of the viewport, leaving blank space when there are few rows.
- **Transparent bottom bar**: no fill and no divider, so the composer's soft shadow can spill into the nav row instead of being cut off.
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
| **Verified on device** | MuMu emulator (720×1280), phone + tablet AVDs (CDP real-touch regression) and a Redmi K70 real device; **222** CI unit tests all green. |

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
| **0.4.8** (current) | `>=0.2.1-rc.2` | `0.2.1-rc.2`, `0.2.1-rc.5`, `0.2.2-rc.1` → `compatible` (carried over from 0.4.7) | `0.2.1-rc.2` / `0.2.1-rc.5` / `0.2.2-rc.1` | ✅ compatible | Everything from 0.4.7 + second-round fixes + tablet wide-screen sidebar gesture; use 0.4.8 for new installs / upgrades |
| 0.4.7 | `>=0.2.1-rc.2` | `0.2.1-rc.2`, `0.2.1-rc.5`, `0.2.2-rc.1` → `compatible` | `0.2.1-rc.2` / `0.2.1-rc.5` / `0.2.2-rc.1` | ✅ **first adapted release** | Official `data-shortcut-modal` contract + `settings.general.item` slot; unified full-screen settings for all three presets; unknown engines degrade to `safe` |
| 0.4.4 – 0.4.6 | `>=0.2.1-rc.2` | `0.2.1-rc.2`, `0.2.1-rc.5` → `compatible` | `0.2.1-rc.2` / `0.2.1-rc.5` | ❌ incompatible (unlisted = `unknown`) | On 0.2.2-rc.1: layout-mode picker breaks, the native preset settings page becomes a clipped floating window, and the settings page cannot be closed. Upgrade to 0.4.8 |
| 0.1.6 – 0.4.3 | `>=0.2.1-rc.2` | none (field added in 0.4.4) | `0.2.1-rc.2` / `0.2.1-rc.5` (historical results carried into 0.4.4) | ⚠️ unverified | Only a range declaration, no per-release entry; not recommended for newer engines |

### DSH version → recommended plugin version

| DSH / official UI layout | Host app | Recommended plugin | Verdict |
|---|---|---|---|
| `0.2.2-rc.1` | Android app 1.5.0 · BUILD `2026.11.06-4566c0be` | **≥ 0.4.8** | ✅ Verified on two AVDs and a Redmi K70; do not use 0.4.6 or older |
| `0.2.1-rc.5` | — (no recorded mapping) | 0.4.8 (0.4.4 – 0.4.7 also work) | ✅ `compatible` |
| `0.2.1-rc.2` | — (no recorded mapping) | 0.4.8 (minimum declared line) | ✅ `compatible` |
| Other / unlisted | — | 0.4.8 | ⚪ `unknown`: no settings takeover, `safe` degradation; force with `localStorage['dshm-compat'] = 'safe'` |

**Declaration semantics**: `engines.dsh` drives install-time checks (the core's `evaluatePluginCompatibility()` reads only it and `peerDependencies`). `dsh.compatibility.dshReleases` is a per-release declaration for marketplace indexing, **not** used at install time; unlisted versions count as `unknown`. Both fields have been `>=0.2.1-rc.2` in every release, so "installs successfully" does not mean "adapted".

The tables are derived from each release tag's `package.json` (e.g. `git show v0.4.8:package.json`) plus the 0.4.7 / 0.4.8 test records; the three 0.2.2-rc.1 regressions are listed in the [0.4.7 changelog](CHANGELOG.md).

### 0.4.7 adaptation notes

- **Engine**: supports `@deepseek-ai/dsh-client-ui-layout 0.2.2-rc.1` (Android app 1.5.0); see `dsh.compatibility` in `package.json`.
- **Settings entry**: the layout-mode picker registers on the official `settings.general.item` slot; older engines fall back to DOM injection (`legacy`), and missing capabilities fall back to no takeover (`safe`).
- **Settings page**: all three presets use the same phone full-screen layout; tablets and desktops keep the official two-column dialog. Settings dialogs are identified by `data-shortcut-modal="settings"`, so the sidebar drawer is never mistaken for one.
- **Diagnostics**: read `window.__dshmCompat` from the console / CDP (`mode`, `settingsPath`, `settingsSlotSeen`, `dialogContract`, `engineVersion`, `reason`).
- **Rollback**: `localStorage['dshm-compat'] = 'legacy'` forces the old injection path, `'safe'` disables settings takeover, `localStorage['dshm-settings-slot'] = 'off'` disables only the slot path. The full-screen settings layout is gated by the source constant `SETTINGS_UNIFIED_FULLSCREEN`.

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
npm run check             # node --check → unit tests → package / bundle contract → hardcoded-value guard
npm test                  # unit tests only (222)
npm run hardcode:check    # guard only (fails on new violations)
npm run hardcode:baseline # shrink the baseline after fixing violations
npm run pack:dry          # preview the files that will be published
```

Pushing a `v*` tag triggers Release (npm Trusted Publishing with `NPM_TOKEN` fallback, then polls until the version is public). Device acceptance needs a device and is done manually per section 6 of `docs/technical-notes.md`.

## License

MIT
