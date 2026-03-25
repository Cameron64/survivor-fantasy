# Castaway — Product & Business Plan

> The fantasy league platform for reality TV — launching with Survivor, built for every show

**March 2026 | Confidential**

---

## Executive Summary

Castaway is a fantasy league platform for reality TV. It lets any friend group, fan community, or podcast audience run their own private league around elimination-format reality shows — starting with Survivor, with Big Brother, Amazing Race, and others to follow. The platform handles user authentication, snake drafts, real-time scoring from game events, leaderboards, tribe tracking, a Monte Carlo simulation engine, and a Slack bot. A fully-functional Survivor implementation is already live on Railway today.

The immediate opportunity is to transform this single-tenant, single-season tool into a multi-tenant SaaS platform. The Castaway brand is show-agnostic, protecting against IP risk while opening a larger addressable market. Survivor Season 51 premieres in Fall 2026, creating a natural, time-boxed launch window with predictable demand.

> **The core product is already built.** The path to revenue is a focused multi-tenancy sprint, a Stripe integration, and a self-serve onboarding flow. Most of the hard work is done.

| Metric | Value |
|--------|-------|
| Current Status | Live, single-league, Season 50 |
| Tech Stack | Next.js 16, Prisma/PostgreSQL, Clerk, Railway |
| Target Launch | Season 51 premiere (Fall 2026) |
| Primary Revenue Model | Per-season commissioner subscription |
| Year 1 Revenue Target | $18,000 – $36,000 ARR |
| Pricing (proposed) | $49/season per league (up to 16 players) |

---

## The Opportunity

### Why Reality TV Fantasy?

Reality TV competition shows — Survivor, Big Brother, The Amazing Race, The Challenge — collectively draw tens of millions of weekly viewers and generate some of the most passionate fan communities in television. Despite this, there is no dominant, purpose-built fantasy platform for the genre. The market is served by spreadsheets, manual Discord bots, and generic sports fantasy apps that don't understand the unique mechanics of these shows: tribe swaps, eviction votes, alliance blindsides, jury systems, and elimination arcs.

Castaway launches with Survivor — the longest-running elimination competition franchise, currently in its 50th season — because the core product is already built and proven. But the brand and architecture are designed from day one to support any show in the genre. This is the platform fantasy play, not a Survivor fan site.

Fan communities are large, passionate, and accustomed to paying for digital products. Survivor subreddits, podcasts, and Patreon communities routinely have tens of thousands of engaged followers who watch live and discuss in real-time — exactly the kind of user who wants a live-scoring fantasy experience.

### Market Gap

| What Exists | What's Missing |
|-------------|----------------|
| Generic fantasy platforms (ESPN, Yahoo) | Show-specific scoring events (idols, blindsides, jury) |
| Spreadsheet templates | Real-time scoring, leaderboards, draft tools |
| Discord/Slack bots | Persistent data, history, visual leaderboards |
| Fan-built one-offs | Polished UX, mobile PWA, self-serve setup |

### Timing

Season 50 (All-Stars) is airing now. Season 51 premieres in fall 2026. That gives approximately 5 months to complete the SaaS pivot — enough runway to ship multi-tenancy, payment processing, and a marketing landing page before the new season creates organic demand.

> Every Survivor season is a new acquisition window. Unlike most SaaS markets, the product resets to high intent every 6 months.

---

## Product Vision

### What We're Building

A self-serve SaaS platform where any group can run a fully-featured fantasy league around their favorite reality TV show — starting with Survivor, expanding to Big Brother, Amazing Race, and beyond. Zero setup friction, real-time scoring, and a polished mobile-friendly experience. Castaway is the fantasy platform for reality TV that doesn't exist yet.

### Core Value Proposition

- Set up a league in under 5 minutes with self-serve onboarding
- Live scoring from structured game events — no manual spreadsheet updates
- Full draft system with snake order and configurable rounds
- Mobile PWA — works on phone during live episode viewing
- Customizable scoring rules per league
- Simulation engine for strategy nerdery (a differentiator)

### Product Tiers

| Tier | Price | Leagues | Players |
|------|-------|---------|---------|
| Free | $0/season | 1 | Up to 4 |
| Commissioner | $49/season | 1 | Up to 16 |
| Community | $99/season | 3 | Up to 50/league |

Pricing is per-season to align with how reality TV fans think. A "season" maps to one airing of the show (~13 weeks). Annual billing option available at 1.5x the per-season price.

### Feature Roadmap

**Phase 1 — SaaS Foundation (Now → Season 51 Launch)**
- Multi-tenancy: league isolation, commissioner role, invite system
- Self-serve league creation flow with season selection
- Stripe integration: per-season payment at league creation
- Season data seeding: admin tools to load contestants per season
- Public marketing landing page with waitlist/early-access signup
- Free tier with hard limits (player cap, feature flags)

**Phase 2 — Engagement & Retention (Season 51 → Season 52)**
- Merge functionality (complete existing roadmap item)
- Contestant player pages
- Public team breakdowns (any user can view any team)
- Point betting / predictions layer
- In-app chat / trash talk
- Weekly recap digest (email + Slack)
- Push notifications for tribal councils

**Phase 3 — Community & Network Effects (Season 52+)**
- Multi-season history and analytics
- Dynasty/keeper leagues carrying over between seasons
- League discovery (public leagues for podcast communities)
- API access for Community tier
- Affiliate program for podcast commissioners

---

## Target Market

### Primary Persona: The Commissioner

The Commissioner is the person who organizes fantasy leagues in their friend group. They're 25–45, a longtime Survivor fan, tech-comfortable, and already running a league via spreadsheet or Discord. They watch episodes live and spend hours on Survivor fan communities. They're willing to pay $50 to save hours of manual work and give their league a professional feel.

> **Acquisition insight:** The Commissioner is the buying decision. Once they pay and set up a league, they recruit 8–15 players who use the product for free. Every Commissioner acquisition multiplies your active user count by 10x.

### Secondary Persona: The Podcast Commissioner

Survivor podcasts and YouTube channels with 5,000–100,000 listeners run listener fantasy leagues as engagement tools. These commissioners need multi-league support and higher player caps. They're a natural Community tier customer and a powerful distribution channel — a single podcast shoutout can generate dozens of commissioner signups.

### Market Sizing

| Segment | Estimate | Notes |
|---------|----------|-------|
| Survivor viewers (US) | ~5M per episode | Nielsen S50 average |
| Active fantasy players (est.) | ~500K | ~10% of viewers |
| Leagues (avg 10 players) | ~50K leagues | Total addressable market |
| Addressable at $49/season | $2.45M/season | At 100% capture (ceiling) |
| Realistic Y1 target (0.05%) | ~25 leagues | $1,225 first season |
| Realistic Y2 target (0.3%) | ~150 leagues | ~$14,700 across two seasons |

---

## Go-to-Market Strategy

### Launch Timing

Target launch: 4–6 weeks before Season 51 premiere. The sweet spot for commissioner acquisition is the window between cast announcement and premiere — fan communities spike and leagues traditionally form.

### Distribution Channels

**1. Survivor Podcast Partnerships (Highest Leverage)**
Shows like Rob Has a Podcast (RHAP) have highly engaged audiences. A partnership model — free Community tier access for podcast hosts in exchange for a shoutout — is zero-cost and can generate hundreds of commissioner signups per mention.

**2. Reddit (r/survivor, r/fantasysurvivor)**
r/survivor has 350K+ members. A well-timed launch post during cast announcement week can hit the front page. r/fantasysurvivor is a smaller but highly targeted audience.

**3. X / Twitter Survivor Community**
Survivor Twitter is extremely active during premieres and finales. Sharing with active cast members can generate organic reach.

**4. ProductHunt**
A ProductHunt launch timed to the season premiere generates early adopters from the tech-adjacent audience.

### Early Access Strategy

Build a waitlist landing page now. Offer early-access commissioners a discounted rate ($29 vs $49) and direct access to give product feedback. This creates urgency, validates willingness to pay, and seeds the first cohort of real leagues.

> **Goal: 25 paying leagues for Season 51 premiere.** This is achievable with a single well-placed podcast mention or Reddit post.

---

## Revenue Model & Projections

### Revenue Projections

| Period | Paying Leagues | ARR |
|--------|---------------|-----|
| Season 51 (Fall 2026) | 25 leagues | $1,225 |
| Season 52 (Spring 2027) | 75 leagues | $3,675 |
| Season 53 (Fall 2027) | 150 leagues | $7,350 |
| Year 2 Total (S52+S53) | 150 avg | $11,025 |
| Year 3 Target | 300 leagues | $22,000+ |

### Unit Economics

| Metric | Value |
|--------|-------|
| COGS per league/season (Railway hosting) | ~$0.50–$2 |
| Gross margin (Commissioner tier) | >95% |
| Customer Acquisition Cost (organic) | ~$0 |
| LTV (2 seasons, Commissioner) | $98 |
| LTV (4 seasons, Commissioner) | $196 |

> This is an extremely favorable unit economics profile. Zero COGS, zero CAC (organic), immediate payback. The only investment is engineering time to complete the SaaS pivot.

### Cost Structure

- Railway hosting: ~$20–50/month at launch, scaling to ~$100–200/month at 500+ leagues
- Clerk (auth): free up to 50K monthly active users, then $25/month
- Stripe fees: 2.9% + $0.30 per transaction
- Domain + misc: ~$20/month
- **Total monthly costs at launch: ~$50–100/month**

---

## Competitive Landscape

| Alternative | Weakness | Our Advantage |
|-------------|----------|---------------|
| Spreadsheets | Manual scoring, no real-time, no mobile | Automated scoring, live leaderboards, PWA |
| Discord/Slack bots | Text-only, no persistence, no draft system | Full web UI, history, simulation engine |
| ESPN/Yahoo Fantasy | No Survivor support, wrong game mechanics | Show-native: idols, blindsides, tribes |
| Generic fantasy builders | Require manual config, not show-aware | Pre-configured for Survivor, plug-and-play |
| Fan-made one-offs | Abandoned after one season, poor UX | Actively maintained, multi-season roadmap |

The primary moat is domain specificity combined with engineering quality. The simulation engine alone is a differentiator no competitor offers.

---

## Key Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CBS cancels Survivor | Very Low | S50 All-Stars high viewership; S51 already greenlit |
| Low commissioner conversion | Medium | Podcast partnership strategy; free tier reduces friction |
| Multi-tenancy bugs at launch | Medium | Beta testing with 2–3 leagues before public launch |
| Clerk/Railway pricing changes | Low | Both stable; Railway replaceable with standard Postgres hosting |
| Competitor launches similar product | Low-Medium | First-mover advantage in a niche market |

---

## IP & Branding Note

The platform is branded as **Castaway** — not as "Survivor Fantasy League." This deliberately avoids CBS/Paramount trademark risk. The Castaway brand is show-agnostic and can expand to Big Brother, Amazing Race, and other elimination-format shows. Survivor is the launch vehicle, not the company identity.

---

## Immediate Next Steps

**30 Days**
- [ ] Register `castaway.app` domain
- [ ] Inquire on `castaway.com` price via MarkUpgrade
- [ ] Complete Sprint 1: multi-tenancy schema changes (see `castaway-migration-plan.md`)
- [ ] Build waitlist landing page at castaway.app ✅

**60 Days**
- [ ] Complete Sprints 2–3: auth/routing + Stripe onboarding
- [ ] Beta test with 2–3 real commissioner leagues
- [ ] Finalize pricing page and onboarding UX

**90 Days (Pre-Season 51 Launch)**
- [ ] Complete Sprint 4: Season 51 data seeded and ready to draft
- [ ] Public launch: Reddit + podcast outreach during cast announcement week
- [ ] First revenue — goal: 25 paying Commissioner leagues
