import assert from 'node:assert/strict';
import {
  QUESTION_CATEGORIES,
  getBuiltInQuestionCards,
  listQuestionCards,
  loadCustomQuestionCards,
  saveCustomQuestionCards,
  removeCustomQuestionCard,
  exportQuestionPack,
} from '../js/question-library.js';

const memory = new Map();
global.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};

const builtIns = getBuiltInQuestionCards();
assert.equal(builtIns.length, 18);
assert.deepEqual(QUESTION_CATEGORIES.map(({ id }) => id), [
  'all', 'office', 'daily', 'work', 'coding', 'humor', 'creative', 'personal',
]);
for (const category of ['office', 'daily', 'work', 'coding', 'humor', 'creative']) {
  assert.equal(builtIns.filter((card) => card.category === category).length, 3);
}

const saved = saveCustomQuestionCards([
  {
    question: 'What should my pre-demo ritual be?',
    message: 'A tiny ritual for steadier hands and livelier demos.',
    category: 'personal',
    options: ['One deep breath', 'Roll once for luck', 'Say the opening line out loud'],
  },
]);
assert.equal(saved.length, 1);
assert.equal(loadCustomQuestionCards()[0].options.length, 3);
assert.equal(listQuestionCards({ category: 'personal' }).length, 1);
assert.equal(listQuestionCards({ query: 'steadier hands' }).length, 1);
assert.equal(exportQuestionPack().format, 'maybe-question-pack');

saveCustomQuestionCards([{
  question: 'Which work ritual should I keep?',
  category: 'work',
  options: ['Morning plan', 'Afternoon reset'],
}]);
assert.equal(listQuestionCards({ category: 'personal' }).length, 2);
assert.equal(listQuestionCards({ category: 'work', source: 'custom' }).length, 1);

assert.throws(
  () => saveCustomQuestionCards([{ question: 'Not enough answers', options: ['Only one'] }]),
  /at least one card/i,
);

removeCustomQuestionCard(saved[0].id);
assert.equal(loadCustomQuestionCards().length, 1);
console.log('PASS lively built-in shelf and persistent custom question packs');
