# Castaway — Page Specs (Functional)

These specs describe what each unbuilt page needs to do, who it serves, and how it connects to the rest of the product. They are intentionally non-technical — no implementation details, just behavior and intent.

---

## 1. Landing Page

**Route:** `/`

**Who it serves:** Anyone who arrives at Castaway without being signed in — primarily potential commissioners who heard about it from a friend or found it organically. They know what Survivor is. They may already run a league manually in a group chat or spreadsheet and are curious whether this is better.

**What context they bring:** Zero. They don't have an account, they don't know what Castaway does specifically, and they haven't committed to anything. Their bar for leaving is low.

**What this page needs to do:**

The landing page has one job: get a potential commissioner to create an account. It should answer three questions fast — what is this, how does it work, and why should I bother — and then get out of the way. It is not a marketing brochure. It should feel like a product, not a pitch.

It should show what a live league looks like — a glimpse of the leaderboard, a draft, a scoring event — so the commissioner can immediately picture their friend group in it. The call to action is "Create a League," not "Sign Up" — lead with the outcome, not the mechanism.

For signed-in users who land here with no league memberships, the page should redirect them rather than show them marketing content they've already seen. They're past this page.

**Where it leads:**
- Primary: Sign up (via Clerk) → `/leagues/new`
- Secondary: If already signed in with no memberships → `/leagues/find`

---

## 2. Find a League

**Route:** `/leagues/find`

**Who it serves:** Users who are signed in but have no league memberships. This happens when someone creates an account without immediately creating or joining a league — either because they got distracted after signup, or because someone told them about Castaway but didn't send them a specific invite link.

**What context they bring:** They have an account. They haven't done anything with it yet. They may have an invite code written down somewhere, or they may be a commissioner who wants to start fresh.

**What this page needs to do:**

Give a stranded user a clear fork in the road. There are exactly two exits: enter an invite code to join an existing league, or create a new one. There should be no ambiguity about which path is which — one is for players, one is for commissioners.

The invite code entry should be simple — a single input field and a submit button. If the code is valid, it should show the league name and a confirmation before joining. If invalid, a clear error.

The "Create a League" path should link directly to `/leagues/new`.

This page should feel like a waypoint, not a destination. It exists to prevent dead ends, not to be a hub.

**Where it comes from:** Automatic redirect when a signed-in user has no league memberships and tries to access any league page.

**Where it leads:**
- Valid invite code → `/join/[code]` (the join confirmation page)
- Create a league → `/leagues/new`

---

## 3. League Picker

**Route:** `/leagues`

**Who it serves:** Signed-in users who are members of more than one league — either a commissioner running multiple leagues, or a player who joined leagues for different friend groups or seasons.

**What context they bring:** They're authenticated and active. They know they have multiple leagues. They're trying to navigate to a specific one.

**What this page needs to do:**

Show all leagues the user belongs to and let them pick one. Each league entry should show enough to distinguish it at a glance: league name, current season, the user's role in that league (Commissioner or Player), and something live like their current rank or the last episode date.

Leagues the user commissioners should be visually distinct from ones they're just playing in — they have different responsibilities in each.

This page only exists because some users will have multiple leagues. It should be fast and scannable. It is not a management page — management happens inside each league.

**Where it comes from:** Automatic routing when a signed-in user with multiple memberships tries to reach the base URL or `/leaderboard`.

**Where it leads:** Any individual league home → `/leagues/[slug]/leaderboard`

---

## 4. Commissioner Dashboard

**Route:** `/leagues/[slug]/manage`

**Who it serves:** The commissioner of a specific league. This is their primary workspace — where they check in after creating the league, while waiting for players to join, before the draft, and throughout the season when they need to manage things.

**What context they bring:** They created this league. They know the players they invited. They may be waiting on people to join, about to run the draft, or mid-season managing scoring events. They carry a sense of responsibility — it's their league, their friend group.

**What this page needs to do:**

The commissioner dashboard is the control room. It should show the current state of the league and what action, if any, the commissioner needs to take next. The most important question it answers is: "what do I need to do right now?"

Before the draft, the primary concern is membership — who has joined, who is still missing, and how to get remaining players in. The invite link should be front and center, easy to copy and reshare.

When everyone is in, the commissioner triggers the draft. This is a deliberate action — they should understand what they're starting. Once triggered, all members are sent to the draft room.

During the season, the dashboard surfaces any events waiting for review or approval. The commissioner is the gatekeeper for what counts as a scoring event — they review game events submitted from the admin panel and decide whether to approve them.

The dashboard should always show a clear "what's next" — never leave the commissioner wondering what they're supposed to be doing.

**Where it comes from:**
- Immediately after creating a league via `/leagues/new`
- From the league nav, visible only to the commissioner
- From the invite page after sharing

**Where it leads:**
- Invite page → `/leagues/[slug]/invite` (reshare link)
- Draft room → `/leagues/[slug]/draft` (when commissioner triggers draft)
- Event management → `/admin` (existing)
- League settings (future)

---

## 5. Draft Room

**Route:** `/leagues/[slug]/draft`

**Who it serves:** All members of a league — commissioner and players together — at the same time. The draft is the first shared experience of the league. Everyone participates.

**What context they bring:** The commissioner has triggered the draft. All members know their draft position (snake order). They know the S50 cast. They've probably been talking about who they want. There is anticipation and mild competition.

**What this page needs to do:**

Run the snake draft. Players take turns selecting Survivor contestants in the established pick order. When it's your turn, you choose from the remaining available contestants. When it's not your turn, you watch and wait.

The draft room needs to show: the pick order, whose turn it is right now, the available contestant pool with enough information to make a meaningful choice (tribe, general reputation), each player's team as it builds out, and a clear indication of when the draft is complete.

The commissioner controls the start. After that, the draft runs on its own — picks happen in sequence until every player has a full team.

Once the last pick is made, the draft is complete and teams are locked. All members should be moved on to the league home — the leaderboard — where the season begins.

The draft room is the highest-energy moment in the product. The social dynamic of watching picks happen in real time is part of what makes fantasy leagues fun. This page should feel alive.

**Where it comes from:** Commissioner triggers draft from the Commissioner Dashboard → all members are directed here.

**Where it leads:** Draft complete → `/leagues/[slug]/leaderboard` for all members.

---

*Last updated: March 2026*
*Owner: Agents — update this doc when page specs change or pages are built.*
