# Survivor Fantasy League - Roadmap

## ✅ Completed Features

### Core Functionality
- User authentication & team management (Clerk)
- Draft system with snake order
- Event submission & approval workflow (standalone + GameEvents)
- Scoring calculation from approved events
- Leaderboard with weekly breakdowns
- Admin dashboard & user management
- PWA support with offline capabilities
- Simulation engine for strategy analysis

### Season Setup
- Contestant management
- Episode tracking
- Tribe system with memberships
- Season readiness checks

### Tribe Swap ✅
- **Tribe membership timeline tracking** (`fromWeek`, `toWeek`)
- **Bulk tribe membership creation** (`/api/tribe-memberships/bulk/`)
- **Admin UI for managing swaps** (`/admin/tribes/`)
- **Leaderboard shows current tribes** (dynamic based on week)
- **Event forms filter contestants by current tribe** (Challenge events)

---

## 📋 To Do: Merge Features

### 1. Merge Flag & Detection
- [ ] Add `isMerge` boolean to `Tribe` model (already in schema, verify implementation)
- [ ] Create/identify the merge tribe in the database
- [ ] Admin UI to mark a tribe as the merge tribe
- [ ] Utility functions to detect merge week (first week where all remaining contestants are in merge tribe)

### 2. Individual Immunity (Post-Merge)
- [ ] Update `INDIVIDUAL_IMMUNITY_WIN` event to work post-merge
  - Currently tied to tribal challenge winners
  - Need standalone individual immunity tracking
- [ ] Admin form to assign individual immunity winner (single contestant)
- [ ] Validation: only one winner per week post-merge

### 3. Reward Challenges (Post-Merge)
- [ ] Support multi-winner reward challenges
- [ ] Admin form to select multiple contestants for reward wins
- [ ] `REWARD_CHALLENGE_WIN` scoring (3 points per winner)

### 4. Fire-Making Challenge
- [ ] `FIRE_MAKING_WIN` event type (already in schema)
- [ ] Admin form for fire-making challenge outcome
- [ ] 5 point reward for winner
- [ ] Track as part of finale week

### 5. Jury & Finale Events
- [ ] `MADE_JURY` event (5 points) - auto-assign when contestant voted out post-merge?
- [ ] `FINALIST` event (10 points) - manual assignment for final 2/3
- [ ] `WINNER` event (20 points) - manual assignment
- [ ] Admin UI for finale outcome submission

### 6. UI Updates
- [ ] Leaderboard: indicate merge tribe differently (e.g., gold color, "Merged Tribe" label)
- [ ] Contestant cards: show "Jury Member" badge if eliminated post-merge
- [ ] Event submission: show/hide challenge types based on pre/post merge
  - Pre-merge: Team challenges, tribal immunity
  - Post-merge: Individual immunity, reward challenges
- [ ] Weekly recap: highlight merge week

### 7. Validation & Business Logic
- [ ] Prevent team challenge events after merge week
- [ ] Prevent individual immunity before merge week (unless explicitly allowed)
- [ ] Auto-populate `MADE_JURY` when contestant eliminated after merge starts?
- [ ] Validate finale events (only 1 winner, 2-3 finalists)

### 8. Admin Workflow Improvements
- [ ] Merge setup wizard (similar to season setup)
  - Select merge tribe
  - Set merge week (auto-detected or manual)
  - Bulk assign remaining contestants to merge tribe
- [ ] Finale event form (consolidated)
  - Fire-making results
  - Finalists selection
  - Winner declaration

---

## Future Enhancements (Post-Season 50)

### Season 51+ Support
- [ ] Multi-season support in database
- [ ] Season archive & history view
- [ ] Carryover leagues (keeper/dynasty format)

### Engagement Features
- [ ] Live scoring updates during episodes
- [ ] Push notifications for major events
- [ ] Team trash talk / comments
- [ ] Weekly prediction game (bonus points)

### Analytics
- [ ] Historical player performance across seasons
- [ ] Draft value analysis (ADP vs actual points)
- [ ] Trade/waiver system

### Technical Debt
- [ ] Comprehensive E2E test coverage for merge scenarios
- [ ] Performance optimization for large event datasets
- [ ] Mobile app (React Native or Capacitor)

---

## Notes

- **Tribe Swap is fully functional** as of March 2026
- Merge features should be prioritized based on season timeline
- Fire-making and finale events are low-priority until final episodes
- Consider batch operations for jury member assignment (all post-merge eliminations)
