# Maybe — A reusable decision shelf with Codex Site Tools

Maybe is a small Three.js / cannon-es decision experience built for human-agent play. Ask a one-off question or pick a reusable card, let Codex create editable choices, map the six faces, and let 1–5 visible physical dice vote.

The active renderer remains isolated in `js/main.js`; the decision product layer in `js/decision-ui.js` never imports Three.js or cannon-es. The renderer is a focused derivative of `uuuulala/Threejs-rolling-dice-tutorial`, with its original geometry and pip construction retained and the multi-dice behavior added on top.

## Dice count and physics

The home screen has a direct 1–5 dice selector. The selected count is saved in `localStorage` under `maybe_dice_count_v1` and applies to normal rolls, decision rolls, double-click rolls, and Site Tool rolls.

Multi-dice safety details:

- dice are added to and removed from both the Three.js scene and cannon-es world;
- count-specific launch formations keep every body separated at spawn;
- cannon-es body shapes handle die-to-die collisions;
- invisible side boundaries keep larger throws in the useful camera area;
- dice that settle on an edge receive a small physical nudge instead of hanging the result;
- scores are collected by physical die index, so collision/settling order does not reorder the vote;
- the score is emitted only after all selected dice settle.

## UX

The first screen has two primary actions:

1. **Throw the dice** — use the selected 1–5 dice as a normal roller.
2. **Ask a question** — start the Codex-assisted decision game.

It also includes **Open in Codex** for visitors arriving from Chrome, Edge, or another browser. The button uses OpenAI's web handoff URL with the canonical deployment encoded as its destination: `https://chatgpt.com/codex/deeplink?url=https%3A%2F%2Fwebmcp.qinqinghua.tech%2Fmaybe`. This keeps local previews and shared copies pointing back to the public WebMCP experience.

The question path stays progressive:

1. Enter one question.
2. Wait for Codex Site Tools, or choose “I'll add my own”.
3. Codex may ask one clarification.
4. Codex writes a short answer plus 2–6 choices into the page.
5. Edit, add, or remove choices.
6. Review the balanced six-face mapping and customize it if needed.
7. Throw the selected number of physical dice.
8. Every die votes through the mapping; the highest vote count wins.
9. If choices tie, the first physical die voting for a tied choice breaks the tie.
10. The decision and complete face list are saved locally.

## Question shelf

The home screen also opens a reusable question shelf with 18 built-in cards across six themes:

- office — rescue meetings, pick a note-taker, invent team rituals;
- daily — choose dinner, reclaim 20 minutes, take a micro-adventure;
- work — prioritize attention, unstick projects, subtract low-value work;
- coding — investigate bugs, target refactors, celebrate green builds;
- humor — explain chaos, title a deadline, stage harmless rebellions;
- creative — choose constraints, opening scenes, and prototype moods.

Every card includes a vivid setup and 2–6 editable answers. Personal cards are stored in `localStorage`, searchable alongside built-ins, removable from the page, and portable as a small JSON question pack.

Any generated or human-edited decision can be saved back to the personal shelf with **Save to Question Shelf**. Re-saving the same question updates its reusable card instead of creating duplicates.

The shelf is agent-native: ask Codex to create recurring questions that match your routines, and it can write the complete pack into the live page with `maybe_save_question_cards`. It can then find and load a saved card with `maybe_list_question_cards` and `maybe_open_question_card`. The human still reviews and edits the answers before deciding whether to roll.

For two choices the default face mapping is `1 / 3 / 5 → A` and `2 / 4 / 6 → B`. For three choices it is `1–2 / 3–4 / 5–6`; for 4–6 choices the faces are distributed round-robin.

## Codex / WebMCP interaction

The page registers 9 focused Site Tools through `document.modelContext.registerTool`:

- `maybe_respond_in_page` — the default fast route; it can answer, create choices, set the dice count, and optionally roll immediately
- `maybe_get_pending_question`
- `maybe_get_state`
- `maybe_configure_dice`
- `maybe_roll`
- `maybe_get_history`
- `maybe_list_question_cards`
- `maybe_save_question_cards`
- `maybe_open_question_card`

Typical built-in browser demo:

1. Open Maybe in the Codex/ChatGPT built-in browser.
2. Ask a lightweight everyday question in the Codex composer. Codex calls `maybe_respond_in_page` directly without researching routine prompts.
3. It can show a concise answer, create 2–6 editable choices, or set `autoRoll` to return the settled result in the same call.
4. Alternatively, enter a question in the page. Codex reads it with `maybe_get_pending_question`, then immediately answers through `maybe_respond_in_page`.
5. `maybe_configure_dice` handles custom dice counts or odds; `maybe_roll` rolls an already prepared decision.

`maybe_respond_in_page` is intentionally concise and defaults routine questions to a direct call. Its metadata excludes safety-critical, high-stakes, current-fact, code-changing, and external-action requests from the shortcut.

The page registers the UI/WebMCP module before the remote Three.js renderer, retries when the browser injects `document.modelContext` late, and registers only tools that are still missing after a partial failure. Runtime discovery is inspectable through `window.MaybeWebMCPStatus` and the `data-webmcp` attribute on `<html>` (`waiting`, `partial`, `ready`, or `unavailable`). Versioned module URLs prevent a previously cached registration script from masking a new deployment.

For the strongest automatic routing, `maybe_respond_in_page` explicitly identifies itself as the first action for ordinary non-coding questions and asks Codex to write into Maybe before answering in chat. Questions and choices should use the user's language, remain mutually exclusive, and carry a light humorous spark rather than sounding like a form.

Site Tools still depend on the host. Use the latest ChatGPT desktop app, enable **Browser → Permissions → Site tools**, keep Maybe as the active top-level page, and select GPT-5.6 Sol or Terra. GPT-5.6 Luna currently has WebMCP disabled. See the [official Site Tools documentation](https://developers.openai.com/codex/webmcp).

Site Tools expose page actions to the agent. A normal webpage does not autonomously start a new Codex turn; the round trip remains agent-driven in the built-in browser. Clear tool names and narrow descriptions make the intended automatic route discoverable, but the Codex host still makes the final tool-selection decision.

## Persistence

Question state, options, mapping, clarification context, and up to 100 history entries are stored in `localStorage` with a compact SameSite=Lax cookie mirror. Dice count uses its own small `localStorage` setting.

## Run and test

Serve the directory over HTTP:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Run all deterministic tests:

```bash
npm test
npm run test:browser
```

The browser QA uses a deterministic public-engine mock so it can verify the complete shelf flow, all 1–5 score contracts, responsive layout, persistence, and all Site Tool callbacks without replacing the production renderer. Screenshots are written to a temporary directory and removed after the run.

## Files

- `index.html` — Maybe product shell and progressive steps
- `css/base.css` — responsive visual system and dice-count control
- `js/main.js` — Three.js/cannon-es renderer, dynamic dice lifecycle, collisions, and score events
- `js/decision-ui.js` — progressive UI, multi-dice vote handling, and public page API
- `js/mapping.js` — six-face mapping and 1–5 dice vote resolution
- `js/storage.js` — localStorage and cookie persistence
- `js/question-library.js` — built-in cards, validation, personal-card persistence, and JSON export
- `js/webmcp.js` — Site Tool registration only
- `tests/` — structure, mapping, MCP, and browser-flow QA

## License

The upstream Codrops project is MIT licensed. See `LICENSE`, `UPSTREAM.md`, and `THIRD_PARTY_NOTICES.md`.
