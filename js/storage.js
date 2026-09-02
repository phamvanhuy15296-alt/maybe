const STATE_KEY = 'rollnext_state_v3';
const HISTORY_KEY = 'rollnext_history_v3';
const STATE_COOKIE = 'rollnext_state_v3';
const HISTORY_COOKIE = 'rollnext_recent_v3';
const MAX_HISTORY = 100;
const COOKIE_BUDGET = 3500;
const HISTORY_COOKIE_LIMIT = 8;

function safeJson(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function readCookie(name) {
  const prefix = `${name}=`;
  const row = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

function writeCookie(name, value, days = 365) {
  const encoded = encodeURIComponent(value);
  if (encoded.length > COOKIE_BUDGET) return false;
  document.cookie = `${name}=${encoded}; Max-Age=${Math.round(days * 86400)}; Path=/; SameSite=Lax`;
  return true;
}

function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function compactState(state) {
  return {
    question: String(state.question || '').slice(0, 240),
    assistantText: String(state.assistantText || '').slice(0, 360),
    options: Array.isArray(state.options) ? state.options.slice(0, 6).map((v) => String(v).slice(0, 80)) : [],
    mapping: Array.isArray(state.mapping) ? state.mapping.slice(0, 6) : [],
    clarifications: Array.isArray(state.clarifications) ? state.clarifications.slice(-3).map((x) => ({
      question: String(x.question || '').slice(0, 160),
      answer: String(x.answer || '').slice(0, 180),
    })) : [],
  };
}

function compactHistory(history) {
  const recent = history.slice(0, HISTORY_COOKIE_LIMIT).map((entry) => ({
    id: entry.id,
    at: entry.at,
    q: String(entry.question || '').slice(0, 70),
    r: String(entry.winner || '').slice(0, 50),
    f: entry.faces,
    o: Array.isArray(entry.options) ? entry.options.slice(0, 6).map((value) => String(value).slice(0, 80)) : [],
    m: Array.isArray(entry.mapping) ? entry.mapping.slice(0, 6) : [],
  }));
  while (recent.length) {
    const json = JSON.stringify(recent);
    if (encodeURIComponent(json).length <= COOKIE_BUDGET) return json;
    recent.pop();
  }
  return '[]';
}

export function loadState(fallback) {
  const local = safeJson(localStorage.getItem(STATE_KEY), null);
  const cookie = safeJson(readCookie(STATE_COOKIE), null);
  return { ...fallback, ...(cookie || {}), ...(local || {}) };
}

export function saveState(state) {
  const compact = compactState(state);
  localStorage.setItem(STATE_KEY, JSON.stringify(compact));
  writeCookie(STATE_COOKIE, JSON.stringify(compact));
}

export function loadHistory() {
  const local = safeJson(localStorage.getItem(HISTORY_KEY), null);
  if (Array.isArray(local)) return local;
  const cookie = safeJson(readCookie(HISTORY_COOKIE), []);
  if (!Array.isArray(cookie)) return [];
  return cookie.map((item) => ({
    id: item.id,
    at: item.at,
    question: item.q,
    winner: item.r,
    faces: item.f,
    options: Array.isArray(item.o) ? item.o.slice(0, 6) : [],
    mapping: Array.isArray(item.m) ? item.m.slice(0, 6) : [],
    recoveredFromCookie: true,
  }));
}

export function appendHistory(entry) {
  const next = [entry, ...loadHistory().filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  writeCookie(HISTORY_COOKIE, compactHistory(next));
  return next;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  deleteCookie(HISTORY_COOKIE);
}

export function exportMemory() {
  return {
    state: safeJson(localStorage.getItem(STATE_KEY), safeJson(readCookie(STATE_COOKIE), {})),
    history: loadHistory(),
  };
}
