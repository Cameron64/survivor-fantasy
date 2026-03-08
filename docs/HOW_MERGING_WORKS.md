# Survivor Fantasy League – Merge Mechanics

This document explains how tribe merges work in Survivor and how they should be modeled in the Survivor fantasy league application so an agent can correctly implement the rules engine.

## Core Principle

Do not model merge as a simple boolean like `isMerged = true`. In Survivor, multiple mechanics shift around the merge point but not always at the same time. The system should instead treat merge as a **phase transition** with several independent dimensions.

Mechanics that may change around merge:

* tribe structure
* voting pool
* immunity format
* jury eligibility
* challenge format
* idol/advantage dynamics

These should all be tracked separately.

## Game Phases

Recommended phase model:

* PRE_MERGE
* MERGE_TRANSITION
* MERGED
* POST_MERGE_SPLIT_TRIBAL
* FINAL_PHASE

### PRE_MERGE

Players belong to tribes.

Characteristics:

* team immunity challenges
* tribal councils occur per tribe
* vote pool limited to tribe members
* jury usually not active

### MERGE_TRANSITION

Often called "Earn the Merge" or "Mergatory" in modern seasons.

Characteristics:

* all players live at one camp
* players divided into temporary challenge teams
* some players gain immunity
* only some players may be vulnerable at tribal

Important: the tribe may not yet be fully merged for voting.

### MERGED

All players belong to one tribe.

Characteristics:

* one camp
* one voting pool
* individual immunity challenges
* alliances can cross original tribes

### POST_MERGE_SPLIT_TRIBAL

The merged tribe still exists, but the game temporarily divides players into two voting groups.

Each group:

* may run its own immunity challenge
* holds a separate tribal council
* may eliminate a player

This does not undo the merge.

### FINAL_PHASE

Endgame mechanics such as:

* Final 5
* Final 4 firemaking
* Final Tribal Council

## Independent Dimensions

Several mechanics must be modeled independently.

### Tribe Structure

Fields required:

* originalTribeId
* currentTribeId
* mergeTribeId
* temporaryChallengeTeamId

Temporary challenge teams are not tribes.

### Merge Status

Possible states:

* NOT_MERGED
* MERGE_PENDING
* EARNED_MERGE
* FULLY_MERGED

### Vote Eligibility

Players may:

* be immune
* be vulnerable
* be unable to vote
* be excluded from a voting group

Fields suggested:

* canReceiveVotes
* canCastVote
* hasTemporaryImmunity
* hasPostVoteProtection

### Jury Status

Merge and jury start are separate concepts.

Data fields:

* juryActive
* becameJurorEpisodeId
* juryStartPlacement

## Merge Formats

### Classic Merge

* tribes combine
* everyone votes together
* individual immunity begins

### Earn the Merge

Common modern format:

1. tribes dissolve
2. players compete in a team challenge
3. winning players gain immunity
4. losing players are vulnerable
5. one player is eliminated
6. full merge follows

### Delayed Merge

The show visually merges tribes but restricts voting for one episode.

### Split Tribal After Merge

Players are randomly divided into two voting groups.

Key rule: voting groups are not tribes.

## League Rule Configurations

Different leagues may interpret merge differently.

Merge definition options:

* FULLY_MERGED_ONLY
* SHOW_DECLARED_MERGE
* EARNED_MERGE_COUNTS
* MERGE_EPISODE_COUNTS

Immunity scoring configuration:

* teamMergeChallengeCountsAsImmunity
* teamMergeChallengeCountsAsChallengeWin
* splitTribalImmunityCountsIndividually

Vote scoring configuration:

* scopeToVotingGroup
* countNoVoteAsIncorrect
* countShotInTheDarkSafeAsSpecialCase

## Example Data Structures

Game phase:

```
type GamePhase =
  | "PRE_MERGE"
  | "MERGE_TRANSITION"
  | "MERGED"
  | "POST_MERGE_SPLIT_TRIBAL"
  | "FINAL_PHASE"
```

Merge status:

```
type MergeStatus =
  | "NOT_MERGED"
  | "MERGE_PENDING"
  | "EARNED_MERGE"
  | "FULLY_MERGED"
```

Episode voting context:

```
type EpisodeVoteContext = {
  episodeId: string
  phase: GamePhase
  mergedTribeId?: string
  votingGroups: VotingGroup[]
  juryActive: boolean
}
```

Voting group:

```
type VotingGroup = {
  id: string
  memberPlayerIds: string[]
  vulnerablePlayerIds: string[]
  immunePlayerIds: string[]
  eligibleVoterIds: string[]
}
```

Player season state:

```
type PlayerSeasonState = {
  playerId: string
  originalTribeId: string
  currentTribeId?: string
  mergeStatus: MergeStatus
  madeMerge: boolean
  madeJury: boolean
  eliminatedAtPlacement?: number
}
```

Note: `madeMerge` should be derived from league rules rather than hardcoded.

## Edge Cases

The system must handle:

* uneven merge challenge teams
* idol expiration rules
* medical evacuations
* voluntary quits
* tribe renaming after merge
* double eliminations

## UI Guidance

Episode displays should include:

* game phase
* tribe structure
* voting groups
* immune players
* vulnerable players
* jury status
* league merge interpretation

Example:

Episode 6

Show Phase: Earn the Merge
Living Arrangement: One Camp
Voting Format: Losing Team Vulnerable
Jury Active: No

League Interpretation:
Merge Episode: Yes
Full Merge: No

## Final Guidance

The merge should be modeled using **phases, voting pools, and player states** rather than simple episode assumptions.

A flexible phase-based model will support both historical seasons and future gameplay twists.
