# Simulation Engine

Monte Carlo simulation engine for testing fantasy scoring balance against historical Survivor data. Answers the question: "Given our point values, do random drafts produce competitive leagues?"

## Architecture

```
simulation/
├── config/
│   └── defaults.ts          # Default sim parameters (players, picks, sims)
├── data/
│   ├── export-survivor-data.R  # R script: survivoR package -> raw JSON
│   └── import.ts               # Raw JSON -> processed season files
├── engine/
│   ├── types.ts              # All type definitions (zero external deps)
│   ├── data-mapper.ts        # Raw survivoR data -> SimEvent[] + BASE_EVENT_POINTS
│   ├── data-loader.ts        # Load season JSON files (with caching)
│   ├── score-calculator.ts   # Calculate fantasy scores for castaways and teams
│   ├── draft-simulator.ts    # Snake draft simulation (random/manual/hybrid)
│   ├── monte-carlo.ts        # Run N simulations, aggregate statistics
│   ├── balance-analyzer.ts   # Gini, spread, correlation, event contribution
│   └── index.ts              # Barrel export
├── cli/
│   ├── helpers.ts            # Arg parsing, table formatting, JSON output
│   ├── preview.ts            # sim:preview — contestant value breakdown
│   ├── simulate.ts           # sim:run — single draft simulation
│   ├── batch.ts              # sim:batch — Monte Carlo batch analysis
│   └── compare.ts            # sim:compare — A/B scoring comparison
└── __tests__/
    ├── data-mapper.test.ts
    ├── score-calculator.test.ts
    ├── draft-simulator.test.ts
    └── balance-analyzer.test.ts
```

## Zero-Dependency Design

The engine has **no Next.js, Prisma, or app dependencies**. It duplicates `BASE_EVENT_POINTS` from `lib/scoring.ts` so it can run as standalone TypeScript via `tsx`. This is intentional — simulations should never import from the web app.

## Data Pipeline

Historical data flows through two stages:

```
survivoR R package
    │
    ├── pnpm sim:export        (R script, requires R + survivoR + jsonlite)
    │   Writes to data/survivor-raw/
    │   ├── vote_history.json
    │   ├── challenge_results.json
    │   ├── advantage_movement.json
    │   ├── castaways.json
    │   ├── boot_mapping.json
    │   └── season_summary.json
    │
    └── pnpm sim:import        (TypeScript)
        Reads from data/survivor-raw/
        Writes to data/survivor-seasons/
        └── season-{N}.json    (one per season, contains castaways + mapped events)
```

The import step runs `mapSeasonEvents()` to convert raw survivoR data into fantasy-relevant `SimEvent` records. Each event gets its type and point value from `BASE_EVENT_POINTS`.

### Known Data Gap

`CAUSED_BLINDSIDE` events cannot be derived from the survivoR dataset (requires subjective judgment). The import emits a warning. Simulated scores will slightly undercount compared to live scoring where moderators award blindside points.

## CLI Commands

All commands support `--json` for structured output and `--override "TYPE:VALUE,..."` for testing alternative point values.

### Preview — Contestant Values
```bash
pnpm sim:preview --season 46
pnpm sim:preview --season 45 --override "WINNER:30" --json
```
Shows every contestant's fantasy point breakdown. No randomness. Useful for eyeballing whether the winner is too dominant or early boots are worthless.

### Run — Single Draft
```bash
pnpm sim:run --season 46
pnpm sim:run --season 46 --picks "0:US4601,US4605;1:US4603"
```
Simulates one snake draft with random (weighted) picks and shows team scores. Use `--picks` to pin specific players' selections.

### Batch — Monte Carlo Analysis
```bash
pnpm sim:batch --season 46 --sims 1000
pnpm sim:batch --season all --sims 500 --json
```
The primary balance analysis tool. Runs N simulations and reports:
- Score distribution (mean, median, stdDev, range, IQR)
- Balance metrics (Gini, spread, winner advantage, longevity correlation)
- Event type contribution percentages
- Top castaways by fantasy value

Use `--season all` for cross-season validation.

### Compare — A/B Scoring
```bash
pnpm sim:compare --season 46 --a default --b "WINNER:15,FINALIST:7"
```
Runs Monte Carlo for two point schemes and shows a side-by-side comparison of all metrics. Use this to test whether a proposed change actually improves balance.

### Shared Flags
| Flag | Default | Description |
|---|---|---|
| `--season N` | 46 | Season number (or `all` for batch) |
| `--json` | false | Output structured JSON |
| `--override "T:V,..."` | none | Override point values |
| `--players N` | 20 | Number of fantasy players |
| `--picks-per-player N` | 2 | Picks per player |
| `--max-owners N` | 2 | Max times a contestant can be drafted |
| `--sims N` | 1000 (batch), 500 (compare) | Number of simulations |

## Draft Model

The simulator models a snake draft matching the app's real draft system:
- Round 1: picks go 1, 2, 3, ..., N
- Round 2: picks reverse N, ..., 3, 2, 1
- Each contestant can be drafted by up to `maxOwnersPerContestant` teams (default: 2), since 20 players x 2 picks = 40 slots but only ~18-20 castaways per season

Random picks are **weighted by contestant value with noise**, simulating realistic but imperfect drafting. Higher-value castaways get picked earlier on average, but not deterministically.

## Balance Metrics

### Gini Coefficient
Measures team score inequality. 0 = perfectly equal, 1 = maximally unequal. Target: < 0.10.

### Spread
Max team score minus min team score. Target: < 15 points.

### Winner Advantage
How much the Survivor winner's fantasy points exceed the mean castaway value. If too high, whoever drafts the winner auto-wins. Target: < 15.

### Longevity Correlation
Pearson correlation between placement (inverted so higher = lasted longer) and fantasy points. Should be moderate (0.4-0.7) — lasting longer should help but not be the only factor.

### Event Contribution
Percentage of total season points from each event type. Helps identify if one category dominates. Healthy distribution: challenges 20-30%, voting/strategy 25-35%, endgame 20-30%.

## Testing
```bash
pnpm test -- src/simulation
```
47 tests covering data mapping, score calculation, draft simulation, and balance analysis. Tests use synthetic season data — no real season files needed.
