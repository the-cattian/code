# ZenX 8.4 — UI fixes

Full extension updated from the supplied `ZenX_v8_3_Liquid_Glass.zip`.

## Install

1. Extract `ZenX_v8_4_UI_Fixes.zip`.
2. Open `chrome://extensions`, enable Developer mode, and disable the older ZenX copy.
3. Select **Load unpacked** and choose the extracted `ZenX_v8_4` folder containing `manifest.json`.
4. Reload the Zendesk tab. If updating the same installed extension folder, reload the extension and then the Zendesk tab.

Existing theme selection and preferences are preserved when updating the same installation. All packaged themes and wallpapers remain included.

## Fixes

- **Idle chat cutoff:** the actual nested message viewport can fill the conversation card. Empty, invisible composer reservations collapse while idle; a visible editor, draft, reply action, or notice remains available. The same native editor is restored when it becomes visible again. Long notes remain scrollable to their final line.
- **Left-side ZenX logo:** the collapsed idle timer is a compact 38-pixel button with a centered 20-pixel logo. When placed over the native navigation rail, it lines up with the other icons. Saved vertical position and the native drag, hover and pin handlers remain in use.
- **App/tool colors after switching:** the selected palette reapplies when accessible app frames load, navigate, are replaced, or render new content. Existing dark mode is no longer inverted a second time. The frame entry runs only the theming script; the SLA/timer engine still runs only in the top page.
- **Extra ticket-fields button:** the floating fields launcher, overlay drawer, popup toggle, tester toggle, and drawer command handler are removed. The native ticket fields stay in their normal panel. The timer's existing Sidebar section-visibility menu is retained.
- **Side-card transparency:** the panel fill is slightly more transparent without reducing text opacity.

## Preserved behavior

The original ticket identification, status checks, timestamp parsing, agent-message parsing, and SLA evaluation remain byte-for-byte identical to the bookmarklet reference. Macros, message composition, timer durations, warning sounds, muting, theme editing, focus mode, app controls and native form values remain available.

## Validation

All 58 browser regression checks passed with zero JavaScript errors. The original SLA/ticket parity checks also passed. Browser tests covered four viewport sizes, all 23 themes, native controls, timer actions, macros, app navigation and the four UI fixes.

Run the original behavior checks:

```sh
node tests/verify-parity.mjs
```

The portable browser regression suite uses Node.js and Playwright:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser-layout.mjs
```

Set `CHROMIUM_PATH` to use an installed Chromium executable, `PLAYWRIGHT_MODULE` to use an existing module, and `ZENX_TEST_ARTIFACTS` to choose a screenshot/results folder. The suite starts a local simulated Zendesk server; it does not send customer messages.

## App-frame and live-site limits

Accessible app documents and Zendesk-hosted child frames receive actual palette styling. Apps on other origins cannot have their internal DOM recolored under the existing host permissions; those frames receive a consistent mild tint and themed outer shell. No new third-party host access is requested. App search fields, values, status colors, images and native handlers are preserved.

Validation uses simulated Zendesk layouts. The authenticated tenant was not available, and managed Chromium prohibits unpacked-extension loading, so live injection and tenant-specific DOM differences remain unverified.

README_V8*.md files describe historical releases.
