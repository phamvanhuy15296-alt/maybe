from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text()
css = (ROOT / 'css' / 'base.css').read_text()

# Initial screen keeps exactly two primary actions plus a separate dice setting.
home = re.search(r'<section class="game-step" data-step="home">(.*?)</section>', html, re.S).group(1)
actions = re.search(r'<div class="home-actions">(.*?)</div>', home, re.S).group(1)
buttons = re.findall(r'<button[^>]*>(.*?)</button>', actions, re.S)
plain = [re.sub('<.*?>', '', b).strip() for b in buttons]
assert plain == ['Roll the dice', 'Ask a question'], plain

assert '<h1>Maybe</h1>' in html
assert 'rel="icon" type="image/svg+xml" href="./favicon.svg"' in html
assert '🎲' in (ROOT / 'favicon.svg').read_text()
assert '<title>Maybe · Ask Codex, roll the dice</title>' in html
assert 'double tap to throw the dice' in html.lower()
assert 'dice out of view? pan or zoom to find them.' in html.lower()
assert '[data-maybe-step="result"] .help-list' in css
assert '[data-maybe-step="answer"] .help-list' in css
counts = re.findall(r'data-dice-count="([1-5])"', home)
assert counts == ['1', '2', '3', '4', '5'], counts
assert '<canvas id="canvas"></canvas>' in html
assert '<span id="score-result"></span>' in html
assert 'id="roll-btn"' in html
assert './js/main.js' in html and './js/decision-ui.js' in html
assert html.index('./js/decision-ui.js') < html.index('./js/main.js'), 'WebMCP/UI must register before remote dice dependencies load'
assert 'data-step="question"' in html
assert 'data-step="waiting"' in html
assert 'data-step="followup"' in html
assert 'data-step="options"' in html
assert 'data-step="ready"' in html
assert 'data-step="odds"' in html
assert 'data-step="rolling"' in html
assert 'data-step="result"' in html
assert 'data-step="library"' in html
assert 'id="question-card-list"' in html
assert 'Pick a question' in html
assert 'codex.openSub' not in html and 'shelf.openSub' not in html
assert '--color-bg: #ddd' in css
assert '--color-accent: #273e9a' in css
assert '.product-brand' in css and '.dice-count-options' in css and '.question-card-list' in css

# Production Site Tools bootstrap must run before the heavier decision UI and keep polling.
assert './js/webmcp-bootstrap.js?v=20260903-playful' in html
assert html.index('./js/webmcp-bootstrap.js?v=20260903-playful') < html.index('./js/decision-ui.js?v=20260903-playful')
bootstrap = (ROOT / 'js' / 'webmcp-bootstrap.js').read_text()
assert 'WATCH_INTERVAL_MS = 2500' in bootstrap
assert "context !== readyContext" in bootstrap
assert 'window.MaybeWebMCPDiagnostics = collectDiagnostics' in bootstrap
assert '/.webmcp/bridge.js' in bootstrap
assert 'maybe:webmcp-status' in bootstrap

print('PASS Maybe product shell, early persistent WebMCP bootstrap, question shelf, 1-5 dice control, and progressive UI structure')
