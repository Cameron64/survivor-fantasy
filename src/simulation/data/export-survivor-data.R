# export-survivor-data.R
# One-time script to export survivoR package data to JSON files.
#
# Usage:
#   Rscript src/simulation/data/export-survivor-data.R
#
# Prerequisites:
#   install.packages("survivoR")
#   install.packages("jsonlite")

library(survivoR)
library(jsonlite)

out_dir <- file.path("data", "survivor-raw")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

cat("Exporting survivoR data to", out_dir, "\n")

# --- Helper: filter to US seasons only ---
us_seasons <- season_summary$season[season_summary$version == "US"]
cat("Found", length(us_seasons), "US seasons\n")

# 1. Vote history
cat("Exporting vote_history...")
vh <- vote_history[vote_history$version == "US", ]
write_json(vh, file.path(out_dir, "vote_history.json"), pretty = FALSE, auto_unbox = TRUE)
cat(" done (", nrow(vh), "rows)\n")

# 2. Challenge results
cat("Exporting challenge_results...")
cr <- challenge_results[challenge_results$version == "US", ]
write_json(cr, file.path(out_dir, "challenge_results.json"), pretty = FALSE, auto_unbox = TRUE)
cat(" done (", nrow(cr), "rows)\n")

# 3. Advantage movement - join advantage_type from advantage_details
cat("Exporting advantage_movement...")
am <- advantage_movement[advantage_movement$version == "US", ]
ad <- advantage_details[advantage_details$version == "US", c("advantage_id", "advantage_type")]
am <- merge(am, ad, by = "advantage_id", all.x = TRUE)
write_json(am, file.path(out_dir, "advantage_movement.json"), pretty = FALSE, auto_unbox = TRUE)
cat(" done (", nrow(am), "rows)\n")

# 4. Castaways - rename columns to match TypeScript types
cat("Exporting castaways...")
cw <- castaways[castaways$version == "US", ]
names(cw)[names(cw) == "original_tribe"] <- "tribe"
names(cw)[names(cw) == "place"] <- "placement"
write_json(cw, file.path(out_dir, "castaways.json"), pretty = FALSE, auto_unbox = TRUE)
cat(" done (", nrow(cw), "rows)\n")

# 5. Boot mapping - rename 'order' to 'boot_order'
cat("Exporting boot_mapping...")
bm <- boot_mapping[boot_mapping$version == "US", ]
names(bm)[names(bm) == "order"] <- "boot_order"
write_json(bm, file.path(out_dir, "boot_mapping.json"), pretty = FALSE, auto_unbox = TRUE)
cat(" done (", nrow(bm), "rows)\n")

# 6. Season summary - rename columns and compute num_episodes from episodes table
cat("Exporting season_summary...")
ss <- season_summary[season_summary$version == "US", ]
names(ss)[names(ss) == "n_cast"] <- "num_castaways"

# Compute num_episodes per season from episodes table
ep <- episodes[episodes$version == "US", ]
ep_counts <- aggregate(episode ~ season, data = ep, FUN = max)
names(ep_counts) <- c("season", "num_episodes")
ss <- merge(ss, ep_counts, by = "season", all.x = TRUE)
# Fallback: if no episode data, estimate from boot_mapping
ss$num_episodes[is.na(ss$num_episodes)] <- 14

write_json(ss, file.path(out_dir, "season_summary.json"), pretty = FALSE, auto_unbox = TRUE)
cat(" done (", nrow(ss), "rows)\n")

cat("\nAll exports complete. Files written to:", out_dir, "\n")
