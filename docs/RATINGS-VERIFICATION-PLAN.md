# Card ratings verification plan

Goal: establish whether the 853 evaluations in `evaluations.json` (score 0-100
per card, used as `baseScore` by the advisor) are *correct*, and fix what
isn't. "Correct" operationally: the **ordering** the scores induce matches
(a) expert consensus and (b) empirical outcomes at the decisions the plugin
serves — corp pick, draft pick, research buy, play-next. Exact numbers matter
much less than ranks and tier boundaries.

Run `node scripts/audit-ratings.mjs` any time — read-only consistency audit.

## Audit findings (2026-06-10 baseline)

| # | Finding | Impact |
|---|---|---|
| 1 | **499/853 evaluations have tier ≠ score band** (source tiers use stricter cutoffs, e.g. Helion score 75 = tier B, while the extension bands 75 as A). The extension recomputes tiers from scores, so display is consistent — but the stored tiers are noise. | Decide one banding; regenerate tiers from scores at build time. |
| 2 | Coverage is excellent: only `Beginner Corporation` (R00) lacks an evaluation among the 371 BGA-reachable cards. | Add one trivial eval. |
| 3 | **202/2813 synergy references (7.2%) never resolve** to a card, so they never fire at runtime: colony tiles ("Titan colony" ×20), CEOs ("Gordon"), concepts ("Steel production"), spelling variants ("Nitrogen Rich Asteroid" vs "Nitrogen-Rich", "Standard Technologies" vs "Standard Technology", "UNMI" vs full name, "Cartels" vs "Cartel"). | Fix aliases/spellings (~30 refs); decide policy for concept refs (drop or convert); hyphen-aware normalization. |
| 4 | Score scales are comparable across card types (means 61-66 for corps / preludes / projects) — no cross-type recalibration needed. | None. |
| 5 | **timingBias is 0 for ~79% of cards** — only 183/853 `when_to_pick` texts contain the early/late/mid keywords the generator looks for. The timing modifier is mostly inert. | Enrich derivation (parse "gen X-Y" phrases) or rate timingBias explicitly for the ~100 most timing-sensitive cards. |
| 6 | `tagSynergyWeights` is `{}` for every card (generator never fills it) — the per-card tag-synergy channel is dead; only the hardcoded science/jovian/earth bonuses fire. | Populate for engine cards or remove the channel. |
| 7 | Top/bottom eyeball test passes: top = Point Luna 90, CrediCor 88, Earth Catapult 88, Mars University 88, Kelp Farming 87; bottom = Underground Detonations 15, Micro-Mills 30, Society Support 30. Directionally consistent with community consensus. | Confidence that scores are sane, not proof. |

## Phase 0 — data hygiene (≈1-2 h, do first)

Fix findings 1-3 (+ optionally 5-6). These are mechanical correctness bugs in
how ratings flow into the advisor, independent of whether the scores are good.
Deliverable: updated `evaluations.json` / `build-cards.mjs`, audit reruns clean.

## Phase 1 — expert cross-validation (≈half a day)

1. Build a consensus table from 2-3 independent expert sources (see Sources
   below): `name → tier/rank` per source.
2. Normalize names, join with our scores; compute Spearman rank correlation
   per card type (corps, preludes, projects) and overall.
3. Flag the top ~30 disagreements (|rank delta| largest) and review each
   manually against its cited COTD thread / source reasoning.
4. Acceptance gate: ρ ≥ 0.7 vs each source; no S- or F-rated card more than
   one tier away from consensus without a written justification.

## Phase 2 — empirical validation from BGA replays (≈1-2 days, strongest)

Mine real game outcomes with `HStrand/bga-tm-scraper` (the tool is built
exactly for this; uses your BGA account, see Sources for constraints):

1. Scrape a few thousand 2p Arena games (matches your meta: Corporate Era +
   Prelude + Draft, fast).
2. Per card compute: draft pick-rate (chosen / seen), buy-rate, play-rate,
   and **win-rate delta** = P(win | played) − P(win | seen, not played),
   stratified by elo bucket; require n ≥ 30 plays per card for stability.
3. Rank-correlate empirical performance with our scores; recalibrate
   outliers (with provenance notes in the eval's `reasoning`).
4. Bonus: this produces a *meta-specific* rating set — community lists often
   assume 3-4p, but 2p values differ (e.g. attack cards, Tharsis Republic).

## Phase 3 — decision-level backtest (optional, the fun one)

From scraped replays of high-elo players, replay every draft/buy decision
through the advisor and measure top-1/top-2 agreement between the plugin's
recommendation and what the expert actually picked. This validates base
scores *and* context modifiers end to end. Same harness backtests against
your own games to show where the advisor would have disagreed.

## Phase 4 — apply + regression guard

Score adjustments go into `evaluations.json` with a note + source; rebuild;
`audit-ratings.mjs` becomes part of the build script so hygiene cannot
regress silently.

## Sources (researched 2026-06-10)

**Empirical (best first):**
- **tfmstats.com** — ~209k scraped BGA games (the HStrand/bga-tm-scraper
  ecosystem). Public no-auth API:
  `https://bga-tm-scraper-functions.azurewebsites.net/api/cards/stats`
  (per-card timesPlayed / winRate / avgEloChange when played) and
  `.../api/cards/option-stats` (same, denominator = had the option to keep).
  Parallel endpoints for preludes/corps/starting hands. Full ~3.7 GB parquet
  dump downloadable from the site UI — enables elo/player-count/module
  slicing (Phase 2 proper). Caveat: winRate-when-played is confounded for
  situational/finisher cards; option-stats and avgEloChange are sounder.
- **RuneDK93/terraforming-mars-dataset** — 1.5k+1.6k 3p Arena games among
  world top-25 players (base+CE and base+Prelude), per-card win rates.
  High skill purity; 3p only, no Colonies, static 2024.

**Expert consensus:**
- **rusliksu/tm-tierlist** (`wiki/wiki-data.json`) — 956 cards with 0-100
  score + tier, updated June 2026; the successor to the tm-advisor project
  this repo's evaluations came from. NOT independent of our data (same
  lineage) — treat as "upstream sync" rather than validation. Its HTML
  embeds 491 COTD thread URLs — a ready-made COTD index.
- **r/TerraformingMarsGame COTD** — daily since 2020, still active;
  qualitative expert commentary; fetch via pullpush.io or Reddit RSS.
- TierMaker aggregates (corps 44 lists / preludes 30) — casual sanity check.

**Local artifacts:** `verification/` holds the fetched datasets;
`scripts/verify-ratings.mjs` computes the correlations below.

## First verification results (2026-06-10)

- vs tm-tierlist (853 joined): **Spearman 0.946** (projects .940, corps
  .969, preludes .950); mean |Δ| 1.2 pts; 96% within 10 pts. Our DB is a
  near-copy of the June-2026 upstream — biggest BGA-relevant drifts:
  Advanced Alloys (64 vs 86), Immigrant City (72 vs 58), Protected
  Habitats (84 vs 70), Caretaker Contract (68 vs 54).
- vs tfmstats when-played (260 cards, n≥1000): Spearman .574 (winRate),
  .497 (eloΔ) — moderate, expected given confounds.
- vs tfmstats option-to-keep (263 cards): **Spearman .691 / .628** — the
  cleaner empirical signal, and a reasonable pass for a static rating set.
- 12 flagged cards went through adversarial COTD/expert review (full
  rationales + sources: `verification/review-verdicts.json`):

  | Card | Ours | Verdict | Confidence |
  |---|---|---|---|
  | Immigrant City | 72 | lower → 58 | high |
  | Advanced Alloys | 64 | **raise → 78** | high |
  | Ice Cap Melting | 35 | keep (65% WR = finisher confound) | high |
  | Special Design | 50 | lower → 32 (WR = enabler confound) | high |
  | Caretaker Contract | 68 | lower → 35 | high |
  | Quantum Communications | 75 | lower → 66 (2p) | medium |
  | Heavy Taxation | 73 | lower → 67 | medium |
  | Martian Zoo | 70 | lower → 52 | medium |
  | Productive Outpost | 68 | lower → 55 | medium |
  | Luna Governor | 71 | lower → 64 | medium |
  | Ganymede Colony | 75 | lower → 63 (2p) | medium |
  | Protected Habitats | 84 | keep (2p: "almost S-tier in 1v1") | medium |

  Pattern: our Colonies cards skew ~10 pts overrated for the 2p meta; two
  empirical "underrated" flags were confounds correctly rejected; ours was
  vindicated twice (ICM, Protected Habitats).

## Applied 2026-06-10 (v0.2.1) — `scripts/apply-verdicts.mjs`

- The 10 reviewed score changes above (each eval carries an `adjustment`
  provenance field).
- 24 synergy refs respelled to resolvable card names; 178 remain inert by
  design (colony tiles, CEOs, concepts — not cards).
- 497 tiers regenerated from scores (extension bands) → audit finding #1 = 0.
- Beginner Corporation eval added → finding #2 = 0.
- `normalizeName` now treats punctuation as spaces (hyphen variants match);
  `NAME_ALIASES` keys updated to the new normal form.
- Still open (by choice): structured requirements parsing.

## Applied 2026-06-10 (v0.3.0) — scoring channels filled

Findings #5 and #6 resolved: a reviewed multi-agent pass assigned explicit
`timing_bias` (rubric: -15 early engine … +15 endgame finisher; corps and
preludes fixed at 0) and `tag_synergy_weights` (value the card RECEIVES from
the player's existing tags; 1-3 per tag, max 3 tags) for all 371
BGA-reachable cards — 247 with nonzero timing, 86 with tag weights, 5
cross-batch calibration corrections. Pipeline: `scripts/export-channel-batches.mjs`
→ workflow (8 assigners + reviewer, outputs in `verification/channels/`)
→ `scripts/merge-channels.mjs` (validates, clamps, merges into
evaluations.json) → `build-cards.mjs` (explicit fields override keyword
derivation).

Verdict so far: ratings are **directionally sound** (top/bottom verified,
strong correlation with both expert and empirical sources). The fix list is
small and specific rather than systemic; the bigger wins are the Phase 0
hygiene items (dead synergies, inert timing channel).
