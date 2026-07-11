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

/* ---------------------------------- Forum (localStorage) ------------------ */
const FORUM_KEY = 'whowins2029_forum_entries';

function initForum(){
  const form = document.getElementById('forumForm');
  if (!form) return;
  renderComments();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('cName');
    const bodyEl = document.getElementById('cBody');
    const anonEl = document.getElementById('cAnon');
    const status = document.getElementById('formStatus');

    const body = bodyEl.value.trim();
    if (!body){
      status.textContent = 'Write something before posting.';
      status.className = 'form-status err';
      return;
    }

    const rawName = nameEl.value.trim();
    const name = (anonEl.checked || !rawName) ? 'Anonymous' : sanitize(rawName);

    const entry = {
      name,
      body: sanitize(body),
      time: new Date().toISOString()
    };

    const entries = loadEntries();
    entries.unshift(entry);
    saveEntries(entries);

    bodyEl.value = '';
    nameEl.value = '';
    anonEl.checked = false;
    status.textContent = 'Posted — visible on this device.';
    status.className = 'form-status ok';
    renderComments();
  });
}

function sanitize(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function loadEntries(){
  try{
    return JSON.parse(localStorage.getItem(FORUM_KEY)) || [];
  } catch(e){
    return [];
  }
}

function saveEntries(entries){
  localStorage.setItem(FORUM_KEY, JSON.stringify(entries));
}

function renderComments(){
  const list = document.getElementById('commentList');
  const countEl = document.getElementById('forumCount');
  if (!list) return;
  const entries = loadEntries();
  countEl.textContent = entries.length + (entries.length === 1 ? ' entry' : ' entries');

  if (!entries.length){
    list.innerHTML = '<div class="comment-empty">No entries yet on this device — be the first.</div>';
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
