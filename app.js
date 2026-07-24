'use strict';

let transfers = [];
let routes = [];
let clubs = [];
let meta = {};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const countryOrder = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Other'];
const countryLabels = {
  England: 'England — Premier League',
  Spain: 'Spain — La Liga',
  Germany: 'Germany — Bundesliga',
  Italy: 'Italy — Serie A',
  France: 'France — Ligue 1',
  Other: 'Other clubs'
};

const money = value => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1
  }).format(Number(value));
};

async function loadJson(name) {
  for (const path of [`${name}.json`, `data/${name}.json`]) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (response.ok) return await response.json();
    } catch (_) { /* try fallback */ }
  }
  throw new Error(`Could not load ${name}.json`);
}

Promise.all(['transfers', 'routes', 'clubs', 'meta'].map(loadJson))
  .then(([t, r, c, m]) => {
    transfers = t;
    routes = r;
    clubs = c;
    meta = m;
    validatePayload();
    init();
  })
  .catch(error => {
    console.error(error);
    $('#loading').classList.add('hidden');
    $('#routeView').innerHTML = `<div class="error card"><h2>Data failed to load</h2><p>${esc(error.message)}. Check that the JSON files are beside index.html in the repository.</p></div>`;
  });

function validatePayload() {
  if (!Array.isArray(transfers) || !Array.isArray(routes) || !Array.isArray(clubs)) throw new Error('Unexpected data format');
  const forbidden = /^(without club|retired|career break|unknown|free agent|no club|---)$/i;
  if (routes.some(r => forbidden.test(r.club_a) || forbidden.test(r.club_b))) throw new Error('A non-club entity was found in route rankings');
  if (routes.some(r => r.total !== r.a_to_b + r.b_to_a)) throw new Error('A route total failed reconciliation');
}

function init() {
  $('#loading').classList.add('hidden');
  setupTabs();
  renderSummary();
  renderClubSelects();
  populateLeagueFilter();
  bindEvents();
  renderRoutes();
  renderLeagues();
  $('#metaText').textContent = `${meta.seasons}; ${meta.transfer_count.toLocaleString('en-GB')} canonical movements; ${meta.bidirectional_route_count.toLocaleString('en-GB')} eligible bidirectional routes; ${meta.eligible_club_count.toLocaleString('en-GB')} clubs in the route explorer. ${meta.excluded_non_club_route_count.toLocaleString('en-GB')} routes involving non-club states were removed from the rankings.`;

  const query = new URLSearchParams(location.search);
  if (query.get('a') && query.get('b')) {
    $('#clubA').value = query.get('a');
    $('#clubB').value = query.get('b');
    showPair(query.get('a'), query.get('b'), false);
  }
}

function setupTabs() {
  $$('.tabs button').forEach(button => {
    button.addEventListener('click', () => {
      $$('.tabs button, .panel').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      $(`#${button.dataset.tab}`).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderSummary() {
  const cards = [
    [meta.transfer_count, 'canonical movements'],
    [meta.bidirectional_route_count, 'bidirectional routes'],
    [meta.eligible_club_count, 'eligible clubs'],
    [5, 'Big Five leagues']
  ];
  $('#summary').innerHTML = cards.map(([value, label]) => `<div class="stat-card"><b>${Number(value).toLocaleString('en-GB')}</b><span>${label}</span></div>`).join('');
}

function renderClubSelects() {
  const grouped = Object.groupBy ? Object.groupBy(clubs, c => c.country) : clubs.reduce((acc, club) => {
    (acc[club.country] ||= []).push(club); return acc;
  }, {});
  const html = ['<option value="">Select a club</option>'];
  countryOrder.forEach(country => {
    const list = grouped[country] || [];
    if (!list.length) return;
    html.push(`<optgroup label="${esc(countryLabels[country])}">`);
    list.forEach(club => html.push(`<option value="${escAttr(club.name)}">${esc(club.name)}</option>`));
    html.push('</optgroup>');
  });
  $('#clubA').innerHTML = html.join('');
  $('#clubB').innerHTML = html.join('');
}

function populateLeagueFilter() {
  meta.leagues.forEach(league => $('#routeLeague').insertAdjacentHTML('beforeend', `<option value="${escAttr(league)}">${esc(league)}</option>`));
}

function bindEvents() {
  $('#showRoute').addEventListener('click', () => showPair($('#clubA').value, $('#clubB').value));
  $('#routeSearch').addEventListener('input', renderRoutes);
  $('#routeLeague').addEventListener('change', renderRoutes);
}

function renderRoutes() {
  const query = $('#routeSearch').value.trim().toLowerCase();
  const league = $('#routeLeague').value;
  const filtered = routes.filter(route => {
    const matchesSearch = !query || `${route.club_a} ${route.club_b}`.toLowerCase().includes(query);
    const matchesLeague = !league || route.leagues.includes(league);
    return matchesSearch && matchesLeague;
  });

  $('#routeCount').textContent = `${filtered.length.toLocaleString('en-GB')} route${filtered.length === 1 ? '' : 's'} found`;
  $('#routeRows').innerHTML = filtered.slice(0, 500).map(route => `
    <tr class="clickable" data-a="${escAttr(route.club_a)}" data-b="${escAttr(route.club_b)}" tabindex="0">
      <td><span class="rank">${route.rank}</span></td>
      <td><strong>${esc(route.club_a)}</strong><span class="route-arrow">↔</span><strong>${esc(route.club_b)}</strong></td>
      <td><b>${route.total}</b></td><td>${route.a_to_b} / ${route.b_to_a}</td><td>${route.unique_players}</td><td>${route.loans}</td><td>${route.balance_pct}%</td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty">No routes match those filters.</td></tr>';

  $$('#routeRows tr.clickable').forEach(row => {
    const open = () => showPair(row.dataset.a, row.dataset.b);
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') open(); });
  });
}

function showPair(a, b, scroll = true) {
  $('#pickerMessage').textContent = '';
  if (!a || !b) { $('#pickerMessage').textContent = 'Choose two clubs to view a route.'; return; }
  if (a === b) { $('#pickerMessage').textContent = 'Choose two different clubs.'; return; }

  const route = routes.find(r => (r.club_a === a && r.club_b === b) || (r.club_a === b && r.club_b === a));
  if (!route) {
    $('#routeView').innerHTML = `<div class="empty-state card"><h3>No bidirectional route found</h3><p>The dataset does not contain at least one movement in each direction between ${esc(a)} and ${esc(b)}.</p></div>`;
    return;
  }

  const rows = transfers
    .filter(t => (t.from_club === a && t.to_club === b) || (t.from_club === b && t.to_club === a))
    .sort((x, y) => seasonIndex(y.season_label) - seasonIndex(x.season_label));
  const firstSeason = rows[rows.length - 1]?.season_label || '—';
  const latestSeason = rows[0]?.season_label || '—';
  const permanent = route.total - route.loans;
  const aToB = rows.filter(t => t.from_club === a && t.to_club === b).length;
  const bToA = rows.filter(t => t.from_club === b && t.to_club === a).length;

  history.replaceState(null, '', `?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  $('#clubA').value = a; $('#clubB').value = b;
  $('#routeView').innerHTML = `
    <article class="route-detail">
      <div class="route-header"><span class="kicker">Route detail</span><h2>${esc(a)} <span>↔</span> ${esc(b)}</h2><p>${esc(a)} → ${esc(b)}: <strong>${aToB}</strong> &nbsp;·&nbsp; ${esc(b)} → ${esc(a)}: <strong>${bToA}</strong></p></div>
      <div class="cards route-stats">
        <div class="card"><b>${route.total}</b><span>movements</span></div>
        <div class="card"><b>${route.unique_players}</b><span>unique players</span></div>
        <div class="card"><b>${permanent}</b><span>non-loans</span></div>
        <div class="card"><b>${route.loans}</b><span>loans</span></div>
        <div class="card"><b>${route.balance_pct}%</b><span>directional balance</span></div>
        <div class="card"><b>${firstSeason}–${latestSeason}</b><span>activity span</span></div>
      </div>
      <div class="tablebox transfer-table"><table><thead><tr><th>Season</th><th>Window</th><th>Player</th><th>Direction</th><th>Type</th><th>Fee</th><th>Age</th><th>Confidence</th></tr></thead><tbody>
        ${rows.map(t => `<tr><td>${esc(t.season_label)}</td><td class="capitalize">${esc(t.window)}</td><td><strong>${esc(t.player_name)}</strong></td><td>${esc(t.from_club)} <span class="route-arrow">→</span> ${esc(t.to_club)}</td><td><span class="pill ${t.is_loan ? 'loan' : 'permanent'}">${t.is_loan ? 'Loan' : 'Non-loan'}</span></td><td class="money">${money(t.fee_eur)}</td><td>${t.age ?? '—'}</td><td><span class="confidence">${friendlyConfidence(t.fee_status)}</span></td></tr>`).join('')}
      </tbody></table></div>
    </article>`;
  if (scroll) $('#routeView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderLeagues() {
  $('#leagueLists').innerHTML = meta.leagues.map(league => {
    const top = routes.filter(r => r.leagues.includes(league)).slice(0, 10);
    return `<article class="league-block"><h3>${esc(league)}</h3><div class="tablebox"><table><thead><tr><th>Rank</th><th>Route</th><th>Total</th><th>Split</th><th>Players</th><th>Loans</th></tr></thead><tbody>${top.map((r, index) => `<tr class="clickable league-route" data-a="${escAttr(r.club_a)}" data-b="${escAttr(r.club_b)}"><td>${index + 1}</td><td><strong>${esc(r.club_a)}</strong> ↔ <strong>${esc(r.club_b)}</strong></td><td>${r.total}</td><td>${r.a_to_b} / ${r.b_to_a}</td><td>${r.unique_players}</td><td>${r.loans}</td></tr>`).join('')}</tbody></table></div></article>`;
  }).join('');
  $$('.league-route').forEach(row => row.addEventListener('click', () => {
    document.querySelector('[data-tab="routes"]').click();
    showPair(row.dataset.a, row.dataset.b);
  }));
}

function seasonIndex(label) { const year = Number(String(label).slice(0, 4)); return Number.isFinite(year) ? year : 0; }
function friendlyConfidence(status) {
  return ({ reported_positive: 'Reported', reported_zero: 'Reported zero', undisclosed_or_missing: 'Undisclosed' })[status] || String(status || 'Unknown').replaceAll('_', ' ');
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function escAttr(value) { return esc(value); }
