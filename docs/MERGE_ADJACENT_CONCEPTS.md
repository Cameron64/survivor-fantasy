# Survivor Fantasy League – Merge Adjacent Events

This document describes **game events that occur around the merge but are not the merge itself**. These events must be supported by the fantasy league engine because they frequently affect tribe membership, voting pools, immunity mechanics, and scoring logic.

The key rule:

**There is only one structural merge per season**, but there are many merge-adjacent mechanics.

A robust system must support these events without assuming that merge behavior happens all at once.

---

# Design Principle

Do not assume that these events happen simultaneously:

* tribe structure change
* shared living arrangement
* voting pool consolidation
* jury start
* individual immunity challenges

In Survivor they often occur across **multiple episodes**.

---

# Merge Adjacent Event Types

## Tribe Swap

A tribe swap redistributes players between tribes before the merge.

Example:

```
Tribe A: 6
Tribe B: 6

→ swap

Tribe A: 3 original A + 3 original B
Tribe B: 3 original B + 3 original A
```

Effects:

* `currentTribeId` changes
* alliances are disrupted
* challenge outcomes change

Non-effects:

* tribes still exist
* game is still pre-merge

Required fields:

```
originalTribeId
currentTribeId
```

These values remain useful for analysis and scoring even after the merge.

---

## Tribe Absorption / Dissolution

Sometimes a tribe disappears entirely and its players are distributed to other tribes.

Example:

```
Initial tribes: A, B, C

→ Tribe C dissolved

New structure:
A: 5 players
B: 5 players
```

Effects:

* tribe count decreases
* players reassigned unevenly

This event is still **pre-merge**.

The system must support dynamic tribe counts before merge.

---

## Fake Merge

Rare twist where players believe they have merged but tribes still exist.

Possible mechanics:

* players move to one camp
* players compete in "individual" challenge
* players vote assuming merge

Then the show reveals:

* tribes are still separate
* votes only count within tribe

The real merge occurs later.

System requirement:

* living arrangement should not determine merge state

---

## Merge Feast

Common merge ceremony event.

Typical elements:

* new merged tribe name chosen
* merge buffs distributed
* feast reward

This event usually coincides with merge but may appear in a transition episode.

For fantasy leagues this may matter if scoring includes:

* social events
* confessionals
* advantages revealed

---

## Earn The Merge / Mergatory

Modern Survivor seasons often include a merge transition phase.

Typical flow:

1. tribes dissolve
2. players move to shared camp
3. players compete in team challenge
4. challenge winners gain safety
5. losing players are vulnerable
6. one player eliminated
7. next episode becomes full merge

Key implementation note:

During this phase:

* players may live together
* only some players are vulnerable
* challenge immunity is team-based

Recommended phase:

```
MERGE_TRANSITION
```

---

## Merge Immunity Challenge

The first challenge after the merge often grants **individual immunity**.

However this may not occur immediately in merge transition seasons.

System must support:

* team immunity during transition
* individual immunity post merge

---

## Split Tribal Council (Post Merge)

After merge, the game may split players into two temporary voting groups.

Example:

```
Merged tribe: 10 players

→ split

Group A: 5
Group B: 5
```

Each group:

* competes for immunity
* attends tribal council
* votes within group

Important rule:

**Voting groups are not tribes.**

The tribe remains merged.

---

## Jury Start

The jury may begin:

* at the merge
* one episode after merge
* during merge transition

This varies by season.

Therefore jury must be tracked separately.

Suggested fields:

```
juryActive
juryStartPlacement
becameJurorEpisodeId
```

---

## Double Eliminations

Occasionally two players are eliminated in one episode.

This may occur during:

* split tribal
* special twists

The elimination system must support multiple eliminations per episode.

---

# Required Engine Capabilities

The fantasy league engine must support:

* dynamic tribe counts
* tribe membership history
* voting groups independent of tribes
* merge transition phases
* configurable merge definitions
* jury tracking independent of merge

---

# Recommended Phase Model

```
PRE_MERGE
MERGE_TRANSITION
MERGED
POST_MERGE_SPLIT_TRIBAL
ENDGAME
```

Transitions occur in this order and the true merge happens only once.

---

# Implementation Guideline

When modeling Survivor rounds, treat these questions separately:

1. What tribe does the player belong to?
2. What group votes together this episode?
3. Who is immune?
4. Who is eligible to vote?
5. Is the jury active?

These dimensions determine game behavior around merge.

---

# Summary

Survivor only merges **once per season**, but several mechanics surround that event.

A flexible system must support:

* tribe swaps
* tribe dissolutions
* fake merges
* merge transition phases
* merge ceremonies
* split tribals
* independent jury start

Model the game using **phases, voting groups, and player states** rather than assuming merge is a single atomic event.
