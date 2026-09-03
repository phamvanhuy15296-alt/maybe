const CUSTOM_CARDS_KEY = 'maybe_question_cards_v1';
const MAX_CUSTOM_CARDS = 30;
import { getLocale, t } from './i18n.js?v=20260903-playful';
import { BUILT_IN_CARD_TRANSLATIONS } from './question-library-translations.js?v=20260903-playful';

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
    "id": "office-meeting-escape",
    "category": "office",
    "question": "How do we give this meeting a shorter ending?",
    "message": "A little less talking, a little more afternoon.",
    "options": [
      "Replace it with a shared note",
      "Keep a 15-minute decision chat",
      "Cancel it and send three key points",
      "Keep the slot for silent co-working"
    ]
  },
  {
    "id": "office-notes-hero",
    "category": "office",
    "question": "How shall we pick this meeting’s note-taker?",
    "message": "The notes need a name, not a quest.",
    "options": [
      "Ask for a volunteer",
      "Use a rotating roster",
      "Let the host take notes",
      "Have everyone record their own actions"
    ]
  },
  {
    "id": "office-friday-ritual",
    "category": "office",
    "question": "What tiny Friday tradition shall we try?",
    "message": "No committee required.",
    "options": [
      "A five-minute demo round",
      "One tiny-win story each",
      "A shared snack break",
      "A quiet hour with no meetings"
    ]
  },
  {
    "id": "daily-dinner-talks",
    "category": "daily",
    "question": "What’s tonight’s plate of happiness?",
    "message": "One meal, four delicious plot twists.",
    "options": [
      "A warm bowl of noodles",
      "Curry with a little kick",
      "Dumplings all lined up",
      "Breakfast making a dinner cameo"
    ]
  },
  {
    "id": "daily-twenty-minutes",
    "category": "daily",
    "question": "Twenty free minutes: what shall we add to today?",
    "message": "No life makeover needed.",
    "options": [
      "Take a short walk",
      "Draw something joyfully wonky",
      "Read a few pages for fun",
      "Make a drink with extra care"
    ]
  },
  {
    "id": "daily-micro-adventure",
    "category": "daily",
    "question": "Which tiny detour shall we try today?",
    "message": "Adventure, pocket-sized.",
    "options": [
      "Walk down an unfamiliar nearby street",
      "Try an inexpensive new snack",
      "Sketch a familiar corner",
      "Take five photos of accidental faces"
    ]
  },
  {
    "id": "work-fresh-brain",
    "category": "work",
    "question": "What gets the first 25 minutes of focus?",
    "message": "The inbox can wait its turn.",
    "options": [
      "Make progress on my main task",
      "Reply to one blocking message",
      "Tidy one small workspace area",
      "Learn one useful shortcut"
    ]
  },
  {
    "id": "work-unstick-project",
    "category": "work",
    "question": "Where do we start unsticking this project?",
    "message": "One small nudge, not a heroic rescue.",
    "options": [
      "Reduce the first milestone",
      "Write down the unanswered question",
      "Pair up for 25 minutes",
      "Build a rough demo"
    ]
  },
  {
    "id": "work-say-no",
    "category": "work",
    "question": "What gets a little less space this week?",
    "message": "Make room without making a speech.",
    "options": [
      "Shorten one recurring meeting",
      "Drop one unused report",
      "Limit inbox checking to set times",
      "Stop polishing one finished draft"
    ]
  },
  {
    "id": "coding-bug-safari",
    "category": "coding",
    "question": "Where do we start this bug investigation?",
    "message": "No magnifying glass required.",
    "options": [
      "Make the smallest reproduction",
      "Check recent changes",
      "Add focused logs",
      "Explain the case to a rubber duck"
    ]
  },
  {
    "id": "coding-refactor",
    "category": "coding",
    "question": "Which small refactor gets a turn?",
    "message": "One knot, not the whole sweater.",
    "options": [
      "Extract a duplicated rule",
      "Rename unclear variables",
      "Split one oversized function",
      "Add tests around one fragile module"
    ]
  },
  {
    "id": "coding-green-build",
    "category": "coding",
    "question": "The tests are green. Pick a tiny celebration?",
    "message": "Keep the victory lap short and sweet.",
    "options": [
      "Take a five-minute walk",
      "Make a favorite drink",
      "Write one line in the win log",
      "Doodle the defeated bug"
    ]
  },
  {
    "id": "humor-chaos-cause",
    "category": "humor",
    "question": "Which silly explanation gets today’s chaos?",
    "message": "For the fictional report only.",
    "options": [
      "The tabs held a secret party",
      "Tuesday arrived without instructions",
      "A spreadsheet learned improv",
      "The coffee went on a side quest"
    ]
  },
  {
    "id": "humor-deadline-title",
    "category": "humor",
    "question": "What’s the movie title for this deadline?",
    "message": "Big trailer voice, small actual budget.",
    "options": [
      "The Last Five Minutes",
      "Just One More Tiny Change",
      "Return of the Missing File",
      "Tomorrow Was Yesterday"
    ]
  },
  {
    "id": "humor-rebellion",
    "category": "humor",
    "question": "What harmless silliness fits this afternoon?",
    "message": "No unsuspecting colleagues involved.",
    "options": [
      "Give my notebook a movie title",
      "Draw a tiny monster on scrap paper",
      "Invent a snack award on my own note",
      "Write a weather report for my desk"
    ]
  },
  {
    "id": "creative-constraint",
    "category": "creative",
    "question": "What playful rule shall this idea follow?",
    "message": "A small limit can open a new door.",
    "options": [
      "Explain it in six words",
      "Use only two colors",
      "Make a paper-only version",
      "Design it to fit in a pocket"
    ]
  },
  {
    "id": "creative-opening-shot",
    "category": "creative",
    "question": "Which scene opens this little story?",
    "message": "One opening, plenty of possibilities.",
    "options": [
      "A key that fits nothing",
      "A note dated tomorrow",
      "A party with an empty guest list",
      "A doorbell ringing underwater"
    ]
  },
  {
    "id": "creative-prototype-feel",
    "category": "creative",
    "question": "What mood shall this prototype try?",
    "message": "Pick a feeling for one quick experiment.",
    "options": [
      "A calm reading nook",
      "A bright little arcade",
      "A curious nature notebook",
      "A cozy kitchen table"
    ]
  }
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
