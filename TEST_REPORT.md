# Maybe v5 Test Report

## Scope

This revision adds the reusable question shelf: 18 lively built-in cards across office, daily, work, coding, humor, and creative themes; browser-local personalized card packs; JSON import/export; and three agent-facing Site Tools for listing, saving, and opening cards.

## Automated contracts

Command:

```bash
npm test
```

Result:

```text
PASS upstream-derived geometry, variable-dice physics, and product-layer isolation
PASS Maybe product shell, 1-5 dice control, and progressive UI structure
PASS mapping and 1-5 dice decision resolution
PASS lively built-in shelf and persistent custom question packs
PASS WebMCP registration and callback wiring
```

The checks cover:

- retained upstream geometry/face-detection contracts;
- complete 1–5 count controls and visible Maybe title;
- add/remove physics-body lifecycle and physical boundaries;
- single-die, majority, and multi-choice tie resolution;
- validation of 18 built-in cards, six theme filters, custom-card persistence, search, and export;
- registration and callback wiring for all 11 Site Tools;
- continued isolation of product/WebMCP code from Three.js and cannon-es.

## Codex built-in browser QA

Final validation used the visible Codex in-app browser at `http://127.0.0.1:8080/`. The page loaded with title `Maybe · Ask Codex, roll the dice`, rendered the Maybe product heading, initialized the real Three.js/cannon-es scene, and exposed Site Tools through the browser's WebMCP capability.

The in-app browser discovered all 11 tools, including:

- `maybe_get_pending_question`
- `maybe_present_followup`
- `maybe_present_options`
- `maybe_get_state`
- `maybe_set_face_mapping`
- `maybe_set_dice_count`
- `maybe_roll`
- `maybe_get_history`
- `maybe_list_question_cards`
- `maybe_save_question_cards`
- `maybe_open_question_card`

### Personalized shelf round trip

1. `maybe_save_question_cards` replaced the personal shelf with six playful Chinese cards spanning all six themes.
2. The visible page switched to the shelf and persisted every card in the in-app browser.
3. A live-browser test exposed and fixed a filter issue so **Mine** now means all user-created cards, regardless of their content category.
4. `maybe_list_question_cards({category: "personal"})` returned all six cards.
5. `maybe_open_question_card` loaded the coding card and its five editable answers into the visible decision flow.
6. `maybe_set_dice_count` selected three dice, and `maybe_roll` returned `[3, 1, 5]`.
7. The live result rendered `给边界加观测日志` and explained the deterministic first-die tie break.

### Real physics verification

`maybe_set_dice_count` was called in the live page for each supported count. Every run completed, re-enabled the count controls, and returned exactly the requested number of indexed faces:

- 1 die → `[2]`
- 2 dice → `[5, 3]`
- 3 dice → `[6, 3, 4]`
- 4 dice → `[3, 4, 4, 1]`
- 5 dice → `[4, 5, 2, 2, 1]`

Random face values will naturally differ on future runs; the invariant is that every selected physical die settles once and appears once in the ordered score.

### Full MCP round trip

1. The UI submitted `今晚适合做什么放松活动？`.
2. `maybe_get_pending_question` returned the pending question.
3. `maybe_present_options` wrote a Chinese explanation and three choices into the live page.
4. The page generated the balanced mapping `1–2 / 3–4 / 5–6`.
5. `maybe_roll` threw five visible physical dice and returned `[6, 3, 1, 3, 1]`.
6. The live page rendered `看一集轻松的剧` and correctly applied the deterministic first-die tie-break rule.

### Narrow-viewport position verification

The first visual pass showed one die reaching the left edge in the in-app browser's narrow viewport. The physical side/depth bounds and launch origin were tightened, then the page was reloaded and retested. The post-fix five-dice run returned `[6, 4, 1, 1, 3]`; all five rendered dice were fully visible, separated by cannon-es collisions, and no die was clipped at either side.

The final unit, structure, and headless browser suites all pass. The validated in-app browser tab is kept open as the user-facing deliverable with the six-card Chinese sample pack still stored locally.
