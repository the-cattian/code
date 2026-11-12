# ZenX v8.1 — three-column glass layout

This is a CSS-only visual update over the provided v8 extension. `premium.css` is the only changed extension source file. No timer, macro, ticket-detection, theme switching, message composition, or priority logic was edited.

The existing optional ticket-fields drawer remains available, but the default closed state now displays the original native Zendesk ticket-fields pane in its layout rather than collapsing it. This makes three-column Zendesk layouts possible without creating fake controls.

## Installation
Extract the ZIP. Open chrome://extensions, enable Developer mode, click Load unpacked, and select the extracted `ZenX_v7` folder. Disable the previous ZenX copy to avoid double injection. Refresh Zendesk and choose a theme in the ZenX popup.

## Verification
`node tests/verify-parity.mjs` passes for SLA/ticket logic. CSS changes cannot guarantee pixel-perfect correspondence with a screenshot across different Zendesk versions, window sizes, or iframe contents. The left views column will be styled where Zendesk exposes a matching pane; the screenshot's exact left-hand views layout cannot be manufactured without changing the underlying UI behavior.
