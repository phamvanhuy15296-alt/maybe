import { registerWebMCP, WEBMCP_TOOL_COUNT } from './webmcp.js?v=20260903-playful';

const BUILD_ID = '2026-09-03-playful';
const WATCH_INTERVAL_MS = 2500;
const API_WAIT_TIMEOUT_MS = 20000;
const API_METHODS = [
  'getContext',
  'respondInPage',
  'presentOptions',
  'presentFollowup',
  'getState',
  'setMapping',
  'setDiceCount',
  'roll',
  'getHistory',
  'exportMemory',
  'getQuestionCards',
  'saveQuestionCards',
  'useQuestionCard',
];

let attemptCount = 0;
let inFlight = null;
let readyContext = null;
let readyAt = '';
let watchdogTimer = null;

function getModelContext() {
  try {
    return document.modelContext || null;
  } catch {
    return null;
  }
}

function waitForMaybeApi(timeoutMs = API_WAIT_TIMEOUT_MS) {
  if (window.Maybe) return Promise.resolve(window.Maybe);

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const finish = () => {
      window.removeEventListener('maybe:api-ready', onReady);
      clearInterval(poll);
    };
    const onReady = () => {
      if (!window.Maybe) return;
      finish();
      resolve(window.Maybe);
    };
    const poll = setInterval(() => {
      if (window.Maybe) {
        finish();
        resolve(window.Maybe);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        finish();
        reject(new Error('Maybe UI API did not become ready in time.'));
      }
    }, 50);
    window.addEventListener('maybe:api-ready', onReady);
  });
}

const deferredApi = Object.fromEntries(API_METHODS.map((method) => [
  method,
  async (...args) => {
    const api = await waitForMaybeApi();
    const target = api?.[method];
    if (typeof target !== 'function') {
      throw new Error(`Maybe API method ${method} is unavailable.`);
    }
    return target.apply(api, args);
  },
]));

function publish(result, reason) {
  const context = getModelContext();
  const complete = Boolean(result.complete);
  if (complete) {
    readyContext = context;
    readyAt = new Date().toISOString();
  }

  const detail = {
    build: BUILD_ID,
    status: complete ? 'ready' : result.supported ? 'partial' : 'waiting',
    supported: Boolean(result.supported),
    complete,
    expected: result.expected || WEBMCP_TOOL_COUNT,
    registered: [...(result.registered || [])],
    failed: [...(result.failed || [])],
    attempt: attemptCount,
    reason,
    readyAt,
    contextPresent: Boolean(context),
    registerToolPresent: typeof context?.registerTool === 'function',
    getToolsPresent: typeof context?.getTools === 'function',
    contextMatchesReadyContext: Boolean(context && readyContext && context === readyContext),
  };

  document.documentElement.dataset.webmcp = detail.status;
  document.documentElement.dataset.maybeBuild = BUILD_ID;
  window.MaybeBuild = BUILD_ID;
  window.MaybeWebMCPStatus = detail;
  window.dispatchEvent(new CustomEvent('maybe:webmcp-status', { detail }));
  return detail;
}

async function attemptRegistration(reason = 'manual') {
  const context = getModelContext();

  if (
    context &&
    context === readyContext &&
    window.MaybeWebMCPStatus?.complete
  ) {
    return window.MaybeWebMCPStatus;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    attemptCount += 1;
    let result;
    try {
      result = await registerWebMCP(deferredApi);
    } catch (error) {
      result = {
        supported: Boolean(context),
        complete: false,
        expected: WEBMCP_TOOL_COUNT,
        registered: [],
        failed: [{ name: '__runtime__', message: String(error?.message || error) }],
      };
    }
    return publish(result, reason);
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

function scheduleImmediate(reason) {
  queueMicrotask(() => {
    void attemptRegistration(reason).catch((error) => {
      console.warn('[Maybe] WebMCP registration retry failed', error);
    });
  });
}

function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    if (document.hidden) return;
    const context = getModelContext();
    const needsRetry =
      !window.MaybeWebMCPStatus?.complete ||
      !readyContext ||
      context !== readyContext;
    if (needsRetry) scheduleImmediate('watchdog');
  }, WATCH_INTERVAL_MS);
}

function permissionsPolicyAllowsTools() {
  const policy = document.permissionsPolicy || document.featurePolicy;
  if (typeof policy?.allowsFeature !== 'function') return null;
  try {
    return policy.allowsFeature('tools');
  } catch {
    return null;
  }
}

async function readRegisteredTools(context) {
  if (typeof context?.getTools !== 'function') {
    return { count: null, names: [], error: '' };
  }
  try {
    const tools = await Promise.race([
      Promise.resolve(context.getTools()),
      new Promise((resolve) => setTimeout(() => resolve('__timeout__'), 900)),
    ]);
    if (tools === '__timeout__') return { count: null, names: [], error: 'getTools timed out after 900 ms' };
    if (!Array.isArray(tools)) return { count: null, names: [], error: 'getTools returned a non-array value' };
    return {
      count: tools.length,
      names: tools.map((tool) => String(tool?.name || '')).filter(Boolean),
      error: '',
    };
  } catch (error) {
    return { count: null, names: [], error: String(error?.message || error) };
  }
}

async function collectDiagnostics() {
  const context = getModelContext();
  const tools = await readRegisteredTools(context);
  return {
    build: BUILD_ID,
    href: location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    secureContext: window.isSecureContext,
    originAgentCluster: window.originAgentCluster ?? null,
    topLevelDocument: window.top === window,
    visibilityState: document.visibilityState,
    permissionsPolicyTools: permissionsPolicyAllowsTools(),
    modelContextPresent: Boolean(context),
    registerToolPresent: typeof context?.registerTool === 'function',
    getToolsPresent: typeof context?.getTools === 'function',
    getToolsCount: tools.count,
    getToolsNames: tools.names,
    getToolsError: tools.error,
    cloudflareInjectedWebMCPBridge: [...document.scripts].some((script) =>
      String(script.src || '').includes('/.webmcp/bridge.js')
    ),
    pageStatus: window.MaybeWebMCPStatus || null,
  };
}

function installDebugPanel() {
  if (!new URLSearchParams(location.search).has('webmcp-debug')) return;
  const mount = () => {
    if (document.getElementById('maybe-webmcp-debug')) return;
    const panel = document.createElement('aside');
    panel.id = 'maybe-webmcp-debug';
    panel.setAttribute('aria-label', 'Maybe WebMCP diagnostics');
    Object.assign(panel.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      zIndex: '2147483647',
      width: 'min(430px, calc(100vw - 24px))',
      maxHeight: '52vh',
      overflow: 'auto',
      padding: '12px',
      border: '1px solid rgba(0,0,0,.22)',
      borderRadius: '12px',
      background: 'rgba(255,255,255,.96)',
      color: '#111',
      font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
      boxShadow: '0 12px 40px rgba(0,0,0,.16)',
    });
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';
    header.style.marginBottom = '8px';
    const title = document.createElement('strong');
    title.textContent = 'Maybe · WebMCP diagnostics';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    Object.assign(copy.style, { cursor: 'pointer', font: 'inherit' });
    header.append(title, copy);
    const pre = document.createElement('pre');
    Object.assign(pre.style, { margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' });
    panel.append(header, pre);
    document.body.appendChild(panel);

    let lastText = '';
    const refresh = async () => {
      const diagnostics = await collectDiagnostics();
      lastText = JSON.stringify(diagnostics, null, 2);
      pre.textContent = lastText;
    };
    copy.addEventListener('click', async () => {
      if (!lastText) await refresh();
      try {
        await navigator.clipboard.writeText(lastText);
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
      } catch {
        copy.textContent = 'Select text';
      }
    });
    void refresh();
    setInterval(() => { void refresh(); }, 1500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}

window.MaybeRetryWebMCP = () => attemptRegistration('manual');
window.MaybeWebMCPDiagnostics = collectDiagnostics;
window.addEventListener('pageshow', () => scheduleImmediate('pageshow'));
window.addEventListener('focus', () => scheduleImmediate('focus'));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleImmediate('visibilitychange');
});
window.addEventListener('maybe:api-ready', () => scheduleImmediate('api-ready'));

publish({
  supported: false,
  complete: false,
  expected: WEBMCP_TOOL_COUNT,
  registered: [],
  failed: [],
}, 'bootstrap');

scheduleImmediate('bootstrap');
startWatchdog();
installDebugPanel();
