# 🎲 Maybe

## Can’t pick? Give it a roll.

**纠结一下？不如掷一下。**

Dinner has four finalists. Your weekend has no plot. That bug has several suspects.
Maybe turns little everyday dilemmas into a game: ask a question, tweak a few choices, and let visible 3D dice make this round’s pick.

No destiny. No “optimal life strategy.” Just a small surprise you can actually use.

[Play Maybe](https://webmcp.qinqinghua.tech/maybe/) · [Open in Codex](https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fwebmcp.qinqinghua.tech%2Fmaybe%2F) · [GitHub Pages mirror](https://phamvanhuy15296-alt.github.io/maybe/)

## One-minute instruction manual

1. **Ask a question.** “What should I eat tonight?” is plenty. Your dinner does not need a thesis.
2. **Pick the possibilities.** Write 2–6 choices yourself, or ask Codex to put them into the page. Everything stays editable.
3. **Roll the dice.** Choose 1–5 dice, inspect the face mapping, and roll.
4. **Meet this round’s pick.** See the original question, result, individual faces and votes. Roll again if you like.
5. **Keep the good questions.** Save a decision to the Question Shelf and come back tomorrow.

The ordinary browser game works without an AI account or API key. Agent-assisted actions require a compatible Site Tools host.

## A shelf for your recurring “hmm…”

18 built-in cards cover office, daily life, work, coding, humor and creativity. The interface and built-ins speak English, 中文, français, 日本語, 한국어, español and Deutsch. English is the default; Maybe stays Maybe.

Try dinner with noodles, curry, dumplings, or breakfast making a guest appearance at dinner. Give a spare 20 minutes to a walk, a joyfully wonky drawing, a book, or a carefully made drink. Investigate a bug with a minimal reproduction, recent changes, focused logs, or a rubber-duck explanation.

Want a shelf that sounds like you? Open Maybe in the built-in browser and ask:

> Create 8 reusable decision cards for my coding breaks, quick dinners and weekend plans. Mix practical choices with small surprises. Give each 2–6 distinct, affordable answers, and append them to my Maybe shelf without replacing existing cards.

Codex can create, save, find and reopen cards. You can edit them, search the shelf, or import/export a JSON pack. Personal cards remain in their original language. Your routines, not a generic productivity template.

## WebMCP: the conversation becomes playable

Maybe is not a chatbot pasted above a canvas. Its nine Site Tools call the same state and actions as the buttons you use. An agent can prepare choices, configure a roll, wait for the physical result, and save reusable cards directly in the live page.

```text
Your question → host discovers Maybe’s Site Tools → shared page state
                                                     ↓
                              editable choices → physical dice → result + history
                                      ↓
                              reusable question cards
```

This is **page-local WebMCP**, not a remote MCP server. JavaScript registers tools through `document.modelContext.registerTool` in the top-level page. There is no Maybe-hosted LLM backend and no API key to paste into the website.

### Nine tools, no scavenger hunt

Exact schemas live in [js/webmcp.js](js/webmcp.js).

| Tool | Input / purpose | Result |
| --- | --- | --- |
| `maybe_respond_in_page` | Original question; decision/answer; message/choices; optional diceCount and autoRoll | Updated page or settled roll result |
| `maybe_get_pending_question` | Read the question entered in the page | Question, language and clarification context |
| `maybe_get_state` | Inspect the current game | Choices, mapping, dice count, score and UI step |
| `maybe_configure_dice` | Count 1–5 and/or six zero-based choice indices | Updated dice settings |
| `maybe_roll` | Roll an already prepared decision | Settled faces, votes and winning choice |
| `maybe_get_history` | Optional limit, up to 30 per call | Previous questions and outcomes |
| `maybe_list_question_cards` | Optional category, source and search query | Matching cards |
| `maybe_save_question_cards` | 1–20 cards; append by default, replace only explicitly | Saved personal-card state |
| `maybe_open_question_card` | Card ID | Card loaded into the editable flow |

A routine “choose dinner for me” request can prepare choices **and** roll in one invocation. Example arguments to `maybe_respond_in_page` (not an HTTP endpoint):

```json
{
  "question": "What should I eat tonight?",
  "kind": "decision",
  "message": "Four dinner plans. One hungry audience.",
  "options": ["A warm bowl of noodles", "Curry and rice", "Dumplings", "Breakfast for dinner"],
  "diceCount": 1,
  "autoRoll": true
}
```

The tool waits for the roll to settle; the agent does not invent the result. For review first, omit autoRoll, then call `maybe_roll` when asked. Self-contained answers can use `kind: "answer"` without manufacturing a choice game.

### Under the table: implementation

- [webmcp-bootstrap.js](js/webmcp-bootstrap.js) loads before the renderer. A deferred API lets registration start while the UI initializes. A visible-page watchdog checks every 2.5 seconds and recovers when the host replaces its model context.
- [webmcp.js](js/webmcp.js) owns schemas, annotations and handlers. Per-context registration tracking avoids duplicates and retries missing tools after partial failures.
- [decision-ui.js](js/decision-ui.js) owns the progressive flow and shared API. Human edits and agent calls converge here; it does not import Three.js or cannon-es.
- [main.js](js/main.js) owns Three.js rendering and cannon-es physics. Dice collide, settle and report faces in physical die order.
- [mapping.js](js/mapping.js) turns faces into votes. [question-library.js](js/question-library.js), [i18n.js](js/i18n.js) and [storage.js](js/storage.js) handle cards, language and persistence.

Tool guidance encourages concrete, gently funny choices, preserves the original question, and avoids unnecessary research for self-contained prompts. It **cannot force** the host to call a tool, grant permissions, or bypass safety checks.

### The small print on chance

Two choices alternate across six faces; three choices get two faces each. Four to six choices use round-robin mapping. **Four and five choices are not equally likely** with six faces: inspect or edit the mapping. Each die votes once; ties go to the first physical die voting for a tied choice.

This is a physics game, not certified randomness or an objectively best answer. Keep medical, legal, financial, safety-critical and urgent personal matters out of the game. Prompt guidance and a limited high-risk phrase filter are not comprehensive safety detection.

## Reviewer quick start

1. Open the [canonical site](https://webmcp.qinqinghua.tech/maybe/) in a supported built-in browser.
2. Inspect **Site tools → Available site tools** and confirm nine Maybe tools.
3. Ask: “Give me four fun, practical ways to spend a 20-minute break. Put them in Maybe and roll once.” Check the invocation, visible choices and settled result.
4. Ask to save the question, list saved cards and reopen it. Edit an option yourself: human and agent should see the same state.
5. Switch languages, inspect history, and try the manual flow in an ordinary browser.

The [official OpenAI Site Tools documentation](https://learn.chatgpt.com/docs/webmcp) explains current app/model/workspace availability, browser permissions and security review. Tools belong to the open page; navigating away can make them unavailable. Use a supported model and enable Site tools in browser permissions.

If discovery fails, use `?webmcp-debug=1` and inspect `window.MaybeWebMCPStatus`, `await window.MaybeWebMCPDiagnostics()`, or `window.MaybeRetryWebMCP()`. See [troubleshooting](WEBMCP_TROUBLESHOOTING.md). **HTTP 200 and successful page registration do not prove the host exposed or invoked a tool.**

This manual supplies a reproducible demo, implementation and tests for reviewers. Competition-specific eligibility, submission assets and deadlines still need checking against the actual challenge rules; this repository does not claim official endorsement or completed submission.

## Run a round locally

No build step. Serve with Python 3:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/`. This previews the manual game; it does not guarantee Site Tools discovery. For integration, use the canonical deployment or a server configured with the headers in the troubleshooting guide, not `file://`. Rendering loads external Three.js, cannon-es and module-shim dependencies, so internet access is needed.

With Node.js and Python 3:

```bash
npm test
npm run test:browser
```

Browser tests need Playwright and Chrome/Edge; the runner also recognizes the bundled Codex runtime. If Playwright is missing: `npm install --no-save --package-lock=false playwright`.

Tests cover mapping, cards, seven-language key/option consistency, all nine tools, registration recovery, and home/three-step/result/history/shelf flows across narrow, landscape and desktop layouts. Browser regression tests use a **deterministic dice-engine and modelContext mock**: they verify app behavior, not native host discovery or physics randomness. Set `MAYBE_QA_KEEP_ARTIFACTS=1` to retain screenshots.

## Where it lives, and what it remembers

[GitHub Pages Actions](.github/workflows/pages.yml) publishes the repository. [cloudflare/worker.js](cloudflare/worker.js) proxies it at the custom domain’s /maybe/ path, attaching deployment headers and bypassing caching for HTML and critical registration/UI modules. This is **GitHub Pages plus a Cloudflare Worker**, not a separate Cloudflare Pages app. Open in Codex uses the canonical HTTPS URL.

Choices and up to 100 history entries live in localStorage with a compact cookie mirror. Personal cards and dice preferences are local too. There is no cloud-sync account; clearing browser data can lose your shelf. Export a JSON pack if it matters. Different origins have separate storage, so the mirror and custom domain do not automatically share cards. Cookie mirrors may accompany same-origin requests; browser storage is not a secret vault. Agent interactions remain subject to the host’s privacy policies.

## The next little surprise

The vision: a tiny game worth reopening. Less time circling harmless decisions, more room to try something. WebMCP makes the page a shared, editable place to play—not a destination for text copied out of a chat.

Future directions, **not shipped promises**: themed community card packs, clearer probability previews and more accessible ways to play. Keep the core small: useful choices, visible outcomes, personal favorites. No streak to protect. No leaderboard for eating lunch correctly.

## Credits

The renderer derives from [uuuulala/Threejs-rolling-dice-tutorial](https://github.com/uuuulala/Threejs-rolling-dice-tutorial). Maybe adds the decision flow, multi-dice voting, shelf, localization and WebMCP integration while retaining upstream geometry/pip construction. See [LICENSE](LICENSE), [UPSTREAM.md](UPSTREAM.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
