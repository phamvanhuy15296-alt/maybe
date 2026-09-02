import assert from 'node:assert/strict';

class MiniTarget extends EventTarget {}
const win = new MiniTarget();
const doc = new MiniTarget();

Object.assign(win, {
  isSecureContext: true,
  originAgentCluster: true,
});
win.top = win;

Object.assign(doc, {
  documentElement: { dataset: {} },
  hidden: false,
  visibilityState: 'visible',
  readyState: 'complete',
  scripts: [],
  permissionsPolicy: { allowsFeature: (name) => name === 'tools' },
  getElementById: () => null,
});

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, init = {}) {
      super(type);
      this.detail = init.detail;
    }
  };
}

globalThis.window = win;
globalThis.document = doc;
globalThis.location = {
  href: 'https://webmcp.qinqinghua.tech/maybe/?test=bootstrap',
  search: '?test=bootstrap',
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Maybe bootstrap test' } });

await import('../js/webmcp-bootstrap.js?node-test=1');
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(win.MaybeWebMCPStatus.status, 'waiting');
assert.equal(win.MaybeWebMCPStatus.complete, false);

const firstTools = [];
doc.modelContext = {
  async registerTool(tool) { firstTools.push(tool); },
  getTools() { return firstTools; },
};
await win.MaybeRetryWebMCP();
assert.equal(firstTools.length, 9);
assert.equal(win.MaybeWebMCPStatus.complete, true);

const firstDiag = await win.MaybeWebMCPDiagnostics();
assert.equal(firstDiag.secureContext, true);
assert.equal(firstDiag.originAgentCluster, true);
assert.equal(firstDiag.permissionsPolicyTools, true);
assert.equal(firstDiag.getToolsCount, 9);

const reboundTools = [];
doc.modelContext = {
  async registerTool(tool) { reboundTools.push(tool); },
  getTools() { return reboundTools; },
};
await win.MaybeRetryWebMCP();
assert.equal(reboundTools.length, 9, 'a replaced modelContext must receive the complete tool set');
assert.equal(win.MaybeWebMCPStatus.contextMatchesReadyContext, true);

console.log('PASS early WebMCP bootstrap, diagnostics, and modelContext rebind recovery');
process.exit(0);
