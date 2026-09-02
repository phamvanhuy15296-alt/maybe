from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
main = (ROOT / 'js' / 'main.js').read_text()
ui = (ROOT / 'js' / 'decision-ui.js').read_text()
webmcp = (ROOT / 'js' / 'webmcp.js').read_text()

# The renderer is a focused derivative of the credited upstream demo. Keep its
# original geometry pipeline while requiring the variable-dice safety layer.
for required in [
    'cdn.skypack.dev/cannon-es',
    "from 'three'",
    'createDiceMesh()',
    'createBoxGeometry()',
    'createInnerGeometry()',
    'physicsWorld.fixedStep()',
    'MIN_DICE = 1',
    'MAX_DICE = 5',
    'rebuildDice(',
    'createBounds()',
    'recordRollResult(',
    'getLaunchSlots(',
    'window.MaybeDice',
]:
    assert required in main, f'missing renderer contract: {required}'

assert 'physicsWorld.removeBody(die.body)' in main
assert "faces.join('+')" in main

for forbidden in [
    "from 'three'",
    'from "three"',
    "from 'cannon-es'",
    'from "cannon-es"',
    'WebGLRenderer(',
    'createDiceMesh(',
    'createBoxGeometry(',
]:
    assert forbidden not in ui, f'decision-ui.js must not touch dice engine: {forbidden}'

for forbidden in ["from 'three'", 'from "three"', "from 'cannon-es'", 'from "cannon-es"']:
    assert forbidden not in webmcp, f'webmcp.js must not import dice engine: {forbidden}'

print('PASS upstream-derived geometry, variable-dice physics, and product-layer isolation')
