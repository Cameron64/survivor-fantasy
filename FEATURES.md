# Feature Requests

## 1. Player Pages

**Status:** Planned

### Summary
Clicking a player card in the Top Contestants section opens a detailed player page (or large modal) with comprehensive info about that contestant.

### Player Page (User-Facing)
- Basic player info (name, photo, bio — populated by admin)
- Week-by-week breakdown of events they've been involved in
- Draft pick number(s) and who drafted them
- Current tribe, elimination status

### Admin/Mod Player Management
- Corresponding admin page to edit player details
- Editable fields: picture, bio, and other profile info

### V2
- Previous season performance history

## 2. Merge Functionality

**Status:** Planned

### Summary
Ensure the tribe merge workflow works efficiently end-to-end — creating the merge tribe, moving all remaining contestants into it, and having that transition reflect correctly across the app (leaderboard, player pages, tribe displays, etc.).

## 3. Simplify Player Breakdowns

**Status:** Planned

### Summary
The player breakdown cards currently show a "Wk n" badge per event which isn't useful. Replace with a rollup across all weeks showing totals per scoring category. For detailed week-by-week info, users can navigate to the contestant page (Feature #1).

## 4. Public Team Breakdowns

**Status:** Planned

### Summary
Let any user view any other player's team breakdown — how their drafted contestants have accrued points over the weeks. Currently this view only exists for "My Team"; extend it so you can see the same breakdown for any player from the leaderboard.

## 5. Larger Contestant Tiles in Event Submission

**Status:** Done

### Summary
The contestant selection tiles in the event submission forms are too small — hard to identify faces at a glance under time pressure. Increase tile/avatar size so contestants are easily recognizable by photo rather than needing to read names.

## 6. Routed Event Submission Wizard

**Status:** Done

### Summary
The event submission wizard should use proper URL routing for each step so browser back/forward navigation works as expected. Currently the wizard is client-state driven — switching to routed steps lets users navigate naturally without losing context.

## 7. Tribal Council Breakdown

**Status:** Planned

### Summary
Add a view showing the full tribal council vote breakdown — who voted for whom each week. Currently there's no way to see voting details outside of the raw event data.

## 8. Tribe-Styled Team Challenge Drawers

**Status:** Planned

### Summary
Team reward/immunity challenge forms currently show contestants on a plain white background. Group contestants into tribe drawers styled with each tribe's color (similar to the tribal council drawers) so it's visually clear which tribe won/lost.

## 9. Tribes in Main Nav + Buff Image Upload

**Status:** Planned

### Summary
Add a Tribes section to the main navigation so users can browse tribes directly. Include the ability for admins to upload a buff image for each tribe.

## 10. Merge as a Game Event

**Status:** Planned

### Summary
Make the tribe merge a submittable game event through the normal event flow rather than a buried admin action. This makes the merge visible in the event timeline and consistent with how other game moments are recorded.

## 11. Draft Rehearsal + Admin Pick Override

**Status:** Planned

### Summary
Allow admins to run a practice/rehearsal draft before the real one. Also add the ability for an admin to make a draft pick on behalf of a user (e.g., if someone can't attend live).

## 12. Admin User Impersonation

**Status:** Planned

### Summary
Allow admins to view the app as another user — see their team, their dashboard, etc. Useful for debugging, support, and verifying the user experience without needing their credentials.

## 13. Advantage Find/Use Scoring

**Status:** Planned

### Summary
Add points for finding and using advantages (beyond idols). Needs new event types for advantage discovery and advantage play.

## 14. Event Metadata — Descriptions and Types

**Status:** Planned

### Summary
Allow additional metadata on certain events like idol finds — e.g., what kind of idol, valid until what point in the game. Gives richer context in the event timeline and contestant pages.

## 15. Meme/Moment of the Week Voting

**Status:** Planned

### Summary
Add a user interaction mechanic where players can vote on the best meme or moment of the week. Drives engagement between episodes and gives users something to do beyond just watching scores update.

## 16. Point Betting / Predictions

**Status:** Planned

### Summary
Let users wager points on predictions — who's going home next week, podium placements, etc. Adds a risk/reward layer on top of the draft-based scoring. Correct predictions earn bonus points, wrong bets lose the wagered amount.

## 17. In-App Chat

**Status:** Planned

### Summary
Add a chat feature so league members can trash talk, react to episodes, and discuss the game without leaving the app.

## 18. In-App Roadmap / Feature List

**Status:** Planned

### Summary
A read-only page in the app where users can see the list of planned features and what's coming next. Keeps the league engaged and sets expectations.

## 19. In-App Feature Request Submission

**Status:** Planned

### Summary
Let users submit feature requests directly in the app. Pairs with the roadmap page (#18) — users can see what's planned and suggest what's missing.

## 20. Context-Aware Challenge Mode

**Status:** Planned

### Summary
Dynamically determine whether challenges are team-based or individual based on merge status. Pre-merge defaults to team; post-merge defaults to individual. Applies to immunity, reward, and other event types — removes the manual toggle and reduces input errors during live scoring.
