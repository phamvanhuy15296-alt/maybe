# Maybe 5.2.0 hotfix summary

Production WebMCP hardening only. No Three.js/cannon-es renderer changes.

- Early WebMCP bootstrap in `<head>`.
- Deferred API lets tools register before the UI is fully initialized.
- Persistent 2.5 s watchdog instead of a finite retry window.
- Automatic recovery when `document.modelContext` is replaced.
- `?webmcp-debug=1` visual diagnostics.
- `window.MaybeWebMCPDiagnostics()` and `window.MaybeRetryWebMCP()`.
- Explicit `Permissions-Policy: tools=(self)`.
- Cloudflare Rocket Loader opt-out for critical scripts.
- Cache-busting version `20260902-hotfix1`.
- Cloudflare Pages `_headers` and Worker proxy example.
- Guidance to disable Cloudflare's own injected WebMCP beta bridge while testing custom tools.
