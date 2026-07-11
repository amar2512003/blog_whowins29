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

https://whowins2029.netlify.app/
