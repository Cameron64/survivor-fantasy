# Contestant Image Update Guide

## Quick Start

### Step 1: Extract Image URLs

For each contestant page, extract the direct image URL:

1. **Open the webpage** in your browser
2. **Right-click on the photo** you want
3. **Select "Copy Image Address"** (or "Copy Image URL")
4. **Paste it somewhere** to save it

### Step 2: Update the Script

Open `scripts/update-contestant-images.ts` and update the `IMAGE_UPDATES` object:

```typescript
const IMAGE_UPDATES: Record<string, string> = {
  'Coach': 'https://paste-coach-image-url-here.jpg',
  'Chrissy Hofbeck': 'https://paste-chrissy-image-url-here.jpg',
  'Christian': 'https://paste-christian-image-url-here.jpg',
  'Cirie Fields': 'https://paste-cirie-image-url-here.jpg',
  'Colby': 'https://paste-colby-image-url-here.jpg',
  'Genevieve Mushaluk': 'https://already-filled-in-for-you.jpg',
  'Rick': 'https://paste-rick-image-url-here.jpg',
}
```

### Step 3: Run the Script

```bash
cd "C:/Users/Cam Dowdle/source/repos/personal/survivor-fantasy"
npx tsx scripts/update-contestant-images.ts
```

---

## Links Reference

Here are the pages where you need to extract image URLs:

### Coach
- **Page:** https://www.instagram.com/p/DVBZI57FiBZ/
- **How to:** Right-click photo → Copy Image Address
- **Status:** ⏳ Need to extract

### Chrissy Hofbeck
- **Page:** https://www.hollywoodreporter.com/tv/tv-news/survivor-season-35-player-profile-meet-chrissy-hofbeck-1034972/
- **How to:** Right-click photo → Copy Image Address
- **Status:** ⏳ Need to extract

### Christian
- **Page:** https://parade.com/tv/christian-hubicki-survivor-50-interview
- **How to:** Right-click photo → Copy Image Address
- **Status:** ⏳ Need to extract

### Cirie Fields
- **Page:** https://ew.com/cirie-fields-says-survivor-50-is-her-swan-song-exclusive-11780877
- **How to:** Right-click photo → Copy Image Address
- **Status:** ⏳ Need to extract

### Colby
- **Page:** https://parade.com/tv/colby-donaldson-survivor-50-interview
- **How to:** Right-click photo → Copy Image Address
- **Status:** ⏳ Need to extract

### Genevieve Mushaluk
- **URL:** `https://s.yimg.com/ny/api/res/1.2/fzfPhCbuQO3om86FbhwpLQ--/YXBwaWQ9aGlnaGxhbmRlcjt3PTI0MDA7aD0zMzYwO2NmPXdlYnA-/https://media.zenfs.com/en/in_touch_weekly_336/430f99816ac3932f0ab903dfa1edc021`
- **Status:** ✅ Already extracted and in script

### Rick
- **Page:** https://www.reddit.com/r/survivor/s/ZRR9SRIf77
- **How to:** Right-click photo → Copy Image Address
- **Status:** ⏳ Need to extract

---

## Troubleshooting

### "Contestant not found"
The script tries both exact match and partial match. If it still doesn't find the contestant, check:
- Is the contestant in the database? (Check Admin → Contestants)
- Does the name in the script exactly match the database? (case-insensitive is supported)

### "Invalid image URL"
- Make sure you copied the **image URL**, not the page URL
- The URL should end in `.jpg`, `.png`, `.webp`, etc., or be a CDN URL
- If Instagram blocks the URL, you may need to download the image and upload it instead

### Alternative: Use the Admin UI
If the script doesn't work, you can manually update each contestant:
1. Go to **Admin → Contestants**
2. **Edit** the contestant
3. **Paste the image URL** in the Image Cropper
4. **Crop and zoom** as needed
5. **Save**

---

## After Running the Script

Once the script completes, you can:
1. Go to **Admin → Contestants** to verify the images loaded
2. Use the **"Re-crop Image"** button to adjust framing/zoom on each
3. Save your changes

The images will appear in the leaderboard, events, and everywhere else contestants are shown!
