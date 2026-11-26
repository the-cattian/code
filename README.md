# ZenX 9.8.0

[Download ZenX 9.8.0](ZenX-9.8.0.zip?raw=true). Use **ZenX → Dashboard → Features** to show or hide the floating button and live message ages. Elapsed seconds appear when Zendesk provides a timestamp precise to the second with a timezone.

# ZenX 9.7.0

[Download ZenX 9.7.0](ZenX-9.7.0.zip?raw=true) for individual feature switches in **ZenX → Dashboard → Features**. Extract the ZIP and select the folder containing `manifest.json` when loading the extension.

# ZenX 8.4 — UI fixes

[Download the full extension ZIP](ZenX_v8_4_UI_Fixes.zip?raw=true)

The full source is in [ZenX_v8_4](ZenX_v8_4). The ZIP includes the extension, all themes, wallpapers, icons, and the offline tester.

## Install

1. Download and extract `ZenX_v8_4_UI_Fixes.zip`.
2. In Chrome, open `chrome://extensions` and enable Developer mode.
3. Disable your previous ZenX copy, choose **Load unpacked**, and select the extracted `ZenX_v8_4` folder containing `manifest.json`.
4. Reload your Zendesk tab.

## Changes

- Idle conversation space no longer reserves an empty, invisible composer; nested chat scrollports can show the final line of long notes.
- The idle ZenX timer logo is smaller and centered with the navigation rail icons.
- App theming reapplies after loads and switches, and already-darkened app frames are not inverted again.
- The extra floating ticket-fields button and its overlay drawer functionality are removed. The native fields remain available in their normal panel.
- Side-panel backgrounds are slightly more transparent.

All 58 browser checks passed with zero JavaScript errors.

The original SLA/ticket parsing functions are unchanged and pass byte-for-byte parity checks. Timer dragging, pinning, muting, macros, focus mode, app controls, form values and theme selection are retained.

See [the extension README](ZenX_v8_4/README.md) for validation commands and app-frame/live-site limitations.
