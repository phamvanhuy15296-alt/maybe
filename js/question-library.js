const CUSTOM_CARDS_KEY = 'maybe_question_cards_v1';
const MAX_CUSTOM_CARDS = 30;
import { getLocale, t } from './i18n.js';
import { BUILT_IN_CARD_TRANSLATIONS } from './question-library-translations.js';

export const QUESTION_CATEGORIES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'office', label: 'Office' },
  { id: 'daily', label: 'Daily' },
  { id: 'work', label: 'Work' },
  { id: 'coding', label: 'Coding' },
  { id: 'humor', label: 'Humor' },
  { id: 'creative', label: 'Creative' },
  { id: 'personal', label: 'Mine' },
]);

const BUILT_IN_CARDS = [
  {
    id: 'office-meeting-escape', category: 'office',
    question: 'How do we rescue a meeting that should have been an email?',
    message: 'A tiny intervention for a calendar with main-character energy.',
    options: ['Turn the agenda into an async doc', 'Keep a 15-minute decision huddle', 'Cancel it and send three crisp bullets'],
  },
  {
    id: 'office-notes-hero', category: 'office',
    question: 'Who gets the glorious quest of taking meeting notes?',
    message: 'Every fellowship needs a keeper of the action items.',
    options: ['The person who booked it', 'Rotate alphabetically', 'The last person to join', 'Let the dice appoint today’s scribe'],
  },
  {
    id: 'office-friday-ritual', category: 'office',
    question: 'What should become our delightfully unofficial Friday ritual?',
    message: 'Culture is just recurring behavior with better snacks.',
    options: ['Five-minute demo parade', 'Tiny-win awards', 'No-agenda coffee roulette', 'A dramatic inbox zero countdown'],
  },
  {
    id: 'daily-dinner-talks', category: 'daily',
    question: 'Dinner has entered negotiations. What wins tonight?',
    message: 'The kitchen cabinet has recused itself from the vote.',
    options: ['Noodles with unreasonable confidence', 'Dumplings, because joy has folds', 'A colorful rice bowl', 'Breakfast for dinner'],
  },
  {
    id: 'daily-twenty-minutes', category: 'daily',
    question: 'How should I rescue the next 20 minutes?',
    message: 'Not enough time for a reinvention—plenty for a tiny plot twist.',
    options: ['Walk without a destination', 'Clear one annoying surface', 'Read ten pages', 'Call someone I miss', 'Make a suspiciously fancy drink'],
  },
  {
    id: 'daily-micro-adventure', category: 'daily',
    question: 'What tiny adventure should I take today?',
    message: 'No passport, quest log, or chosen-one prophecy required.',
    options: ['Try the weirdest snack nearby', 'Take the long route home', 'Visit a place I always pass', 'Photograph five accidental faces'],
  },
  {
    id: 'work-fresh-brain', category: 'work',
    question: 'Which task deserves my freshest brain today?',
    message: 'Let the dice protect your best attention from inbox confetti.',
    options: ['The task with the biggest consequence', 'The task I keep avoiding', 'The task that unblocks someone else', 'The smallest meaningful win'],
  },
  {
    id: 'work-unstick-project', category: 'work',
    question: 'How do we unstick this project before lunch?',
    message: 'A practical nudge for a project currently impersonating furniture.',
    options: ['Cut the scope in half', 'Name the one missing decision', 'Pair up for 25 minutes', 'Ship an ugly first slice', 'Ask the quietest expert'],
  },
  {
    id: 'work-say-no', category: 'work',
    question: 'What should I politely stop doing this week?',
    message: 'Strategic subtraction: productivity’s less photogenic sibling.',
    options: ['A meeting with no decision', 'A report nobody reads', 'A favor that keeps expanding', 'A perfection pass nobody requested'],
  },
  {
    id: 'coding-bug-safari', category: 'coding',
    question: 'How do we approach this suspiciously confident bug?',
    message: 'The bug knows what it did. We just need evidence.',
    options: ['Write the smallest failing test', 'Bisect the recent changes', 'Add observability around the boundary', 'Explain it to a rubber duck', 'Delete the cache—with dignity'],
  },
  {
    id: 'coding-refactor', category: 'coding',
    question: 'Where should the next refactor spend its courage?',
    message: 'Choose one knot to untie, not the entire ball of yarn.',
    options: ['The module everyone fears', 'The duplicated business rule', 'The slowest developer loop', 'The weakest test seam'],
  },
  {
    id: 'coding-green-build', category: 'coding',
    question: 'The tests are finally green. How should we celebrate?',
    message: 'A build this green deserves a tiny release ceremony.',
    options: ['Ship before they reconsider', 'Add the missing regression test', 'Post the heroic terminal screenshot', 'Take a victory walk', 'Name the bug we defeated'],
  },
  {
    id: 'humor-chaos-cause', category: 'humor',
    question: 'What is the official cause of today’s chaos?',
    message: 'The incident report has been replaced by folklore.',
    options: ['Mercury is doing code review', 'A spreadsheet became sentient', 'Someone said “quick sync”', 'The office plant revoked consent', 'Tuesday exceeded its permissions'],
  },
  {
    id: 'humor-deadline-title', category: 'humor',
    question: 'What dramatic title does this deadline deserve?',
    message: 'If we must sprint, we may as well get a movie poster.',
    options: ['Deadline: Impossible', 'The Fast and the Curious', 'Everything Everywhere All at Once-ish', 'Return of the Scope Creep'],
  },
  {
    id: 'humor-rebellion', category: 'humor',
    question: 'Which harmless office rebellion happens at 3 p.m.?',
    message: 'Low stakes. High morale. Plausible deniability.',
    options: ['Rename every meeting “The Gathering”', 'Replace jargon with animal noises', 'Hold a formal snack election', 'Wear sunglasses to the status call'],
  },
  {
    id: 'creative-constraint', category: 'creative',
    question: 'Which constraint would make this idea more interesting?',
    message: 'Creativity likes a fence it can decorate, climb, or dramatically ignore.',
    options: ['Explain it in six words', 'Make it work with no screen', 'Design it for one very specific person', 'Use only what we already have', 'Make the boring part delightful'],
  },
  {
    id: 'creative-opening-shot', category: 'creative',
    question: 'What should the opening scene begin with?',
    message: 'Pick a doorway into the story and let curiosity do the lighting.',
    options: ['An object in the wrong place', 'A promise already broken', 'A celebration nobody understands', 'A message from tomorrow', 'Silence where noise should be'],
  },
  {
    id: 'creative-prototype-feel', category: 'creative',
    question: 'What should our next prototype feel like?',
    message: 'A mood can be a surprisingly useful product requirement.',
    options: ['A clever pocket tool', 'A calm room with one good chair', 'A mischievous co-pilot', 'A handmade field guide', 'An arcade machine for grown-ups'],
  },
];

function safeJson(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function normalizeText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function makeId(question, index = 0) {
  const slug = normalizeText(question, 80)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42) || 'question';
  return `personal-${slug}-${index + 1}`;
}

function resolveBuiltInCard(baseCard, index, locale = getLocale()) {
  const translations = BUILT_IN_CARD_TRANSLATIONS[locale] || [];
  const translated = translations[index] || {};
  return {
    ...baseCard,
    message: String(translated.message || baseCard.message || '').trim() || baseCard.message,
    question: String(translated.question || baseCard.question || '').trim() || baseCard.question,
    options: Array.isArray(translated.options) && translated.options.length ? [...translated.options] : [...baseCard.options],
    source: 'built-in',
  };
}

export function sanitizeQuestionCard(card, index = 0) {
  const question = normalizeText(card?.question, 180);
  const options = [...new Set((Array.isArray(card?.options) ? card.options : [])
    .map((item) => normalizeText(item, 80))
    .filter(Boolean))].slice(0, 6);
  if (!question || options.length < 2) return null;

  const requestedCategory = normalizeText(card?.category, 20).toLowerCase();
  const validCategory = QUESTION_CATEGORIES.some(({ id }) => id === requestedCategory && id !== 'all');
  return {
    id: normalizeText(card?.id, 72) || makeId(question, index),
    category: validCategory ? requestedCategory : 'personal',
    question,
    message: normalizeText(card?.message, 240) || t('shelf.defaultMessage'),
    options,
    source: 'custom',
  };
}

export function getBuiltInQuestionCards(locale = getLocale()) {
  const activeLocale = locale in BUILT_IN_CARD_TRANSLATIONS ? locale : 'en';
  return BUILT_IN_CARDS.map((card, index) => resolveBuiltInCard(card, index, activeLocale));
}

export function loadCustomQuestionCards() {
  const saved = safeJson(localStorage.getItem(CUSTOM_CARDS_KEY), []);
  if (!Array.isArray(saved)) return [];
  return saved.map(sanitizeQuestionCard).filter(Boolean).slice(0, MAX_CUSTOM_CARDS);
}

export function saveCustomQuestionCards(cards, { mode = 'append' } = {}) {
  if (!Array.isArray(cards)) throw new Error('cards must be an array.');
  const clean = cards.map(sanitizeQuestionCard).filter(Boolean);
  if (!clean.length) throw new Error('Add at least one card with a question and 2-6 distinct answers.');

  const base = mode === 'replace' ? [] : loadCustomQuestionCards();
  const byQuestion = new Map(base.map((card) => [card.question.toLowerCase(), card]));
  clean.forEach((card) => byQuestion.set(card.question.toLowerCase(), card));
  const saved = [...byQuestion.values()].slice(-MAX_CUSTOM_CARDS);
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(saved));
  return saved;
}

export function removeCustomQuestionCard(id) {
  const next = loadCustomQuestionCards().filter((card) => card.id !== id);
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(next));
  return next;
}

export function listQuestionCards({ category = 'all', source = 'all', query = '', locale = getLocale() } = {}) {
  const cards = [...getBuiltInQuestionCards(locale), ...loadCustomQuestionCards()];
  const needle = normalizeText(query, 100).toLowerCase();
  return cards.filter((card) => {
    const mineFilter = category === 'personal';
    const categoryMatches = category === 'all' || mineFilter || card.category === category;
    const sourceMatches = (source === 'all' || card.source === source) && (!mineFilter || card.source === 'custom');
    const queryMatches = !needle || `${card.question} ${card.message} ${card.options.join(' ')}`.toLowerCase().includes(needle);
    return categoryMatches && sourceMatches && queryMatches;
  });
}

export function findQuestionCard(id, locale = getLocale()) {
  return listQuestionCards({ locale }).find((card) => card.id === id) || null;
}

export function exportQuestionPack() {
  return {
    format: 'maybe-question-pack',
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: loadCustomQuestionCards().map(({ source, ...card }) => card),
  };
}
