# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/adamgio72/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/adamgio72/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for make.fun's token-radar-01 bounty. From the sealed DefiLlama snapshot (758 protocols, 14 November 2026) it ranks the 198 pre-token protocols that can launch — the 40-protocol watchlist plus 158 early candidates — by implied launch value. The model (radar-2) values each protocol from the market itself: every category's multiple is the median market-cap-to-TVL ratio of that category's live-token protocols in the same snapshot (at least 3 of them, else the overall median 0.205, capped at 1.0 so no token is valued above its own TVL), times 7-day growth and a 3-year maturity factor. Each row carries a six-step farm plan with a cost and a time. The dashboard is a static page (no network, no framework): a sortable, filterable board, a detail drawer per protocol, and a live-token view of the comparables. Deterministic: two runs produce byte-identical output.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

## How it works

`main.ts` (Node 22, standard library only) reads the sealed snapshot, scores every rankable pre-token protocol with the model in `lib/model.ts`, and writes `board.json` (198 rows), `data.js` (the dashboard's dataset), the dashboard, three screenshots, and `dossier.json` (the summary the judge reads). Screenshots live in this repository as base64 text (`screenshots/*.png.b64`) because the push path carries text only; `main.ts` decodes them into whole PNGs before the dossier is written.

The board is the whole launchable universe, not a top-N list: every watchlist slug, plus every other protocol that is pre-token, not an exchange, not a versioned pool, and not a wrapped, staked or bridged product. Live-token protocols are set aside (24 shown in the dashboard's Live view) — they are the comparables, never ranked. Honest limits: “records no token” means the snapshot records none; a parent protocol can hold the token and stay invisible here.

---

<sub>Entered on [make.fun](https://make.fun/?ref=c4fxtthp&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
