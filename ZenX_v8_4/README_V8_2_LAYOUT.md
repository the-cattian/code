# ZenX v8.2 — Padded Three-Column Glass (full extension)

This release corrects the v8.1 layout defects reported with the real Zendesk screenshot.

## What changed

- The **existing native Zendesk columns** have outer gutters and consistent inter-column gaps instead of touching edge-to-edge. Panes are rounded, have theme-aware glass fill/borders and use the existing theme palette.
- The **entire conversation card** now owns the wallpaper. The message-list scroll region is transparent, preventing the solid purple blank strip beneath a short message log. For Zendesk layouts where the scroll region is a direct child of the conversation pane, the log is also allowed to grow into the available space without covering the editor.
- Light/dark themes and existing One Piece themes remain selected through the same popup. No change to app-frame content (cross-origin apps cannot safely be themed internally).
- On narrow screens, columns remain available with horizontal scrolling rather than deleting controls.

## Code and feature preservation

Only `premium.css` differs from the supplied v8.1 bundle. No JavaScript logic was modified. Ticket parsing, SLA timing, macros, ticket-header priority, theme switching, form controls and the Zendesk panes are unchanged. The optional ticket-fields drawer still exists.

## How to install

1. Disable the older ZenX extension first (`chrome://extensions`).
2. Extract the ZIP, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and select the extracted `ZenX_v7` directory.
3. Refresh your Zendesk ticket tab. Use the ZenX popup to choose the desired theme/wallpaper.
4. If both extensions are loaded, disable the old copy: duplicate styles/timers can conflict.

## Validation and limitations

- `node tests/verify-parity.mjs` passes the original logic parity tests.
- Layout spacing and continuous chat wallpaper were checked with Chromium against the included simulated ticket markup, including a shortened message log.
- **Live Zendesk and cross-origin iframe content were not accessible from this environment**. Different Zendesk deployments can have differently named wrappers. The new CSS uses the existing `data-zenx-fields-layout` markers and known stable native pane attributes; a pixel-perfect match in the user's real tenant is not guaranteed without live verification.
