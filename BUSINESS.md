# Castaway — Business & Product Context

## What This Is

**Castaway** is a Survivor Fantasy League SaaS (multi-tenant). The app currently runs one private league for S50, but the DB schema and roadmap are oriented around becoming a self-serve platform where anyone can run a league for their friend group.

---

## Business Model

**Commissioners are the buyers.** They pay to run a league. Players join for free.

Two revenue streams:

1. **Per-player league entry** — $5–15/season. Commissioner collects entry fees from their players; Castaway takes a cut or charges the commissioner directly. Premium leagues with enhanced features.
2. **Commissioner subscriptions** — $9–29/mo. Advanced tools, analytics, multi-league management.

**Commissioner-as-distribution**: every commissioner who signs up brings 8–15 players at zero acquisition cost. The viral loop is built into the product — commissioners share invite links, players join, players become future commissioners.

---

## Commissioner Tiers

These map to the `LeagueTier` enum already in the staging DB (`FREE`, `COMMISSIONER`, `COMMUNITY`):

| Tier | Price | Notes |
|---|---|---|
| `FREE` | $0 | Trial/entry-level. Enough to experience the product. Exact feature limits TBD — should be generous for S51 launch. |
| `COMMISSIONER` | $9–29/mo | Advanced tools, analytics, multi-league management. Exact tier split within this range not yet defined. |
| `COMMUNITY` | TBD | Purpose not yet defined. |

Season-based pricing framing (e.g. "$X for the season") is preferred over monthly subscription for early adopters — aligns with Survivor's 6-month cycle and feels more natural for the use case.

---

## Growth Strategy

**Show expansion is the multiplier.** The codebase is built around a `Show → Season → League` hierarchy (already in staging DB schema). Adding Big Brother, The Traitors, or Amazing Race means new show config, new audience, same infrastructure — estimated 3x user base per show.

**Target user**: commissioners currently running leagues manually in spreadsheets, GroupMe, or group chats. They have the audience and the motivation; they just lack the tooling.

**S51 premiere (est. Sep/Oct 2026) is the go-to-market forcing function.** Commissioners need to draft before the season starts, which creates a hard deadline and a natural acquisition window.

---

## Roadmap

### Phase 1: Complete S50 (Now – May 2026)
- Merge features, jury tracking, fire-making, finale events
- No major architecture changes — finish what's live

### Phase 2: Multi-Season Launch (Jun – Sep 2026)
- Self-serve league creation (any commissioner can sign up and create a league)
- S51 support (new season, same app)
- Invite/viral sharing flow (commissioner gets a link, shares it, players join)
- Stripe payments live

### Phase 3: Scale (Oct 2026 – Mar 2027)
- Second show: Big Brother or The Traitors
- Premium tiers + analytics dashboard
- Commissioner tools: custom scoring, advanced stats
- Mobile app (React Native)
- Target: 500+ paid leagues across 3 shows

---

## Key Milestones

| Date | Milestone |
|---|---|
| Apr 2026 | Sprint 2 complete — any league can onboard via slug |
| May 2026 | S50 merge & finale features done |
| Jun 2026 | Self-serve onboarding live — anyone can create a league |
| Sep 2026 | S51 launch — 100+ leagues, Stripe payments active |
| Jan 2027 | Second show (Big Brother) |
| Mar 2027 | 500+ paid leagues across 3 shows |

---

## Current Traction (March 2026)

- 20 active users, 17 drafted teams, 138 scoring events, 1 live league (S50)
- 14 features in production, 116 unit tests, 28 API endpoints, 0 production incidents
- Multi-tenant schema already applied to staging DB: `Show`, `Season`, `LeagueMembership`, `LeagueInvite`, `LeagueTier`, `LeagueRole`, `League.slug`

---

## Schema State (Important for Agents)

The **staging DB is ahead of the codebase**. The multi-tenant schema was applied directly to staging without being committed to `prisma/schema.prisma`. The codebase still assumes a singleton league (`db.league.findFirst()` everywhere). Closing this gap is Phase 2 work.

Key staging-only additions not yet in schema.prisma:
- `Show`, `Season` — show/season hierarchy above `League`
- `LeagueMembership` — per-league user enrollment with `LeagueRole` (COMMISSIONER/MODERATOR/PLAYER)
- `LeagueInvite` — invite codes for joining a league
- `League.slug` (NOT NULL) — URL-friendly league identifier
- `League.tier` (`LeagueTier` enum) — commissioner tier
- `Contestant.seasonId` (NOT NULL) — ties contestants to a season

---

## Immediate POC Goal

Build a "try it" demo on staging: **sign in → create a league → get an invite link → share it → players join → see a working league with S50 data.**

This is the feedback loop needed before building the full commissioner tier flow. The staging DB already has the right schema; the app code needs to catch up enough to support this flow end-to-end.
