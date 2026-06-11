# BGA Terraforming Mars — verified DOM & integration reference

Everything in this document was verified on 2026-06-10 against a **live game**
(table 866119536), its **archive replay**, and the **official game source**
(https://github.com/elaskavaia/bga-mars — the BGA implementation is public:
PHP + TypeScript + the HTML template + material CSVs). Where a fact comes only
from the source repo it is marked [src].

Raw live captures: `scripts/bga-live-capture.json`.

## The two worlds problem (why page-bridge exists)

Content scripts run in Chrome's **isolated world** and can NEVER read page JS
globals — `window.gameui` is invisible there. Anything that needs gamedatas
goes through `src/content/page-bridge.ts`, declared in the manifest with
`"world": "MAIN"` (Chrome 111+). It serializes a compact snapshot to the
`data-tm-advisor-bridge` attribute on `<html>` every 800 ms; the isolated
script (`bridge-reader.ts`) parses it synchronously. The extension must keep
working with the bridge absent (replays load late, races, etc.) — every bridge
consumer has a DOM fallback.

## Card elements

| Element id | Meaning | Internal id |
|---|---|---|
| `card_main_159` | project card, official number, **no zero-padding** | `159` |
| `card_main_P36`…`P42` | Prelude-box PROJECT cards | `2036+` |
| `card_main_C01`…`C49` | Colonies project cards | `3001+` |
| `card_prelude_P01`…`P35` | prelude cards | `2001+` |
| `card_corp_1`…`28` | corporations, **BGA's own numbering** | `1000+N` |
| `card_stanproj_1`…`7` | standard projects — ignore | — |
| `card_colo_N` | colony TILES (Europa…) — ignore (id would collide with C##) | — |
| `*_help` | reference copies in hidden `#allcards` — ignore | — |
| `*_tt` | tooltip clones [src] — ignore | — |

Classes: `card main eBasic|eCorporate withtooltip`, corps `card corp`,
preludes `card prelude`. Cards are ~123×172 px, `position:relative`,
`overflow:visible` — safe to append absolutely-positioned badges.

Useful data attributes on card elements [src + verified live]:
`data-cost`, `data-discount_cost` (BGA's own discounted cost),
`data-invalid_prereq` ("0"/"1" — requirement check **for playing right now**),
`data-cannot_pay`, `data-cannot_resolve`, `data-state` (0 facedown, 2 action
unused, 3 action used).

### Corporation numbering (≠ tm-advisor R-numbers!)

BGA: 1 Beginner Corp, 2 CrediCor, 3 Ecoline, 4 Helion, 5 Interplanetary
Cinematics, 6 Inventrix, 7 Mining Guild, 8 Saturn Systems, 9 PhoboLog,
10 Teractor, 11 Tharsis Republic, 12 ThorGate, 13 UNMI, 19–23 Prelude
(Point Luna, Robinson Industries, Cheung Shing Mars, Valley Trust, Vitor),
24–28 Colonies (Aridor, Arklight, Polyphemos, Poseidon, Stormcraft).
14–18 are Venus corps, **commented out in the game source — not on BGA**.
Turmoil / promos / Underworld do not exist on BGA at all.

tm-advisor's `R##` ids are unrelated (CrediCor R08, Ecoline R17, Saturn
Systems R03…). `scripts/build-cards.mjs` therefore maps corps **by name** to
the BGA numbers above; unmapped corps get provisional ids ≥1800 and resolve
by name via the bridge.

### Name spelling differences (BGA ↔ all_cards.json)

Handled by `NAME_ALIASES` in `src/data/cards.ts`:
CEO's Favourite Project↔Favorite, Biolabs↔Biolab, Excentric↔Eccentric
Sponsor, Beginner Corp↔Beginner Corporation, Stormcraft↔Stormcraft
Incorporated.

## Player zones

```html
<div id="hand_area">
  <div id="hand_{color}">  …   <!-- my hand -->
  <div id="draw_{color}">  …   <!-- offered to buy / drafted-so-far / setup deal -->
  <div id="draft_{color}"> …   <!-- offered to draft -->
  <div id="hand_area_buttons">
</div>
```

`{color}` = player color hex without '#' (ff0000, ffa500, 008000, 0000ff,
773300; ffffff solo). **These containers exist ONLY for the viewing player** —
that's the no-bridge fallback for "my color". Played cards live in
`#tableau_{color}` (corp + projects; outside hand_area). Discard:
`#discard_main` under `#decks_area`.

During **corporation select** (game setup) corps + preludes + 10 project
cards are all dealt into `draw_{color}`.

## Trackers (value in `data-state`, text content is EMPTY — CSS ::after)

- Global: `tracker_gen`, `tracker_o` (oxygen), `tracker_t` (temperature),
  `tracker_w` (oceans placed). Venus is not on BGA; `tracker_v` is this
  repo's best guess for when it ships.
- Per player (`_{color}` suffix): `tracker_m/pm` MC/prod, `s/ps` steel,
  `u/pu` titanium, `p/pp` plants, `e/pe` energy, `h/ph` heat, `tr`,
  `tracker_city`, `tracker_forest`, `tracker_land`, `tracker_ers/eru`
  (steel/ti exchange rate), and tag counters
  `tracker_tag{Building,Space,Science,Energy,Earth,Jovian,City,Plant,Microbe,Animal,Wild,Event}`.
- Every tracker has an `alt_`-prefixed twin kept in sync [src] — we read the
  main ones.
- Exception: `counter_hand_{color}` / `counter_draw_{color}` hold their value
  as text, not data-state [src].

## Phase detection

The BGA TM state machine is **generic** — gamestate names are only:
`gameSetup, multiplayerDispatch, multiplayerChoice, gameDispatch,
playerTurnChoice, playerConfirm, gameEnd`. Never match phases on them.

Real signals (both isolated-world safe):
1. `document.body.dataset.maop` — current main operation type, set by the
   game client [src + verified live]: `setuppick` (corp select), `draft`,
   `passdraft`, `buycard`, `keep`, `research`, `prediscard`, `prelude`,
   `card`, `activate`, `turn`, `stan`, `pass`, `claim`, `fund`, `trade`,
   `tile`, `city`, `forest`, … or `complex` for compound ops.
2. Container contents fallback: corp cards visible in `#hand_area` →
   corporation select; cards in `draft_{me}` → draft; in `draw_{me}` → buy;
   in `hand_{me}` → action.

## Page-world data goldmine (`gameui.gamedatas`, MAIN world only)

- `token_types[elementId]` → `{name, cost, tags: "Earth Event", vp, text,
  deck}` for EVERY card — the name source for the bridge.
- `card_info[elementId]` → `{discount_cost, payop, c, q}` for playable cards.
- `players[playerId].color`, `gameui.player_id`, `gamestate.name/type`.
- Replays (`/archive/replay/...`) have gameui + gamedatas too; URL does NOT
  contain "terraformingmars", so page detection also accepts the
  `#hand_area` element and the document title.

## Known limitations / future work

- Card `requirements` are not structured in `all_cards.json` (free text), so
  the local requirement-distance penalty never fires outside the Action
  phase (where BGA's `data-invalid_prereq` is authoritative). Expert base
  scores partially price requirements in.
- `evaluations.json` has ~158 entries for CEO/fan cards not on BGA — skipped
  by the generator, harmless.
- Venus corp numbers (14–18) and `tracker_v` are educated guesses; verify
  the day BGA ships Venus.

## Dev verification workflow (no extension reload needed)

`node scripts/build-slim-test.mjs` builds `dist-dev/dev-inject-slim.js[.b64]`
— CSS + page-bridge + content script (with a 16-card test DB) wrapped in
IIFEs for single-scope injection. Open a BGA TM **replay** (corp-select at
move #1 is ideal), copy the .b64 to clipboard (`Set-Clipboard`), paste into a
textarea on the page, length+checksum-check, `eval(atob(...))`. BGA's CSP
blocks remote fetch/script-src but allows inline eval. An installed copy of
the extension will already have badged the page — the instance-token logic
replaces foreign badges automatically.
