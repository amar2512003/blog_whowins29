/* ==========================================================================
   WhoWins2029 — behavior
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTicker();
  initTabs();
  initTocSpy();
  initTurnoutChart();
  initForum();
});

/* ---------------------------------- Ticker: duplicate for seamless loop --- */
function initTicker(){
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  track.innerHTML += track.innerHTML; // duplicate content once for the 50% translate loop
}

/* ---------------------------------- Tabs ---------------------------------- */
function initTabs(){
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

/* ---------------------------------- TOC scroll-spy ------------------------ */
function initTocSpy(){
  const links = Array.from(document.querySelectorAll('.toc a'));
  if (!links.length) return;
  const sections = links.map(l => document.querySelector(l.getAttribute('href')));

  const setActive = () => {
    let current = sections[0];
    const y = window.scrollY + 140;
    sections.forEach(sec => { if (sec && sec.offsetTop <= y) current = sec; });
    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current.id));
  };
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
}

/* ---------------------------------- Turnout chart (no external deps) ------ */
function initTurnoutChart(){
  const canvas = document.getElementById('turnoutChart');
  if (!canvas) return;

  // Sample values read off the project's line chart — replace with the exact
  // year-wise averages from election_data_features_filtered.csv if they differ.
  const years  = [2004, 2009, 2014, 2019, 2024];
  const values = [10.0, 6.8, 3.7, 6.3, 6.1];

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth - 52; // minus card padding
  const cssHeight = 300;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 42, padR = 16, padT = 20, padB = 34;
  const plotW = cssWidth - padL - padR;
  const plotH = cssHeight - padT - padB;
  const maxV = Math.max(...values) * 1.15;
  const minV = 0;

  const xFor = i => padL + (i / (years.length - 1)) * plotW;
  const yFor = v => padT + plotH - ((v - minV) / (maxV - minV)) * plotH;

  // grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(233,230,218,0.45)';
  const gridSteps = 4;
  for (let g = 0; g <= gridSteps; g++){
    const v = (maxV / gridSteps) * g;
    const y = yFor(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cssWidth - padR, y);
    ctx.stroke();
    ctx.fillText(v.toFixed(1), 6, y + 4);
  }

  // x labels
  years.forEach((yr, i) => {
    ctx.fillStyle = 'rgba(233,230,218,0.6)';
    ctx.fillText(yr, xFor(i) - 12, cssHeight - 10);
  });

  // line
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = xFor(i), y = yFor(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // points
  values.forEach((v, i) => {
    const x = xFor(i), y = yFor(v);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#B23A2E';
    ctx.fill();
    ctx.strokeStyle = '#0E1220';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

/* ---------------------------------- Forum (Supabase backend) --------------
   Real shared storage: a Postgres table on Supabase's free tier, read and
   written over its REST API. One-time setup (~2 minutes, no credit card):

     1. Create a free project at https://supabase.com
     2. Open SQL Editor → New query → paste and run:

          create table comments (
            id uuid primary key default gen_random_uuid(),
            name text not null default 'Anonymous',
            body text not null check (char_length(body) <= 1000),
            created_at timestamptz not null default now()
          );

          alter table comments enable row level security;

          create policy "public can read comments"
            on comments for select using (true);

          create policy "public can post comments"
            on comments for insert with check (true);

     3. Go to Project Settings → API. Copy the "Project URL" and the
        "anon public" key (NOT the service_role key — that one must never
        ship in client code).
     4. Paste both into SUPABASE_URL / SUPABASE_ANON_KEY below, redeploy.

   The anon key is designed to be public — it can only do what your RLS
   policies above allow (read + insert), nothing else. Until both values
   are filled in, the board quietly falls back to this browser's
   localStorage only, so nothing is broken in the meantime. */

const SUPABASE_URL = 'https://rytbipfbyyifaatuzdkg.supabase.co';        // e.g. 'https://abcdemoproj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dGJpcGZieXlpZmFhdHV6ZGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MjkzMzMsImV4cCI6MjA5OTQwNTMzM30.b6C8XEK16lf988mits_2SFDoDHkrlj91bSIuMGWRVio';   // Settings → API → "anon public" key
const FORUM_KEY = 'whowins2029_forum_entries'; // local fallback only

function backendConfigured(){
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function initForum(){
  const form = document.getElementById('forumForm');
  if (!form) return;

  renderComments();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('cName');
    const bodyEl = document.getElementById('cBody');
    const anonEl = document.getElementById('cAnon');
    const status = document.getElementById('formStatus');
    const btn = form.querySelector('button[type=submit]');

    const body = bodyEl.value.trim();
    if (!body){
      status.textContent = 'Write something before posting.';
      status.className = 'form-status err';
      return;
    }

    const rawName = nameEl.value.trim();
    const name = (anonEl.checked || !rawName) ? 'Anonymous' : sanitize(rawName);
    const entry = { name, body: sanitize(body), time: new Date().toISOString() };

    btn.disabled = true;
    status.textContent = 'Posting…';
    status.className = 'form-status';

    const ok = await addEntry(entry);

    bodyEl.value = '';
    nameEl.value = '';
    anonEl.checked = false;
    btn.disabled = false;
    status.textContent = ok
      ? 'Posted — visible to everyone.'
      : (backendConfigured()
          ? 'Could not reach the shared board — saved locally instead.'
          : 'Posted — visible on this device only (no shared backend configured yet).');
    status.className = ok ? 'form-status ok' : 'form-status err';
    renderComments();
  });
}

function sanitize(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadEntries(){
  if (backendConfigured()){
    try{
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/comments?select=name,body,created_at&order=created_at.desc&limit=200`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (res.ok){
        const rows = await res.json();
        return rows.map(r => ({ name: r.name, body: r.body, time: r.created_at }));
      }
      console.warn('Supabase responded with an error, falling back to local entries.', res.status);
    } catch(e){
      console.warn('Supabase unreachable, falling back to local entries.', e);
    }
  }
  return loadLocalEntries();
}

async function addEntry(entry){
  if (backendConfigured()){
    try{
      const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ name: entry.name, body: entry.body })
      });
      if (res.ok) return true;
      console.warn('Supabase insert failed, saving locally instead.', res.status);
    } catch(e){
      console.warn('Could not reach Supabase, saving locally instead.', e);
    }
  }
  const local = loadLocalEntries();
  local.unshift(entry);
  saveLocalEntries(local);
  return false;
}

function loadLocalEntries(){
  try{ return JSON.parse(localStorage.getItem(FORUM_KEY)) || []; }
  catch(e){ return []; }
}
function saveLocalEntries(entries){
  localStorage.setItem(FORUM_KEY, JSON.stringify(entries));
}

async function renderComments(){
  const list = document.getElementById('commentList');
  const countEl = document.getElementById('forumCount');
  if (!list) return;
  const entries = await loadEntries();
  countEl.textContent = entries.length + (entries.length === 1 ? ' entry' : ' entries') +
    (backendConfigured() ? '' : ' (this device only)');

  if (!entries.length){
    list.innerHTML = '<div class="comment-empty">No entries yet — be the first.</div>';
    return;
  }

  list.innerHTML = entries.map(e => `
    <div class="comment">
      <div class="comment-head">
        <span class="comment-name">${e.name}</span>
        <span class="comment-time">${formatTime(e.time)}</span>
      </div>
      <div class="comment-body">${e.body}</div>
    </div>
  `).join('');
}

function formatTime(iso){
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }) + ' · ' +
         d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
}
