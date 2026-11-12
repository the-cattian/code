# ZenX 8.4 code changes

- `workspace.js`: nested native scroll viewport detection, reversible empty-composer reservation markers, and side-panel fill variable.
- `chrome-glass.js`, `premium.css`: compact centered idle timer logo, rail alignment, empty composer CSS, and slightly more transparent side cards.
- `app-frames.js` (new): palette lifecycle across app loads, navigation, replacement and asynchronous content; cleanup on disable; cross-origin fallback without repeated inversion.
- `content.js`: the legacy automatic darkener yields to owned app surfaces/frames. The optional fields-drawer API/state is removed. Core SLA/ticket functions are unchanged.
- `manifest.json`: version 8.4; removes the fields-drawer script and registers a frame-only theming entry under the existing Zendesk host scope.
- `premium.js` (removed): optional fields drawer and floating launcher.
- `popup.html`, `popup.js`, and tester files: remove drawer controls and load the new app presentation layer.
- `tests/`: original parity checks plus portable browser coverage for the four requested UI fixes and existing controls.

The timer's Sidebar section visibility feature remains available. It is separate from the removed floating ticket-fields drawer.
