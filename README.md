# BGA Terraforming Mars Advisor

A Chrome extension (Manifest V3) that overlays **tier and score badges** on cards
during Terraforming Mars games on [BoardGameArena](https://boardgamearena.com),
with context-aware scoring: base expert ratings adjusted for game timing, your
tag engine, affordability (using BGA's own discounted costs), requirements, and
played-card synergies. Hover a badge for the full score breakdown.

Works on live games **and replays**, in every decision phase: corporation
select, research draft, card buying, and the action phase (hand cards).

> Personal fan project. Not affiliated with FryxGames, Stronghold Games, or
> Board Game Arena. If you use assistance tools in rated games, check BGA's
> terms and your own conscience first.

## Install / update

```
npm install
npm run build
```

Then `chrome://extensions` → enable Developer mode → **Load unpacked** → pick
the `dist/` folder. After every rebuild, click **↻ Reload** on the extension
card (Chrome snapshots unpacked extensions; disk changes don't apply until
reload). Requires Chrome 111+.

The popup (toolbar icon) has switches: enable, badges, tooltips, dim-low-tier,
and a minimum-tier filter.

## Architecture (the 30-second tour)

```
src/
  content/
    page-bridge.ts      MAIN-world script: reads window.gameui (invisible to
                        normal content scripts) and publishes a snapshot to a
                        DOM attribute every 800ms
    bridge-reader.ts    isolated-world parser for that snapshot
    main.ts             scan → resolve → score → render loop (MutationObserver
                        + data-state attribute watching)
    dom-scanner.ts      finds card elements, maps BGA element ids → internal ids
    game-state.ts       trackers, player color, phase detection, tableau scrape
    overlay-renderer.ts badges (in-place updates, instance-tagged), tooltips
  scoring/              context scorer: timing, tag synergy, affordability,
                        requirements, played-card synergy modifiers
  data/                 cards-generated.ts (built from the JSON sources below)
```

Everything DOM-related is **verified against the live game and the official
BGA implementation source** — see [docs/BGA-DOM-REFERENCE.md](docs/BGA-DOM-REFERENCE.md)
for the complete reference (element ids, trackers, phase signals via
`body[data-maop]`, the two-worlds problem, corp numbering) and the no-reload
dev-injection test workflow.

## Data pipeline

```
all_cards.json (696 cards)  +  evaluations.json (854 expert ratings)
        └────────────── node scripts/build-cards.mjs ──────────────┘
                                    ↓
                      src/data/cards-generated.ts
```

`evaluations.json` carries per-card: `score` (0-100), `tier` (derived),
`synergies`, `when_to_pick`/`reasoning` commentary, explicit `timing_bias`
(-15 early … +15 endgame) and `tag_synergy_weights` (value the card receives
from your existing tags), plus `adjustment` provenance notes on every score
that was changed during verification.

### Ratings verification

The ratings were validated against expert consensus (Spearman 0.946 vs the
maintained upstream tier list) and against empirical win rates from ~209k
real BGA games (0.69 at the option-to-keep level), with a 12-card adversarial
review of the disagreements. Process, results, and rerunnable tooling:
[docs/RATINGS-VERIFICATION-PLAN.md](docs/RATINGS-VERIFICATION-PLAN.md) and
`scripts/audit-ratings.mjs` / `verify-ratings.mjs` / `apply-verdicts.mjs` /
`merge-channels.mjs`.

## Dev commands

| Command | What |
|---|---|
| `npm run build` | bundle to `dist/` (esbuild) |
| `npm run watch` | rebuild on change |
| `node scripts/build-cards.mjs` | regenerate card DB from the JSON sources |
| `node scripts/audit-ratings.mjs` | internal consistency audit (read-only) |
| `node scripts/build-slim-test.mjs` | dev-injection bundle for testing on a BGA replay without reloading the extension (workflow in docs/BGA-DOM-REFERENCE.md) |

## Acknowledgements — work this project builds on

- **[elaskavaia/bga-mars](https://github.com/elaskavaia/bga-mars)** — Alena
  Laskavaia's official BGA Terraforming Mars implementation, whose public
  source made the DOM/state reference possible (element ids, trackers,
  `data-maop` operation signals, card data attributes).
- **[rusliksu/tm-advisor](https://github.com/rusliksu/tm-advisor)** and its
  successor **[tm-tierlist](https://github.com/rusliksu/tm-tierlist)**
  ([live site](https://tm.knightbyte.win/tierlist/)) — origin of the card
  database and expert evaluations this advisor is built on, themselves
  synthesized from community expertise and stats.
- **[tfmstats.com](https://www.tfmstats.com/)** / **[HStrand/bga-tm-scraper](https://github.com/HStrand/bga-tm-scraper)**
  — StrandedKnight's crowdsourced statistics from 200k+ BGA games, used as
  the empirical ground truth for ratings verification (public API).
- **r/TerraformingMarsGame "Card of the Day"** — the daily discussion series
  run by u/Enson_Chan since 2020, and its expert commenters; the qualitative
  backbone of the ratings and of the adversarial review verdicts.
- **[Erik Twice](https://eriktwice.com/)** — strategy articles
  ([best cards](https://eriktwice.com/en/2019/01/26/terraforming-mars-best-cards-game-2/),
  [overrated cards](https://eriktwice.com/en/2020/10/23/terraforming-mars-six-commonly-overrated-cards/))
  cited in several review verdicts.
- **[RuneDK93/terraforming-mars-dataset](https://github.com/RuneDK93/terraforming-mars-dataset)**
  — elite-play BGA datasets, referenced as a high-skill cross-check.
- **Terraforming Mars** is a game by Jacob Fryxelius, published by FryxGames;
  the online adaptation lives on **Board Game Arena**. All card names and
  game terms belong to their respective owners.

Third-party datasets downloaded during verification (tfmstats API responses,
tm-tierlist wiki data) are intentionally **not committed** — see
`.gitignore`; refetch with the URLs in docs/RATINGS-VERIFICATION-PLAN.md.
