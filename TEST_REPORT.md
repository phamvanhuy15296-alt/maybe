# Maybe 5.2.0 WebMCP Production Hotfix — Test Report

Date: 2026-09-02

## What this revision targets

This revision targets the discrepancy reported by the user:

- the exact application exposes all 9 `maybe_*` WebMCP tools on localhost in the Codex/ChatGPT built-in browser;
- the Cloudflare production URL loads successfully with HTTPS and `Origin-Agent-Cluster: ?1`, but the current Codex task reports zero Site Tools;
- Codex desktop logs include `No ChatGPT browser route is available for browser session ...` and, in one failure, a `client-new-thread:...` route owner.

The hotfix does not alter the Three.js/cannon-es renderer. `js/main.js` remains unchanged from the supplied revision.

## Source inspection findings

### 1. Page-side race / recovery weakness fixed

Before this hotfix, Site Tool registration lived at the bottom of `js/decision-ui.js`. That module first imports the decision mapping, storage, question library, translations, and WebMCP implementation. The page then tried a finite sequence of WebMCP retries and stopped actively polling after the warm-up window unless a later focus/pageshow/visibility event happened.

This is robust enough for a fast localhost load but unnecessarily fragile for a proxied production route or a host that rebinds `document.modelContext`.

The hotfix adds `js/webmcp-bootstrap.js`, loaded from `<head>` before the decision UI and Three.js. It:

- registers all 9 tools against a deferred Maybe API;
- starts registration before the heavier UI module graph is needed;
- retries every 2.5 seconds while visible until complete;
- notices when `document.modelContext` is replaced and registers on the replacement context;
- exposes `window.MaybeRetryWebMCP()`;
- exposes `window.MaybeWebMCPDiagnostics()`;
- renders a visible diagnostic panel when `?webmcp-debug=1` is present.

### 2. Cloudflare-specific hardening added

The production build now includes:

- `Origin-Agent-Cluster: ?1` in `_headers` / Worker example;
- explicit `Permissions-Policy: tools=(self)`;
- `Cache-Control: no-store` for the HTML and WebMCP registration modules during debugging;
- `data-cfasync="false"` on critical scripts so Cloudflare Rocket Loader cannot delay them;
- detection of Cloudflare's injected `/.webmcp/bridge.js` in the debug report.

### 3. The reported Codex error is still host-side

The supplied Codex desktop bundle was inspected. Its in-app browser Site Tool inventory probes the live document through `document.modelContext.getTools()` with a short timeout. Separately, Browser Use requests first require a conversation-to-browser route; if that route is absent, the desktop client throws:

`No ChatGPT browser route is available for browser session ...`

That route is maintained by the desktop host, not by webpage JavaScript. Therefore the page hotfix can eliminate registration timing/cache/proxy ambiguity, but it cannot repair a broken `client-new-thread` / current-task route mapping inside Codex.

## Automated tests

Command:

```bash
npm test
```

Result:

```text
PASS upstream-derived geometry, variable-dice physics, and product-layer isolation
PASS Maybe product shell, early persistent WebMCP bootstrap, question shelf, 1-5 dice control, and progressive UI structure
PASS mapping and 1-5 dice decision resolution
PASS lively built-in shelf and persistent custom question packs
PASS WebMCP registration and callback wiring
PASS early WebMCP bootstrap, diagnostics, and modelContext rebind recovery
```

The WebMCP unit suite intentionally injects one transient registration failure for `maybe_roll`; the warning printed during that test is expected. The following retry successfully registers only the missing tool.

## Headless browser QA

Command (when the Node Playwright package is installed or available through Codex):

```bash
npm run test:browser
```

In this execution environment the same test was run with `PLAYWRIGHT_NODE_PATH` pointed at the bundled Playwright Core package.

Result:

```text
PASS browser 1-5 dice flow, responsive layout, and live WebMCP callbacks
```

The browser suite validates:

- all 9 tools register against an initial `document.modelContext`;
- replacing `document.modelContext` causes the persistent bootstrap watchdog to register all 9 tools on the new context;
- question → pending → Codex options → editable options → mapping → roll → result;
- direct answers through `maybe_respond_in_page`;
- question shelf read/write/open callbacks;
- 1–5 dice state contracts;
- localStorage/cookie persistence;
- responsive desktop/mobile/landscape layouts.

The test uses a deterministic browser-side dice-engine mock for the product flow; the production Three.js/cannon-es renderer is not replaced in the shipped application.

## Syntax and isolation checks

The following files pass JavaScript syntax validation:

- `js/webmcp-bootstrap.js`
- `js/decision-ui.js`
- `cloudflare/worker.js`

`git diff -- js/main.js` is empty. The renderer/physics source was not modified by this hotfix.

## Environment limitation

This execution environment blocks Chromium navigation to localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`, so a second real-network local-server smoke test could not be performed here. The self-contained browser QA above does run successfully with Chromium and validates the WebMCP lifecycle and product callbacks.

## Required production retest

After redeploying, open this exact URL in a **brand-new Codex task's built-in browser**:

```text
https://webmcp.qinqinghua.tech/maybe/?webmcp-debug=1&build=hotfix1
```

The page diagnostic panel should report:

```text
secureContext: true
originAgentCluster: true
modelContextPresent: true
registerToolPresent: true
getToolsPresent: true
getToolsCount: 9
pageStatus.complete: true
```

If the page reports 9 tools but the address-bar Site Tools menu / Codex task still reports zero, the remaining fault is the Codex desktop browser-route/tool-provisioning layer. See `WEBMCP_TROUBLESHOOTING.md`.
