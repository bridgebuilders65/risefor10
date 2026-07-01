# RiseFor10 / RiseFor65 — Deploy Guide

## What this is
A single-page site with three sections:
1. **RiseFor10** — the ongoing movement, with a live participation counter
2. **RiseFor65** — the historical proof (63 doctors, static map data) + a live overlay of new RiseFor10 sign-ups
3. **About the Mission** — Sadhu Vaswani Mission legacy + Didi's quote

The live counter and live map pins pull from your Google Sheet (the one connected
to the Google Form) via a small serverless function — no manual updates needed.

## Files
```
risefor10/
├── index.html              ← the page
├── styles.css               ← all styles
├── data.js                  ← embedded map + doctor data (static, RiseFor65)
├── app.js                   ← map rendering, video, live polling
├── netlify.toml              ← routes /api/participation → the function
└── netlify/
    └── functions/
        └── participation.js  ← fetches the Google Sheet, returns live JSON
```

## How the live connection works
- Your Google Form writes to the linked Google Sheet automatically (already set up)
- The Sheet is shared "Anyone with the link can view" — already done
- `participation.js` fetches that Sheet as CSV (Google's public `gviz/tq` export endpoint — no API key needed)
- It parses each row using your known field order: Timestamp, Name, Email, Institute, City/Country, Specialty, Contribution, Patient Stories, Media, Phone
- It groups entries by country (matched against a list of common country names/aliases) and returns JSON
- The page polls `/api/participation` every 20 seconds and updates:
  - The counter in the RiseFor10 hero
  - The "Joining via RiseFor10" live number next to the map
  - Green pulsing pins on the map for any country with new sign-ups

## Deploy steps (GitHub + Netlify)

### 1. Create a GitHub repo
- Go to github.com → New repository → name it (e.g. `risefor10`)
- Don't initialize with a README (you already have one)

### 2. Push these files
From this folder, in a terminal:
```bash
git init
git add .
git commit -m "RiseFor10 launch"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/risefor10.git
git push -u origin main
```
(Replace `YOUR_USERNAME` with your GitHub username.)

If you don't use git from the command line, you can also just drag-and-drop
all the files into a new repo using GitHub's web uploader (github.com → your
repo → "Add file" → "Upload files"). Make sure the folder structure is
preserved (the `netlify/functions/participation.js` path matters).

### 3. Connect to Netlify
- Go to app.netlify.com → "Add new site" → "Import an existing project"
- Choose GitHub, authorize if needed, select your `risefor10` repo
- Netlify will auto-detect `netlify.toml` — build settings are already correct
- Click "Deploy site"

### 4. That's it
Netlify automatically builds and runs the function. No environment variables,
no API keys, no GitHub Actions needed — the Sheet is public-read, so the
function just fetches it directly at request time.

Your live site URL will be something like `https://risefor10-xyz.netlify.app`.
You can set a custom domain or rename the site under Site Settings.

## Updating the RiseFor65 historical data
RiseFor65 (the 63 doctors, the map's purple countries) is static and lives in
`data.js`. If you want to add or correct entries there, edit the `DOCTORS`
array directly and redeploy (push to GitHub — Netlify auto-redeploys on push).

## Notes
- The video (YouTube) and Google Form links are already wired into the buttons
- If the Google Sheet's column order ever changes, update the `idx` mapping
  in `netlify/functions/participation.js` to match
- The live map pins use each country's first known RiseFor65 city as a
  reference point (so a new sign-up from "India" pins near Pune). For more
  precise pins, the function would need real lat/lng — out of scope for now
  since the form only collects free-text "City and Country"
