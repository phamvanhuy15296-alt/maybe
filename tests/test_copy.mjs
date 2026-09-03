import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LANGUAGES } from '../js/i18n.js';
import { getBuiltInQuestionCards, saveCustomQuestionCards, loadCustomQuestionCards } from '../js/question-library.js';
import { BUILT_IN_CARD_TRANSLATIONS } from '../js/question-library-translations.js';

const source = fs.readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
const messages = JSON.parse(source.match(/const messages = ([\s\S]*?);\n\nlet currentLocale/)[1]);
const keys = Object.keys(messages.en).sort();
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const englishCards = getBuiltInQuestionCards('en');
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
saveCustomQuestionCards([{ question: 'My exact question?', options: ['Keep my wording', 'Do not translate me'] }]);
const saved = JSON.stringify(loadCustomQuestionCards());

for (const { code } of LANGUAGES) {
  assert.deepEqual(Object.keys(messages[code]).sort(), keys, `${code}: missing translation keys`);
  for (const key of keys) {
    const text = messages[code][key];
    assert.ok(text.trim(), `${code}.${key}: empty`);
    assert.deepEqual(placeholders(text), placeholders(messages.en[key]), `${code}.${key}: placeholders`);
    assert.ok(!/^(?:\+ )?\p{Ll}/u.test(text), `${code}.${key}: sentence case`);
  }
  if (code !== 'en') assert.equal(BUILT_IN_CARD_TRANSLATIONS[code].length, 18);
  const cards = getBuiltInQuestionCards(code);
  assert.equal(cards.length, 18);
  cards.forEach((card, i) => {
    assert.equal(card.id, englishCards[i].id);
    assert.equal(card.category, englishCards[i].category);
    assert.equal(card.options.length, englishCards[i].options.length);
    assert.ok(card.options.length >= 2 && card.options.length <= 6);
    assert.equal(new Set(card.options).size, card.options.length);
    assert.ok(card.question.length > 0 && card.question.length <= 180);
    assert.ok(card.message.length > 0 && card.message.length <= 240);
    card.options.forEach((option) => assert.ok(option.length > 0 && option.length <= 80, `${code}: ${option}`));
  });
  assert.equal(JSON.stringify(loadCustomQuestionCards()), saved, `${code}: custom cards changed`);
}

assert.equal(messages.en.tagline, 'Can’t pick? Give it a roll.');
assert.equal(messages.zh.tagline, '纠结一下？不如掷一下。');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const decode = (text) => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&lt;', '<');
for (const match of html.matchAll(/<[^>]+data-i18n="([^"]+)"[^>]*>([^<]*)<\//g)) {
  assert.equal(decode(match[2]), messages.en[match[1]], `${match[1]}: initial HTML differs`);
}
for (const match of html.matchAll(/<[^>]+data-i18n-placeholder="([^"]+)"[^>]*>/g)) {
  assert.equal(decode(match[0].match(/placeholder="([^"]*)"/)[1]), messages.en[match[1]]);
}
console.log('PASS seven-language copy, placeholders, 18 aligned cards, HTML fallbacks, and personal-card preservation');
