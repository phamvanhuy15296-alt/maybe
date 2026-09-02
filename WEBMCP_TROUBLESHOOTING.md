# Maybe WebMCP production troubleshooting

This hotfix separates **page registration** from **Codex in-app-browser routing**. They can fail independently.

## What was found

The uploaded build already passed the basic WebMCP contract locally, but its production registration was tied to the heavier `decision-ui.js` module graph and stopped actively retrying after a finite warm-up window. That is a real production race: a remote page can be slower than localhost, and the host can replace `document.modelContext` when an in-app browser route is rebound.

The hotfix therefore:

1. loads `js/webmcp-bootstrap.js` from `<head>` before the decision UI and Three.js;
2. registers the nine tools against a deferred page API, so discovery does not wait for the UI to finish booting;
3. keeps a 2.5-second watchdog alive while the page is visible;
4. detects replacement of the `document.modelContext` object and registers on the new context;
5. adds `?webmcp-debug=1`, `window.MaybeWebMCPDiagnostics()`, and `window.MaybeRetryWebMCP()`;
6. opts critical scripts out of Cloudflare Rocket Loader via `data-cfasync="false"`;
7. adds explicit `Permissions-Policy: tools=(self)` alongside `Origin-Agent-Cluster: ?1`;
8. disables cache for the HTML and registration modules in the provided Cloudflare configuration.

## Important: the reported Codex log is a host-side route failure

`No ChatGPT browser route is available for browser session ...` is emitted by the Codex desktop in-app-browser routing layer before the page can be read or its Site Tools invoked. A webpage cannot create or repair that route.

The provided Codex bundle also shows that the in-app browser probes page tools using `document.modelContext.getTools()` and enforces a short probe timeout. This makes early registration useful, but it does **not** give the webpage control over the Codex conversation-to-browser route.

If the browser tab is attached to `client-new-thread:...` while the active task has another ID, do not keep refreshing that old task. Fully quit the desktop app, reopen it, create a new Codex task, open the built-in browser from that task, and navigate to the production URL manually.

For troubleshooting, **do not use the “Open in Codex” deep link to attach a page to an already-running task**. A deep link is for creating/handoffing into a new session and can make session ownership harder to reason about while diagnosing a route bug.

## Cloudflare checklist

For `https://webmcp.qinqinghua.tech/maybe/`:

- final document is HTTPS;
- final document returns `Origin-Agent-Cluster: ?1`;
- final document returns `Permissions-Policy: tools=(self)`;
- no `Origin-Agent-Cluster: ?0` appears on the final response;
- do not set `document.domain`;
- avoid an intermediate redirect when testing the final `/maybe/` URL;
- bypass edge/browser cache for `index.html`, `webmcp.js`, `webmcp-bootstrap.js`, and `decision-ui.js` while debugging;
- disable Rocket Loader for `/maybe/*` (the source also opts critical scripts out explicitly);
- if Cloudflare's own **Agent Readiness / WebMCP** beta is enabled, disable it while the app registers its own WebMCP tools. Cloudflare can inject its own `/.webmcp/bridge.js`; mixing two experimental tool bridges is unnecessary here.

If this is a Cloudflare Pages deployment, copy the included `_headers` file into the deployment root.

If this is the existing Worker -> GitHub Pages proxy, use or merge the logic in `cloudflare/worker.js` into the Worker that serves `webmcp.qinqinghua.tech/maybe/*`.

## Built-in-browser test sequence

1. Completely quit ChatGPT/Codex Desktop.
2. Relaunch the latest desktop app.
3. Create a **brand-new Codex task**.
4. Open the built-in browser from that task (not from an external deep link).
5. Navigate directly to:
   `https://webmcp.qinqinghua.tech/maybe/?webmcp-debug=1&build=hotfix1`
6. In the page diagnostics panel, expect:
   - `secureContext: true`
   - `originAgentCluster: true`
   - `topLevelDocument: true`
   - `modelContextPresent: true`
   - `registerToolPresent: true`
   - `getToolsPresent: true`
   - `getToolsCount: 9`
   - page status `complete: true`
7. The Site Tools arrow should appear in the address bar. Open it and confirm nine `maybe_*` tools.
8. Ask Codex: `Use this page to help me decide what to eat for lunch.`
9. Confirm that `maybe_respond_in_page` appears under Recently used.

## How to interpret the debug panel

### A. `modelContextPresent: false`

The page cannot register tools because the desktop browser did not expose WebMCP to this document. Check Site Tools permission/model/rollout and the Codex browser route.

### B. `modelContextPresent: true`, `getToolsCount: 9`, but Codex shows zero Site Tools

The page is healthy. This is a desktop host discovery/routing problem, not a Cloudflare header or page registration failure.

### C. `registerToolPresent: true`, but `getToolsCount < 9`

The page is only partially registered. The watchdog will retry. Copy the debug JSON and inspect `pageStatus.failed`.

### D. `cloudflareInjectedWebMCPBridge: true`

Turn off Cloudflare's zone-level WebMCP injection while testing this app's own tools, purge the cache, and reload.

## Useful runtime commands

In DevTools for the Maybe page:

```js
await window.MaybeWebMCPDiagnostics()
```

Force a registration retry:

```js
await window.MaybeRetryWebMCP()
```

Read the current status:

```js
window.MaybeWebMCPStatus
```
