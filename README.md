# WhoWins2029 — Election Bulletin

A static blog presenting the WhoWins2029 election-prediction project: the
three baseline forecasts (2014→2019, 2019→2024, 2024→2029), the voter
turnout chart, and a short read of the 2026 political and economic
landscape, plus an open comments section.

## Files

```
index.html        the page
styles.css        design system
script.js         tabs, ticker, turnout chart, comments
images/           cropped screenshots from the running Shiny app
README.md         this file
```

## Run it locally

No build step — it's plain HTML/CSS/JS. Just open `index.html` in a
browser, or serve it so relative paths behave normally:

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Netlify

**Option A — drag and drop (fastest):**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the whole `site` folder onto the page
3. Netlify gives you a live URL immediately

**Option B — via Git:**
1. Push this folder to a GitHub repo
2. In Netlify: **Add new site → Import an existing project**
3. Build command: leave blank · Publish directory: `.` (or `site` if it's a subfolder)
4. Deploy

Either way, no environment variables or build tools are required for the
site as shipped.

## Swapping in your exact data

- **Turnout chart** — `script.js` has `years` and `values` arrays near the
  top of `initTurnoutChart()`. These are read off the line chart in the
  screenshot; replace them with the exact year-wise averages from
  `election_data_features_filtered.csv` for accuracy.
- **Map images** — `images/predicted-2019.png`, `predicted-2024.png`,
  `predicted-2029.png` are cropped from your app screenshots. If you
  re-export cleaner PNGs from the Shiny app later (View → Export as Image,
  or a browser screenshot with dev tools open to hide the toolbar), just
  drop in replacements with the same filenames.

## The comments board — important limitation

As shipped, comments are stored in **`localStorage`**, which means:

- Entries only appear in the browser/device that posted them
- Nothing is shared between visitors — this is a personal notebook, not a
  public forum, until you add a backend
- Clearing browser data clears the entries

This was the deliberate default because it needs zero setup and works the
moment you deploy. If you want a genuinely shared, public comment board,
the fastest path is a free tier of **Supabase** (Postgres + REST API, no
server to run):

1. Create a free project at [supabase.com](https://supabase.com)
2. Create a table `comments` with columns: `id` (uuid, default
   `gen_random_uuid()`), `name` (text), `body` (text), `created_at`
   (timestamptz, default `now()`)
3. In **Table Editor → comments → RLS**, enable Row Level Security and add
   a policy allowing public `insert` and `select`
4. In `script.js`, replace `loadEntries` / `saveEntries` with calls to the
   Supabase REST endpoint using your project URL and anon key, e.g.:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

async function loadEntries(){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/comments?order=created_at.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return res.ok ? res.json() : [];
}

async function saveEntry(entry){
  await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ name: entry.name, body: entry.body })
  });
}
```

The anon key is meant to be public (it's restricted by your RLS policy),
so this is safe to ship in a static site. Budget ~20–30 minutes for this
upgrade including testing.

## Content notes

The "Current Political Landscape" section reflects the 2026 West Bengal
and Kerala assembly election results and mid-2026 IMF/World Bank economic
figures, each linked to its source. If you revisit this later, re-check
those figures — economic estimates in particular get revised.
