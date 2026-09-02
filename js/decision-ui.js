import {
  MIN_OPTIONS,
  MAX_OPTIONS,
  sanitizeOptions,
  createBalancedMapping,
  normalizeMapping,
  mappingGroups,
  resolveFaces,
} from './mapping.js';
import {
  loadState,
  saveState,
  loadHistory,
  appendHistory,
  clearHistory,
  exportMemory,
} from './storage.js';
import { registerWebMCP } from './webmcp.js';
import {
  QUESTION_CATEGORIES,
  listQuestionCards,
  findQuestionCard,
  loadCustomQuestionCards,
  saveCustomQuestionCards,
  removeCustomQuestionCard,
  exportQuestionPack,
} from './question-library.js';
import {
  LANGUAGES,
  getLocale,
  getLanguage,
  t,
  tp,
  setLocale,
  applyTranslations,
} from './i18n.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  ui: $('#game-ui'),
  steps: $$('[data-step]'),
  home: $('#global-home-btn'),
  score: $('#score-result'),
  roll: $('#roll-btn'),
  ask: $('#ask-btn'),
  questionInput: $('#question-input'),
  questionNext: $('#question-next-btn'),
  pendingQuestion: $('#pending-question'),
  ownOptions: $('#own-options-btn'),
  followupQuestion: $('#followup-question'),
  followupInput: $('#followup-input'),
  followupNext: $('#followup-next-btn'),
  followupSkip: $('#followup-skip-btn'),
  assistantText: $('#assistant-text'),
  optionList: $('#option-list'),
  optionTemplate: $('#option-template'),
  addOption: $('#add-option-btn'),
  optionsNext: $('#options-next-btn'),
  readyQuestion: $('#ready-question'),
  mappingSummary: $('#mapping-summary'),
  customizeOdds: $('#customize-odds-btn'),
  faceMapping: $('#face-mapping'),
  saveOdds: $('#save-odds-btn'),
  balanceOdds: $('#balance-odds-btn'),
  decisionRoll: $('#decision-roll-btn'),
  resultTitle: $('#result-title'),
  resultDetail: $('#result-detail'),
  answerQuestion: $('#answer-question'),
  answerText: $('#answer-text'),
  answerAnother: $('#answer-another-btn'),
  rollAgain: $('#roll-again-btn'),
  newQuestion: $('#new-question-btn'),
  historyBtn: $('#history-btn'),
  historyList: $('#history-list'),
  clearHistory: $('#clear-history-btn'),
  libraryBtn: $('#library-btn'),
  librarySearch: $('#library-search'),
  libraryCategories: $('#library-categories'),
  libraryCount: $('#library-count'),
  libraryStatus: $('#library-status'),
  questionCardList: $('#question-card-list'),
  questionCardTemplate: $('#question-card-template'),
  copyLibraryPrompt: $('#copy-library-prompt-btn'),
  importLibrary: $('#import-library-btn'),
  exportLibrary: $('#export-library-btn'),
  libraryFileInput: $('#library-file-input'),
  openCodex: $('#open-codex-btn'),
  saveCurrentButtons: $$('[data-save-current]'),
  saveStatuses: $$('[data-save-status]'),
  languageButton: $('#language-button'),
  languageButtonCode: $('#language-button-code'),
  languageMenu: $('#language-menu'),
};

const PERSONAL_PACK_SEED_KEY = 'maybe_personal_pack_seed_v1';
const PERSONAL_PACK_SEED = Object.freeze([
  {
    question: '今天这场站会先聊什么最划算？',
    category: 'office',
    message: '开会变快，其实靠的是把争论留在正确的位置。',
    options: [
      '只追问昨天阻塞的三件事',
      '先定下今天一个可交付动作',
      '把所有非决策问题记入跟进行动',
      '用两分钟让每个人报一个风险',
    ],
  },
  {
    question: '中午离开键盘前，我先做哪一步？',
    category: 'work',
    message: '用一个小闭环，让下午有一个可见起点。',
    options: [
      '复盘今天的单点风险',
      '把一个卡片状态改成已完成',
      '给明天保留 3 条优先级',
      '留一个可复用的文档备注',
      '先把今天的临时变更都提交草稿',
    ],
  },
  {
    question: '今天这颗“看起来很危险”的 Bug，先怎么下手？',
    category: 'coding',
    message: '把猜测变成可验证路径，骰子只负责选方向。',
    options: [
      '写一个最小复现用例',
      '从最近一次提交开始二分排查',
      '把可疑模块单独做一组观察日志',
      '让测试捕捉失败再回看调用链',
      '让同伴复述你理解的触发条件',
    ],
  },
  {
    question: '你想先让哪次迭代降风险？',
    category: 'coding',
    message: '先处理结构问题比修补症状更容易活下来。',
    options: [
      '把一个最脆弱模块先封装',
      '补齐最容易回归的边界测试',
      '修正一个会误导排查的变量命名',
      '加一层输入校验再谈重构',
    ],
  },
  {
    question: '工作日 3 点，哪个轻微“叛逆”最值当？',
    category: 'humor',
    message: '低风险的反常规，有时候是最有效的补能剂。',
    options: [
      '把例会全改成“十问十答模式”',
      '今天只讲两个 emoji 作为状态更新',
      '先发一句“我先吃瓜再给建议”取代追问',
      '发起一次无议程的零食投票',
    ],
  },
  {
    question: '今天晚饭想来点小冒险，掷一下吧。',
    category: 'daily',
    message: '稳定不等于平庸：今天给味蕾一个情节转折。',
    options: [
      '附近最便宜却最特别的店',
      '今天只点一道没尝过的配料',
      '和同事交换菜单主意后点餐',
      '走远路买完晚饭再散步回来',
      '改成“早餐吃法”然后配一杯热饮',
    ],
  },
  {
    question: '明天我要做的第一步该是什么？',
    category: 'creative',
    message: '从小动作开始，能让灵感有入口。',
    options: [
      '先写一版最简的页面说明',
      '做一个失败也能复用的小原型',
      '先把视觉基调缩到三个关键词',
      '用 10 分钟完成一个草图再继续',
      '先给同事发一条“我卡住了”消息',
    ],
  },
  {
    question: '如果今晚只做一件事，什么能让我马上“归位”？',
    category: 'personal',
    message: '高效的放松也需要一个明确的开关。',
    options: [
      '把桌面文件夹清到只剩 3 个',
      '给明天预留 20 分钟无打扰时间',
      '写下“今天最值得保留的一句话”',
      '和一个朋友聊聊非工作内容',
      '听完一首不需要思考歌词的歌',
    ],
  },
]);

const DEFAULT_STATE = {
  question: '',
  assistantText: '',
  directAnswer: '',
  options: [],
  mapping: [0, 1, 0, 1, 0, 1],
  clarifications: [],
  activeCardId: '',
};

let state = loadState(DEFAULT_STATE);
state.options = sanitizeOptions(state.options);
state.mapping = normalizeMapping(state.mapping, Math.max(1, state.options.length));
state.clarifications = Array.isArray(state.clarifications) ? state.clarifications.slice(-3) : [];

let history = loadHistory();
let currentStep = 'home';
let followupPrompt = '';
let rolling = false;
let pendingRollPromise = null;
let pendingRollResolve = null;
let pendingRollReject = null;
let pendingRollTimer = null;
let webmcpSupported = false;
let pendingDiceCount = 2;
let libraryCategory = 'all';
let isLanguageMenuOpen = false;
let detailFitFrame = 0;

function scheduleDetailFit() {
  cancelAnimationFrame(detailFitFrame);
  els.ui.classList.remove('fit-compact', 'fit-dense', 'fit-tight');

  if (currentStep === 'home' || currentStep === 'library') return;

  const densitySteps = ['fit-compact', 'fit-dense', 'fit-tight'];
  let densityIndex = 0;

  const fitNext = () => {
    if (els.ui.scrollHeight <= els.ui.clientHeight + 1 || densityIndex >= densitySteps.length) return;
    els.ui.classList.add(densitySteps[densityIndex]);
    densityIndex += 1;
    detailFitFrame = requestAnimationFrame(fitNext);
  };

  detailFitFrame = requestAnimationFrame(fitNext);
}

function choiceLabel(index) {
  return t('common.choice', { letter: String.fromCharCode(65 + index) });
}

function getDiceCount() {
  const count = Number(window.MaybeDice?.getDiceCount?.() ?? document.documentElement.dataset.activeDiceCount ?? 2);
  return Number.isInteger(count) ? Math.max(1, Math.min(5, count)) : 2;
}

function setDiceCount(count) {
  if (!window.MaybeDice?.setDiceCount) {
    throw new Error('The dice physics engine is not ready yet.');
  }
  const result = window.MaybeDice.setDiceCount(count);
  return {...getState(), diceCount: result.diceCount};
}

function persist() {
  saveState(state);
}

function setStep(step) {
  currentStep = step;
  els.steps.forEach((section) => {
    section.classList.toggle('is-hidden', section.dataset.step !== step);
  });
  els.home.classList.toggle('is-hidden', step === 'home');
  document.documentElement.dataset.maybeStep = step;
  els.ui.scrollTop = 0;
  scheduleDetailFit();
}

function setDecisionSaveStatus(message = '') {
  els.saveStatuses.forEach((status) => { status.textContent = message; });
}

function saveCurrentDecisionToShelf() {
  const options = sanitizeOptions(state.options);
  if (!state.question || options.length < MIN_OPTIONS) {
    setDecisionSaveStatus(t('shelf.saveCurrentError'));
    return false;
  }

  saveCustomQuestionCards([{
    question: state.question,
    message: state.assistantText || t('shelf.defaultMessage'),
    category: 'personal',
    options,
  }], { mode: 'append' });
  setDecisionSaveStatus(t('shelf.saveCurrentSuccess'));
  return true;
}

function buildCodexDeepLink() {
  const deepLink = new URL('https://chatgpt.com/codex/deeplink');
  deepLink.searchParams.set('url', 'https://webmcp.qinqinghua.tech/maybe');
  return deepLink.href;
}

function resetDecision({ keepQuestion = false } = {}) {
  state = {
    ...DEFAULT_STATE,
    question: keepQuestion ? state.question : '',
    mapping: [...DEFAULT_STATE.mapping],
    clarifications: [],
  };
  followupPrompt = '';
  setDecisionSaveStatus('');
  persist();
}

function refreshStateFromActiveCard() {
  if (!state.activeCardId) return false;
  const card = findQuestionCard(state.activeCardId, getLocale());
  if (!card) return false;
  state.question = card.question;
  state.assistantText = card.message;
  state.directAnswer = '';
  state.options = sanitizeOptions(card.options);
  state.mapping = createBalancedMapping(state.options);
  state.clarifications = [];
  return true;
}

function showQuestionStep() {
  els.questionInput.value = state.question || '';
  setStep('question');
  requestAnimationFrame(() => els.questionInput.focus());
}

function setLibraryStatus(message = '') {
  els.libraryStatus.textContent = message;
}

function useQuestionCard(id) {
  const card = findQuestionCard(id, getLocale());
  if (!card) throw new Error(`Question card not found: ${id}`);
  state.question = card.question;
  state.assistantText = card.message;
  state.directAnswer = '';
  state.options = sanitizeOptions(card.options);
  state.mapping = createBalancedMapping(state.options);
  state.activeCardId = card.id;
  state.clarifications = [];
  setDecisionSaveStatus('');
  persist();
  showOptionsStep();
  return getState();
}

function renderLibrary() {
  const query = els.librarySearch.value;
  const cards = listQuestionCards({ category: libraryCategory, query, locale: getLocale() });
  els.libraryCategories.innerHTML = '';
  QUESTION_CATEGORIES.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = t(`category.${category.id}`);
    button.className = category.id === libraryCategory ? 'is-selected' : '';
    button.setAttribute('aria-pressed', String(category.id === libraryCategory));
    button.addEventListener('click', () => {
      libraryCategory = category.id;
      renderLibrary();
    });
    els.libraryCategories.appendChild(button);
  });

  els.questionCardList.innerHTML = '';
  cards.forEach((card) => {
    const item = els.questionCardTemplate.content.firstElementChild.cloneNode(true);
    item.dataset.cardId = card.id;
    item.querySelector('.question-card-category').textContent = card.source === 'custom'
      ? `${t('shelf.minePrefix')} · ${t(`category.${card.category}`)}`
      : t(`category.${card.category}`);
    item.querySelector('.question-card-title').textContent = card.question;
    item.querySelector('.question-card-preview').textContent = card.options.join(' · ');
    const useCard = item.querySelector('.use-card');
    useCard.textContent = t('shelf.useCard');
    useCard.addEventListener('click', () => useQuestionCard(card.id));
    const remove = item.querySelector('.remove-card');
    remove.hidden = card.source !== 'custom';
    remove.setAttribute('aria-label', t('shelf.removeAria'));
    remove.addEventListener('click', () => {
      removeCustomQuestionCard(card.id);
      setLibraryStatus(t('shelf.removed'));
      renderLibrary();
    });
    els.questionCardList.appendChild(item);
  });

  els.libraryCount.textContent = tp('shelf.cardCount', cards.length);
  if (!cards.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = t('shelf.empty');
    els.questionCardList.appendChild(empty);
  }
}

function showLibrary() {
  renderLibrary();
  setStep('library');
}

function saveQuestionCards(cards, { mode = 'append' } = {}) {
  const saved = saveCustomQuestionCards(cards, { mode });
  libraryCategory = 'personal';
  setLibraryStatus(tp('shelf.saved', saved.length, { count: saved.length }));
  renderLibrary();
  setStep('library');
  return { savedCount: saved.length, cards: saved, step: currentStep };
}

function getQuestionCards(filters = {}) {
  return {
    categories: QUESTION_CATEGORIES,
    cards: listQuestionCards({ ...filters, locale: getLocale() }),
    customCount: listQuestionCards({ source: 'custom', locale: getLocale() }).length,
  };
}

function submitQuestion() {
  const question = els.questionInput.value.trim().replace(/\s+/g, ' ');
  if (!question) {
    els.questionInput.focus();
    return;
  }

  state.question = question.slice(0, 240);
  state.assistantText = '';
  state.directAnswer = '';
  state.options = [];
  state.mapping = [...DEFAULT_STATE.mapping];
  state.clarifications = [];
  persist();

  els.pendingQuestion.textContent = `“${state.question}”`;
  setStep('waiting');

  window.dispatchEvent(new CustomEvent('maybe:question-ready', {
    detail: { question: state.question },
  }));

  if (!webmcpSupported) {
    $('#waiting-status').textContent = t('status.noWebmcp');
    scheduleDetailFit();
  }
}

function renderOptions({ focusLast = false } = {}) {
  els.assistantText.textContent = state.assistantText || t('options.defaultAssistant');
  els.optionList.innerHTML = '';

  state.options.forEach((option, index) => {
    const row = els.optionTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('.option-letter').textContent = String.fromCharCode(65 + index);
    const input = row.querySelector('.option-input');
    const remove = row.querySelector('.remove-option');
    input.value = option;
    input.addEventListener('input', () => {
      state.options[index] = input.value.slice(0, 80);
      persist();
    });
    input.addEventListener('blur', () => {
      const previousLength = state.options.length;
      state.options = sanitizeOptions(state.options);
      if (state.options.length < MIN_OPTIONS) {
        while (state.options.length < MIN_OPTIONS) state.options.push(choiceLabel(state.options.length));
      }
      if (state.options.length !== previousLength) {
        state.mapping = createBalancedMapping(state.options);
        renderOptions();
      }
      persist();
    });
    remove.disabled = state.options.length <= MIN_OPTIONS;
    remove.addEventListener('click', () => {
      if (state.options.length <= MIN_OPTIONS) return;
      state.options.splice(index, 1);
      state.mapping = createBalancedMapping(state.options);
      persist();
      renderOptions();
    });
    els.optionList.appendChild(row);
  });

  els.addOption.disabled = state.options.length >= MAX_OPTIONS;
  if (focusLast) {
    requestAnimationFrame(() => els.optionList.lastElementChild?.querySelector('.option-input')?.select());
  }
}

function showOptionsStep() {
  state.options = sanitizeOptions(state.options);
  if (state.options.length < MIN_OPTIONS) {
    state.options = [choiceLabel(0), choiceLabel(1)];
  }
  state.mapping = normalizeMapping(state.mapping, state.options.length);
  renderOptions();
  setStep('options');
}

function commitOptions() {
  const values = $$('.option-input').map((input) => input.value);
  const clean = sanitizeOptions(values);
  if (clean.length < MIN_OPTIONS) {
    els.assistantText.textContent = t('options.keepTwo');
    return false;
  }

  const countChanged = clean.length !== state.options.length;
  state.options = clean;
  state.mapping = countChanged
    ? createBalancedMapping(clean)
    : normalizeMapping(state.mapping, clean.length);
  persist();
  return true;
}

function renderMappingSummary() {
  els.readyQuestion.textContent = `“${state.question}”`;
  els.mappingSummary.innerHTML = '';
  mappingGroups(state.options, state.mapping).forEach((group) => {
    const line = document.createElement('div');
    line.className = 'mapping-line';
    const faces = document.createElement('span');
    faces.className = 'mapping-faces';
    faces.textContent = group.faces.length ? group.faces.join(' / ') : '—';
    const label = document.createElement('span');
    label.textContent = group.label;
    line.append(faces, label);
    els.mappingSummary.appendChild(line);
  });
}

function showReadyStep() {
  if (!commitOptions()) return;
  renderMappingSummary();
  setStep('ready');
}

function renderFaceMapping() {
  state.mapping = normalizeMapping(state.mapping, state.options.length);
  els.faceMapping.innerHTML = '';
  for (let face = 1; face <= 6; face += 1) {
    const row = document.createElement('div');
    row.className = 'face-row';
    const number = document.createElement('span');
    number.className = 'face-number';
    number.textContent = String(face);
    const select = document.createElement('select');
    select.className = 'face-select';
    select.dataset.face = String(face);
    state.options.forEach((option, optionIndex) => {
      const item = document.createElement('option');
      item.value = String(optionIndex);
      item.textContent = option;
      item.selected = state.mapping[face - 1] === optionIndex;
      select.appendChild(item);
    });
    select.addEventListener('change', () => {
      state.mapping[face - 1] = Number(select.value);
      persist();
    });
    row.append(number, select);
    els.faceMapping.appendChild(row);
  }
}

function parseFaces() {
  return String(els.score.textContent || '')
    .split('+')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6);
}

function renderResult(result) {
  els.resultTitle.textContent = result.winner;
  const voteText = result.votes
    .map((vote) => `${vote.face} → ${vote.option}`)
    .join('  ·  ');
  els.resultDetail.textContent = result.tieBroken ? `${voteText}. ${t('result.tie')}` : voteText;
  setStep('result');
}

function finishRoll(faces) {
  if (!rolling) return null;
  rolling = false;
  clearTimeout(pendingRollTimer);
  pendingRollTimer = null;

  try {
    const resolved = resolveFaces(faces, state.options, state.mapping);
    const entry = {
      id: `roll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      question: state.question,
      assistantText: state.assistantText,
      options: [...state.options],
      mapping: [...state.mapping],
      diceCount: resolved.faces.length,
      faces: [...resolved.faces],
      winner: resolved.winner,
      votes: resolved.votes,
      tieBroken: resolved.tieBroken,
    };
    history = appendHistory(entry);
    renderResult(resolved);
    pendingRollResolve?.(entry);
    pendingRollResolve = null;
    pendingRollReject = null;
    pendingRollPromise = null;
    return entry;
  } catch (error) {
    pendingRollReject?.(error);
    pendingRollResolve = null;
    pendingRollReject = null;
    pendingRollPromise = null;
    setStep('ready');
    throw error;
  }
}

function beginRoll() {
  if (rolling && pendingRollPromise) return pendingRollPromise;
  if (sanitizeOptions(state.options).length < MIN_OPTIONS) {
    return Promise.reject(new Error('Add at least two choices before rolling.'));
  }

  rolling = true;
  pendingDiceCount = getDiceCount();
  setStep('rolling');

  pendingRollPromise = new Promise((resolve, reject) => {
    pendingRollResolve = resolve;
    pendingRollReject = reject;
    pendingRollTimer = setTimeout(() => {
      if (!rolling) return;
      rolling = false;
      pendingRollPromise = null;
      pendingRollResolve = null;
      pendingRollReject = null;
      setStep('ready');
      reject(new Error(`The dice animation did not return ${pendingDiceCount} settled result${pendingDiceCount === 1 ? '' : 's'} in time.`));
    }, 18000);
  });

  // This remains the only bridge to the renderer: click the visible roll button.
  // main.js owns all Three.js/cannon-es behavior, including the active count.
  els.roll.click();
  return pendingRollPromise;
}

function renderHistory() {
  history = loadHistory();
  els.historyList.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = t('history.empty');
    els.historyList.appendChild(empty);
    return;
  }

  history.slice(0, 20).forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const result = document.createElement('strong');
    result.textContent = entry.winner || t('result.history');
    const question = document.createElement('span');
    question.className = 'history-question';
    question.textContent = `${entry.question || t('history.roll')} · ${(entry.faces || []).join('+')}`;
    const answers = document.createElement('span');
    answers.className = 'history-answers';
    const optionList = Array.isArray(entry.options) ? entry.options : [];
    answers.textContent = optionList.length ? optionList.join(' · ') : t('history.answersMissing');
    item.append(result, question, answers);
    els.historyList.appendChild(item);
  });
}

function presentOptions({ message, options }) {
  const clean = sanitizeOptions(options);
  if (clean.length < MIN_OPTIONS) {
    throw new Error('Codex must present at least two distinct choices.');
  }
  state.assistantText = String(message || t('options.presentDefault')).trim().slice(0, 360);
  state.directAnswer = '';
  state.options = clean;
  state.mapping = createBalancedMapping(clean);
  state.activeCardId = '';
  setDecisionSaveStatus('');
  persist();
  showOptionsStep();
  return getState();
}

function respondInPage({ question, kind, message, options = [] }) {
  const cleanQuestion = String(question || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  if (!cleanQuestion) throw new Error('A question is required.');

  state.question = cleanQuestion;
  state.activeCardId = '';
  state.clarifications = [];

  if (kind === 'decision') {
    return presentOptions({ message, options });
  }
  if (kind !== 'answer') throw new Error('kind must be either "decision" or "answer".');

  const answer = String(message || '').trim().slice(0, 1000);
  if (!answer) throw new Error('An answer is required.');
  state.assistantText = '';
  state.directAnswer = answer;
  state.options = [];
  state.mapping = [...DEFAULT_STATE.mapping];
  persist();
  els.answerQuestion.textContent = `“${state.question}”`;
  els.answerText.textContent = answer;
  setStep('answer');
  return getState();
}

function presentFollowup(question) {
  followupPrompt = String(question || '').trim().slice(0, 160);
  if (!followupPrompt) throw new Error('A follow-up question is required.');
  els.followupQuestion.textContent = followupPrompt;
  els.followupInput.value = '';
  setStep('followup');
  requestAnimationFrame(() => els.followupInput.focus());
  return getContext();
}

function getContext() {
  return {
    status: currentStep === 'waiting' ? 'waiting_for_codex' : currentStep,
    question: state.question,
    clarifications: [...state.clarifications],
    locale: getLocale(),
    preferredTool: 'maybe_respond_in_page',
    instruction: 'Call maybe_respond_in_page next. For ordinary questions, answer or create 2-6 choices immediately without research; set autoRoll when the user wants a decision now.',
  };
}

function getState() {
  return {
    step: currentStep,
    question: state.question,
    assistantText: state.assistantText,
    directAnswer: state.directAnswer || '',
    options: [...state.options],
    mapping: [...state.mapping],
    mappingSummary: mappingGroups(state.options, state.mapping),
    diceCount: getDiceCount(),
    currentScore: parseFaces(),
  };
}

function setMapping(mapping) {
  if (state.options.length < MIN_OPTIONS) throw new Error('No active choices are available.');
  if (!Array.isArray(mapping) || mapping.length !== 6) throw new Error('Mapping must contain six entries.');
  const candidate = mapping.map(Number);
  if (candidate.some((value) => !Number.isInteger(value) || value < 0 || value >= state.options.length)) {
    throw new Error(`Each mapping entry must be a choice index from 0 to ${state.options.length - 1}.`);
  }
  state.mapping = candidate;
  persist();
  if (currentStep === 'ready') renderMappingSummary();
  if (currentStep === 'odds') renderFaceMapping();
  return getState();
}

function syncLanguageUI() {
  const language = getLanguage();
  els.languageButtonCode.textContent = language.short;
  els.languageButton.setAttribute('aria-expanded', String(isLanguageMenuOpen));
  applyTranslations();
  if (refreshStateFromActiveCard()) {
    if (currentStep === 'question') {
      els.questionInput.value = state.question;
    }
    if (currentStep === 'waiting') {
      els.pendingQuestion.textContent = `“${state.question}”`;
    }
    if (currentStep === 'options') renderOptions();
    if (currentStep === 'ready') renderMappingSummary();
    if (currentStep === 'odds') renderFaceMapping();
    if (currentStep === 'history') renderHistory();
  }
  if (currentStep === 'library') renderLibrary();
}

function closeLanguageMenu() {
  isLanguageMenuOpen = false;
  els.languageMenu.classList.add('is-hidden');
  syncLanguageUI();
}

function openLanguageMenu() {
  isLanguageMenuOpen = true;
  els.languageMenu.classList.remove('is-hidden');
  syncLanguageUI();
}

function toggleLanguageMenu() {
  if (isLanguageMenuOpen) {
    closeLanguageMenu();
  } else {
    openLanguageMenu();
  }
}

function initLanguageMenu() {
  els.languageMenu.innerHTML = '';
  const current = getLocale();
  LANGUAGES.forEach((language) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.role = 'menuitemradio';
    item.className = language.code === current ? 'is-selected' : '';
    item.setAttribute('aria-pressed', String(language.code === current));
    item.textContent = language.label;
    item.addEventListener('click', () => {
      setLocale(language.code);
      closeLanguageMenu();
      syncLanguageUI();
    });
    els.languageMenu.appendChild(item);
  });

  els.languageButton.addEventListener('click', (event) => {
    event.preventDefault();
    toggleLanguageMenu();
  });

  document.addEventListener('click', (event) => {
    if (!els.languageMenu.contains(event.target) && !els.languageButton.contains(event.target)) {
      closeLanguageMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLanguageMenu();
    }
  });
}

function seedPersonalQuestionPack() {
  try {
    if (localStorage.getItem(PERSONAL_PACK_SEED_KEY)) return;

    const existing = loadCustomQuestionCards();
    const saved = saveCustomQuestionCards(PERSONAL_PACK_SEED, { mode: 'append' });
    const expected = existing.length + PERSONAL_PACK_SEED.length;
    if (saved.length >= expected) return;
    localStorage.setItem(PERSONAL_PACK_SEED_KEY, `partial:${expected}`);
  } catch {
    // If a localStorage write fails (e.g. privacy mode), silently continue.
  } finally {
    try {
      localStorage.setItem(PERSONAL_PACK_SEED_KEY, localStorage.getItem(PERSONAL_PACK_SEED_KEY) || 'done');
    } catch {
      // no-op
    }
  }
}

// The home flow keeps two primary actions; the compact 1-5 control is a setting.
els.home.addEventListener('click', () => setStep('home'));
els.openCodex.href = buildCodexDeepLink();
els.saveCurrentButtons.forEach((button) => {
  button.addEventListener('click', saveCurrentDecisionToShelf);
});
els.ask.addEventListener('click', () => {
  resetDecision();
  showQuestionStep();
});
els.languageMenu.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeLanguageMenu();
  }
});
els.libraryBtn.addEventListener('click', showLibrary);
els.librarySearch.addEventListener('input', renderLibrary);
els.copyLibraryPrompt.addEventListener('click', async () => {
  const prompt = t('shelf.prompt');
  try {
    await navigator.clipboard.writeText(prompt);
    setLibraryStatus(t('shelf.promptCopied'));
  } catch {
    setLibraryStatus(t('shelf.tellCodex', { prompt }));
  }
});
els.importLibrary.addEventListener('click', () => els.libraryFileInput.click());
els.libraryFileInput.addEventListener('change', async () => {
  const file = els.libraryFileInput.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const cards = Array.isArray(parsed) ? parsed : parsed.cards;
    saveQuestionCards(cards, { mode: 'append' });
    setLibraryStatus(tp('shelf.imported', cards.length, { count: cards.length, file: file.name }));
  } catch (error) {
    setLibraryStatus(t('shelf.importError', { error: error.message }));
  } finally {
    els.libraryFileInput.value = '';
  }
});
els.exportLibrary.addEventListener('click', () => {
  const pack = exportQuestionPack();
  if (!pack.cards.length) {
    setLibraryStatus(t('shelf.emptyExport'));
    return;
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'maybe-question-pack.json';
  link.click();
  URL.revokeObjectURL(url);
  setLibraryStatus(t('shelf.exported'));
});

els.questionNext.addEventListener('click', submitQuestion);
els.questionInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitQuestion();
});

els.ownOptions.addEventListener('click', () => {
  state.activeCardId = '';
  state.assistantText = t('options.ownMessage');
  state.options = [choiceLabel(0), choiceLabel(1)];
  state.mapping = createBalancedMapping(state.options);
  persist();
  showOptionsStep();
});

els.followupNext.addEventListener('click', () => {
  const answer = els.followupInput.value.trim();
  if (!answer) { els.followupInput.focus(); return; }
  state.clarifications.push({ question: followupPrompt, answer: answer.slice(0, 180) });
  state.clarifications = state.clarifications.slice(-3);
  persist();
  els.pendingQuestion.textContent = `“${state.question}”`;
  setStep('waiting');
  window.dispatchEvent(new CustomEvent('maybe:question-ready', { detail: getContext() }));
});

els.followupSkip.addEventListener('click', () => {
  state.clarifications.push({ question: followupPrompt, answer: t('followup.skip') });
  state.clarifications = state.clarifications.slice(-3);
  persist();
  setStep('waiting');
});

els.addOption.addEventListener('click', () => {
  if (state.options.length >= MAX_OPTIONS) return;
  state.options.push(choiceLabel(state.options.length));
  state.mapping = createBalancedMapping(state.options);
  persist();
  renderOptions({ focusLast: true });
});

els.optionsNext.addEventListener('click', showReadyStep);
els.customizeOdds.addEventListener('click', () => {
  renderFaceMapping();
  setStep('odds');
});
els.saveOdds.addEventListener('click', () => {
  persist();
  renderMappingSummary();
  setStep('ready');
});
els.balanceOdds.addEventListener('click', () => {
  state.mapping = createBalancedMapping(state.options);
  persist();
  renderFaceMapping();
});

els.decisionRoll.addEventListener('click', () => { beginRoll().catch(console.warn); });
els.rollAgain.addEventListener('click', () => { beginRoll().catch(console.warn); });
els.newQuestion.addEventListener('click', () => {
  resetDecision();
  showQuestionStep();
});
els.answerAnother.addEventListener('click', () => {
  resetDecision();
  showQuestionStep();
});
els.historyBtn?.addEventListener('click', () => {
  renderHistory();
  setStep('history');
});
els.clearHistory.addEventListener('click', () => {
  clearHistory();
  history = [];
  renderHistory();
});

$$('[data-back]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.back;
    if (target === 'home') setStep('home');
    if (target === 'question') showQuestionStep();
    if (target === 'options') showOptionsStep();
  });
});

// Keep double-click-to-throw behavior. If a decision is ready, we only observe
// the resulting score and map it to the current choices; the renderer still
// owns the actual throw.
window.addEventListener('dblclick', (event) => {
  if (event?.target?.closest?.('.ui-controls, .product-brand')) return;
  if ((currentStep === 'ready' || currentStep === 'result') && state.options.length >= MIN_OPTIONS && !rolling) {
    rolling = true;
    pendingDiceCount = getDiceCount();
    setStep('rolling');
    pendingRollPromise = new Promise((resolve, reject) => {
      pendingRollResolve = resolve;
      pendingRollReject = reject;
      pendingRollTimer = setTimeout(() => {
        if (!rolling) return;
        rolling = false;
        pendingRollPromise = null;
        pendingRollResolve = null;
        pendingRollReject = null;
        setStep('ready');
        reject(new Error(`The dice animation did not return ${pendingDiceCount} settled result${pendingDiceCount === 1 ? '' : 's'} in time.`));
      }, 18000);
    });
    void pendingRollPromise.catch((error) => console.warn(error));
  }
});

const scoreObserver = new MutationObserver(() => {
  if (!rolling) return;
  const faces = parseFaces();
  if (faces.length >= pendingDiceCount) finishRoll(faces.slice(0, pendingDiceCount));
});
scoreObserver.observe(els.score, { childList: true, characterData: true, subtree: true });

const siteApi = {
  getContext,
  respondInPage,
  presentOptions,
  presentFollowup,
  getState,
  setMapping,
  setDiceCount,
  roll: beginRoll,
  getHistory(limit = 10) { return loadHistory().slice(0, Math.max(1, Math.min(30, Number(limit) || 10))); },
  exportMemory,
  getQuestionCards,
  saveQuestionCards,
  useQuestionCard,
};
window.Maybe = siteApi;

async function initWebMCP() {
  const result = await registerWebMCP(siteApi);
  webmcpSupported = result.supported;
  document.documentElement.dataset.webmcp = result.supported ? 'supported' : 'unavailable';
  return result;
}

initLanguageMenu();
syncLanguageUI();
window.addEventListener('maybe:language-change', () => {
  syncLanguageUI();
  scheduleDetailFit();
});
window.addEventListener('resize', scheduleDetailFit, { passive: true });

applyTranslations();
seedPersonalQuestionPack();
initWebMCP().catch((error) => console.warn('[Maybe] WebMCP init failed', error));
setStep('home');
