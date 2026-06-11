# Chrome Web Store listing — prepared texts

Package: `store/bga-tm-advisor-v0.3.0.zip` (dist without sourcemaps).
Privacy policy URL: https://github.com/mralnis/terraforming-mars-bga-advisor/blob/main/PRIVACY.md

## Name (45 chars max)

TM Advisor for BoardGameArena

(Deliberately does not lead with the "Terraforming Mars" trademark — reduces
rejection/takedown risk. The full game name appears in the description with a
fan-project disclaimer.)

## Summary (132 chars max)

Card rating badges and context-aware pick advice for Terraforming Mars games
on BoardGameArena. Unofficial fan tool.

## Description

See your cards the way strong players do. During corporation select, research
draft, card buying, and the action phase, every card gets a tier badge
(S/A/B/C/D/F) with a 0-100 score — based on community-expert ratings, then
adjusted live for your game: current generation timing, your tag engine,
affordability (using the game's own discounted costs), global requirements,
and synergies with cards you've already played. Hover any badge for the full
score breakdown. Works in live games and replays. Configurable in the popup:
badges, tooltips, dim-low-tier cards, minimum tier filter.

All processing is local; the extension collects no data (see privacy policy).

Unofficial fan project, not affiliated with FryxGames, Stronghold Games, or
Board Game Arena. Terraforming Mars is a trademark of its respective owners.
Ratings synthesized from community expertise — full credits in the README:
https://github.com/mralnis/terraforming-mars-bga-advisor

## Category / language

Category: Fun (or Productivity → Tools). Language: English.

## Privacy tab answers

- Single purpose: "Displays card-rating badges on Terraforming Mars game
  pages at boardgamearena.com."
- Permission justifications:
  - `storage` — saves the user's display preferences (badges/tooltips/tier
    filter) so they persist between sessions.
  - Host access `*://boardgamearena.com/*` — required to read the Terraforming
    Mars game board DOM and draw rating badges on it. The extension is inert
    on all other sites.
- Data collection: "Does not collect user data" (all toggles no).
- Remote code: none (all code packaged).

## Assets still needed (only you can make these look right)

- 1-5 screenshots, 1280×800 or 640×400 PNG/JPG — open a TM replay with the
  extension active and crop. The corp-select screen with 16 badges is the
  money shot.
- Optional small promo tile 440×280.

## Submission steps (account owner only)

1. https://chrome.google.com/webstore/devconsole → register as developer
   (one-time $5 fee, Google account, accept developer agreement).
2. New item → upload the zip.
3. Paste the texts above; upload screenshots; set privacy answers.
4. Visibility: consider starting **Unlisted** (installable via link, not
   searchable) — lets friends/league mates use it while you gauge the
   considerations below.
5. Submit for review (typically 1-3 days for a small MV3 extension).

## Considerations before going fully public

1. **BGA terms / community norms** — a draft advisor is an assistance tool in
   rated play. Publishing makes it visible to BGA and opponents. An Unlisted
   release sidesteps the spotlight; a public one invites the conversation.
2. **Ratings data license** — evaluations derive from rusliksu's tm-advisor /
   tm-tierlist work (no explicit license published). Credited prominently,
   but for a public store release it would be courteous (and safer) to ask
   for their blessing via a GitHub issue on tm-tierlist.
3. **Trademark in listing** — keep "Terraforming Mars" out of the extension
   NAME (done above), keep the disclaimer in the description.
