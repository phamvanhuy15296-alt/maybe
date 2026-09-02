import assert from 'node:assert/strict';
import { registerWebMCP } from '../js/webmcp.js';

const registered = [];
global.document = {
  modelContext: {
    async registerTool(tool) { registered.push(tool); }
  }
};
const calls = [];
const api = {
  getContext(){ return {status:'waiting_for_codex',question:'Lunch?'}; },
  respondInPage(x){ calls.push(['respond',x]); return {step:x.kind === 'answer' ? 'answer' : 'options'}; },
  getState(){ return {step:'options'}; },
  setMapping(x){ calls.push(['mapping',x]); return {ok:true}; },
  setDiceCount(x){ calls.push(['diceCount',x]); return {ok:true}; },
  async roll(){ calls.push(['roll']); return {winner:'A'}; },
  getHistory(){ return []; },
  getQuestionCards(){ return {cards:[]}; },
  saveQuestionCards(cards, options){ calls.push(['saveCards',cards,options]); return {savedCount:cards.length}; },
  useQuestionCard(id){ calls.push(['useCard',id]); return {step:'options'}; },
};
const result = await registerWebMCP(api);
assert.equal(result.supported, true);
assert.equal(result.complete, true);
assert.equal(result.expected, 9);
assert.equal(registered.length, 9);
assert.deepEqual(registered.map(t => t.name), [
  'maybe_respond_in_page',
  'maybe_get_pending_question',
  'maybe_get_state',
  'maybe_configure_dice',
  'maybe_roll',
  'maybe_get_history',
  'maybe_list_question_cards',
  'maybe_save_question_cards',
  'maybe_open_question_card',
]);
await registered.find(t => t.name === 'maybe_respond_in_page').execute({
  question:'What should I eat?', kind:'decision', message:'Pick a lunch lane.', options:['Noodles','Rice'],
});
assert.deepEqual(calls[0], ['respond',{
  question:'What should I eat?', kind:'decision', message:'Pick a lunch lane.', options:['Noodles','Rice'],
}]);
await registered.find(t => t.name === 'maybe_configure_dice').execute({count:5});
assert.deepEqual(calls[1], ['diceCount',5]);
const rolled = await registered.find(t => t.name === 'maybe_respond_in_page').execute({
  question:'Choose now', kind:'decision', options:['A','B'], autoRoll:true,
});
assert.deepEqual(calls[2], ['respond',{
  question:'Choose now', kind:'decision', message:'', options:['A','B'],
}]);
assert.deepEqual(calls[3], ['roll']);
assert.equal(rolled.rolled, true);
assert.equal(rolled.winner, 'A');
await registered.find(t => t.name === 'maybe_save_question_cards').execute({
  cards: [{question:'Demo?',options:['Rehearse','Ship']}],
  mode: 'append',
});
assert.deepEqual(calls[4], [
  'saveCards',
  [{question:'Demo?',options:['Rehearse','Ship']}],
  {mode:'append'},
]);
await registered.find(t => t.name === 'maybe_open_question_card').execute({id:'personal-demo-1'});
assert.deepEqual(calls[5], ['useCard','personal-demo-1']);
await assert.rejects(
  registered.find(t => t.name === 'maybe_respond_in_page').execute({
    question:'想杀人怎么办', kind:'decision', message:'No', options:['A','B'],
  }),
  /normal Codex safety workflow/,
);

const duplicateCheck = await registerWebMCP(api);
assert.equal(duplicateCheck.complete, true);
assert.equal(registered.length, 9, 'retrying on the same modelContext must not register duplicates');

const retried = [];
let failOnce = true;
document.modelContext = {
  async registerTool(tool) {
    if (tool.name === 'maybe_roll' && failOnce) {
      failOnce = false;
      throw new Error('modelContext is still warming up');
    }
    retried.push(tool);
  },
};
const partial = await registerWebMCP(api);
assert.equal(partial.complete, false);
assert.equal(partial.registered.length, 8);
assert.deepEqual(partial.failed.map(({ name }) => name), ['maybe_roll']);
const recovered = await registerWebMCP(api);
assert.equal(recovered.complete, true);
assert.equal(retried.length, 9, 'a retry must register only the previously missing tool');
console.log('PASS WebMCP registration and callback wiring');
