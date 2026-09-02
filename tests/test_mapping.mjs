import assert from 'node:assert/strict';
import {
  sanitizeOptions,
  createBalancedMapping,
  normalizeMapping,
  mappingGroups,
  resolveFaces,
} from '../js/mapping.js';

assert.deepEqual(createBalancedMapping(['A','B']), [0,1,0,1,0,1]);
assert.deepEqual(createBalancedMapping(['A','B','C']), [0,0,1,1,2,2]);
assert.deepEqual(createBalancedMapping(['A','B','C','D']), [0,1,2,3,0,1]);
assert.deepEqual(sanitizeOptions([' A ', 'A', 'B', '', 'C']), ['A','B','C']);
assert.deepEqual(normalizeMapping([0,9,0,1,0,1], 2), [0,1,0,1,0,1]);
assert.deepEqual(mappingGroups(['A','B'], [0,1,0,1,0,1]), [
  {optionIndex:0,label:'A',faces:[1,3,5]},
  {optionIndex:1,label:'B',faces:[2,4,6]},
]);
const same = resolveFaces([1,3], ['A','B'], [0,1,0,1,0,1]);
assert.equal(same.winner, 'A');
assert.equal(same.tieBroken, false);
const split = resolveFaces([2,3], ['A','B'], [0,1,0,1,0,1]);
assert.equal(split.winner, 'B');
assert.equal(split.tieBroken, true);
const fiveDice = resolveFaces([1,2,3,5,4], ['A','B'], [0,1,0,1,0,1]);
assert.equal(fiveDice.winner, 'A');
assert.deepEqual(fiveDice.counts, [3,2]);
assert.equal(fiveDice.tieBroken, false);
const threeWayTie = resolveFaces([1,3,5], ['A','B','C'], [0,0,1,1,2,2]);
assert.equal(threeWayTie.winner, 'A');
assert.equal(threeWayTie.tieBroken, true);
const singleDie = resolveFaces([6], ['A','B'], [0,1,0,1,0,1]);
assert.equal(singleDie.winner, 'B');
assert.equal(singleDie.tieBroken, false);
console.log('PASS mapping and 1-5 dice decision resolution');
