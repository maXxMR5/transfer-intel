'use strict';
let transfers=[],
    routes=[],
    clubs=[],
    sameWindowExchanges={relationships:[]},
    meta={};

let transferFilter="permanent";
const $=s=>document.querySelector(s);
const LEAGUE_ORDER=['Premier League','La Liga','Bundesliga','Serie A','Ligue 1'];
const LEAGUE_LABELS={'Premier League':'England — Premier League','La Liga':'Spain — La Liga','Bundesliga':'Germany — Bundesliga','Serie A':'Italy — Serie A','Ligue 1':'France — Ligue 1','Other clubs':'Other clubs'};
const normaliseLeague=x=>({'Laliga':'La Liga','LaLiga':'La Liga','Primera División':'La Liga'}[x]||x||'');
const money=n=>n?new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:1}).format(n):'—';
async function loadJson(name){for(const path of [`${name}.json`,`data/${name}.json`]){try{const response=await fetch(path,{cache:'no-store'});if(response.ok)return await response.json()}catch(error){}}throw new Error(`Could not load ${name}.json`)}
Promise.all(['transfers','routes','clubs','same_window_exchanges','meta'].map(loadJson)).then(([t,r,c,s,m])=>{transfers=t;routes=r;clubs=c;sameWindowExchanges=s;validateSameWindowData();meta=m;init()}).catch(showLoadError);

function validateSameWindowData(){
  const relationships=sameWindowExchanges?.relationships;
  if(!Array.isArray(relationships))throw new Error('same_window_exchanges.json has an invalid schema');
  const seen=new Set();
  for(const relationship of relationships){
    const pairKey=`${relationship.club_a}|${relationship.club_b}`;
    if(seen.has(pairKey))throw new Error(`Duplicate same-window relationship: ${pairKey}`);
    seen.add(pairKey);
    for(const exchange of relationship.same_window_exchanges||[]){
      if(!exchange.club_a_to_b?.length||!exchange.club_b_to_a?.length)throw new Error(`Invalid same-window exchange: ${pairKey} ${exchange.season} ${exchange.window}`);
    }
  }
  console.info(`TM-021A loaded: ${relationships.length.toLocaleString('en-GB')} relationships, ${Number(sameWindowExchanges.exchange_window_count||0).toLocaleString('en-GB')} same-window exchanges.`);
}

function showLoadError(error){console.error(error);$('#summary').innerHTML=`<div class="error"><strong>Data failed to load.</strong><br>${esc(error.message)}. Check that all JSON files are in the repository root.</div>`}
function init(){
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
  $('#summary').innerHTML=`<div class="card"><b>${fmt(meta.transfer_count)}</b><span>canonical movements</span></div><div class="card"><b>${fmt(meta.bidirectional_route_count)}</b><span>eligible routes</span></div><div class="card"><b>${fmt(meta.eligible_club_count||clubs.length)}</b><span>eligible clubs</span></div><div class="card"><b>5</b><span>major leagues</span></div><div class="card"><b>11</b><span>seasons</span></div>`;
  buildClubSelectors();
  $('#showRoute').onclick=()=>showPair($('#clubA').value,$('#clubB').value);
  document
    .querySelectorAll('.filter-btn')
    .forEach(btn=>{

        btn.addEventListener("click", () => {

            document
                .querySelectorAll('.filter-btn')
                .forEach(x=>x.classList.remove('active'));

            btn.classList.add('active');

            transferFilter=btn.dataset.filter;

            const a=$('#clubA').value;
            const b=$('#clubB').value;

            if(a && b)
                showPair(a,b,false);

        });

    });
  LEAGUE_ORDER.forEach(l=>$('#routeLeague').insertAdjacentHTML('beforeend',`<option value="${esc(l)}">${esc(l)}</option>`));
  $('#routeSearch').oninput=renderRoutes;$('#routeLeague').onchange=renderRoutes;
  renderRoutes();renderLeagues();
  $('#metaText').textContent=`Dataset: ${meta.seasons}; ${fmt(meta.transfer_count)} canonical movements; ${fmt(meta.bidirectional_route_count)} eligible bidirectional routes. Last updated ${meta.last_updated||'—'}.`;
  const q=new URLSearchParams(location.search);if(q.get('a')&&q.get('b')){$('#clubA').value=q.get('a');$('#clubB').value=q.get('b');showPair(q.get('a'),q.get('b'),false)}
}
function activateTab(id){document.querySelectorAll('.tabs button,.panel').forEach(x=>x.classList.remove('active'));document.querySelector(`[data-tab="${id}"]`).classList.add('active');$('#'+id).classList.add('active')}
function buildClubSelectors(){
  const memberships=new Map();
  for(const t of transfers){for(const [club,league] of [[t.from_club,normaliseLeague(t.from_big5_league)],[t.to_club,normaliseLeague(t.to_big5_league)]]){if(!club||!league)continue;if(!memberships.has(club))memberships.set(club,new Set());memberships.get(club).add(league)}}
  const groups=Object.fromEntries([...LEAGUE_ORDER,'Other clubs'].map(x=>[x,[]]));
  for(const club of clubs){const ls=memberships.get(club)||new Set();const group=LEAGUE_ORDER.find(x=>ls.has(x))||'Other clubs';groups[group].push(club)}
  const html=['<option value="">Select club</option>',...[...LEAGUE_ORDER,'Other clubs'].map(group=>groups[group].length?`<optgroup label="${esc(LEAGUE_LABELS[group])}">${groups[group].sort((a,b)=>a.localeCompare(b)).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</optgroup>`:'')].join('');
  $('#clubA').innerHTML=html;$('#clubB').innerHTML=html;
}
function renderRoutes(){
  const q=$('#routeSearch').value.trim().toLowerCase(),l=$('#routeLeague').value;
  const rr=routes.filter(r=>(!q||`${r.club_a} ${r.club_b}`.toLowerCase().includes(q))&&(!l||r.leagues.map(normaliseLeague).includes(l)));
  $('#resultCount').textContent=`${fmt(rr.length)} routes`;
  $('#routeRows').innerHTML=rr.slice(0,500).map(r=>`<tr class="clickable" data-a="${esc(r.club_a)}" data-b="${esc(r.club_b)}"><td>${r.rank}</td><td><b>${esc(r.club_a)} ↔ ${esc(r.club_b)}</b></td><td><b>${r.total}</b></td><td>${r.a_to_b}</td><td>${r.b_to_a}</td><td>${r.unique_players}</td><td>${r.loans}</td><td>${r.balance_pct}%</td></tr>`).join('')||'<tr><td colspan="8">No routes match these filters.</td></tr>';
  $('#routeRows').querySelectorAll('tr[data-a]').forEach(row=>row.onclick=()=>showPair(row.dataset.a,row.dataset.b));
}
function showPair(a,b,scroll=true){

    const msg = $('#routeMessage');

    msg.hidden = true;


    if(!a || !b){
        msg.textContent = 'Choose two clubs to view a relationship.';
        msg.hidden = false;
        return;
    }

    if(a===b){
        msg.textContent='Choose two different clubs.';
        msg.hidden=false;
        return;
    }

    const rr = transfers
        .filter(t =>
            (t.from_club===a && t.to_club===b) ||
            (t.from_club===b && t.to_club===a)
        )
        .sort(sortTransfers);

    const route = routes.find(r =>
        (r.club_a===a && r.club_b===b) ||
        (r.club_a===b && r.club_b===a)
    );

    if(!route){
    msg.textContent =
        'This pair does not have eligible movements in both directions.';
    msg.hidden=false;
        $('#routeView').innerHTML='';
    return;
}

    history.replaceState(
        null,
        '',
        `?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`
    );

    const exchangeRelationship =
        findSameWindowRelationship(a,b);

    const exchangeSection =
        renderSameWindowExchanges(
            exchangeRelationship,
            a,
            b
        );
 
    const firstSeason =
        rr.at(-1)?.season_label || '—';

    const latestSeason =
        rr[0]?.season_label || '—';

const filteredTransfers =
    getFilteredTransfers(rr);

const permanentTransfers =
    filteredTransfers.filter(t=>!t.is_loan).length;

const loanTransfers =
    filteredTransfers.filter(t=>t.is_loan).length;
      const relationshipSummary = `
        <h2 class="route-title">${esc(a)} ↔ ${esc(b)}</h2>

        <div class="cards">

            <div class="card">
                <b>${route.total}</b>
                <span>Total movements</span>
            </div>

            <div class="card">
                <b>${route.unique_players}</b>
                <span>Unique players</span>
            </div>

            <div class="card">
                <b>${permanentTransfers}</b>
                <span>Permanent</span>
            </div>

            <div class="card">
                <b>${loanTransfers}</b>
                <span>Loans</span>
            </div>

            <div class="card">
                <b>${route.balance_pct}%</b>
                <span>Balance</span>
            </div>

            <div class="card">
                <b>${firstSeason}–${latestSeason}</b>
                <span>Relationship span</span>
            </div>

        </div>

        <p class="direction">
            ${esc(route.club_a)} → ${esc(route.club_b)}:
            ${route.a_to_b}

            &nbsp;&nbsp;·&nbsp;&nbsp;

            ${esc(route.club_b)} → ${esc(route.club_a)}:
            ${route.b_to_a}
        </p>
    `;

    const transferTable = renderTransferTable(rr);

    $('#routeView').innerHTML =

        relationshipSummary +

        exchangeSection +

        transferTable;

    if(scroll){

        $('#routeView').scrollIntoView({

            behavior:'smooth',

            block:'start'

        });

    }
}

function findSameWindowRelationship(a,b){
  return sameWindowExchanges.relationships.find(r=>(r.club_a===a&&r.club_b===b)||(r.club_a===b&&r.club_b===a))||null;
}
function renderSameWindowExchanges(relationship,selectedA,selectedB){
  const exchanges=relationship?.same_window_exchanges||[];
  if(!exchanges.length)return `<section class="exchange-section"><div class="section-heading compact-heading"><div><p class="eyebrow">Same-window exchanges</p><h3>No qualifying window</h3></div><span class="count-badge">0</span></div><p class="note">These clubs have moved players in both directions overall, but not during the same season and transfer window.</p></section>`;
  const windows=exchanges.map((exchange,index)=>{
    const left=directionForSelection(exchange,selectedA,selectedB);
    return `<details class="exchange-card" ${index===0?'open':''}><summary><span><strong>${title(exchange.window)} ${esc(exchange.season)}</strong><small>${fmt(exchange.movement_count)} movements · ${fmt(exchange.loan_count)} loans</small></span><span class="expand-label">View players</span></summary><div class="exchange-directions">${renderExchangeDirection(selectedA,selectedB,left.a_to_b)}${renderExchangeDirection(selectedB,selectedA,left.b_to_a)}</div></details>`;
  }).join('');
  return `<section class="exchange-section"><div class="section-heading compact-heading"><div><p class="eyebrow">Same-window exchanges</p><h3>Players moved both ways in ${fmt(exchanges.length)} ${exchanges.length===1?'window':'windows'}</h3></div><span class="count-badge">${fmt(exchanges.length)}</span></div><p class="note">A window qualifies only when at least one player moved in each direction during the same season and transfer window.</p><div class="exchange-list">${windows}</div></section>`;
}
function directionForSelection(exchange,selectedA,selectedB){
  const canonicalAToB=exchange.club_a_to_b||[],canonicalBToA=exchange.club_b_to_a||[];
  if(canonicalAToB[0]?.from_club===selectedA||canonicalBToA[0]?.to_club===selectedB)return {a_to_b:canonicalAToB,b_to_a:canonicalBToA};
  return {a_to_b:canonicalBToA,b_to_a:canonicalAToB};
}
function renderExchangeDirection(fromClub,toClub,movements){
  return `<article class="exchange-direction"><h4>${esc(fromClub)} <span>→</span> ${esc(toClub)}</h4><ul>${movements.map(m=>`<li><div><b>${esc(m.player_name)}</b><span>${m.is_loan?'Loan':esc(labelType(m.transfer_type))}${m.age!=null?` · Age ${m.age}`:''}</span></div><strong class="money">${money(m.fee_eur)}</strong></li>`).join('')}</ul></article>`;
}
 function renderTransferTable(rr){
   const filtered = getFilteredTransfers(rr);

    return `
        <section class="route-transfers">

            <div class="section-heading compact-heading">

                <div>

                    <p class="eyebrow">Full history</p>

                    <h3>All recorded movements</h3>

                </div>

                <span class="muted">
                    ${fmt(filtered.length)} transfers
                </span>

            </div>

            <div class="tablebox">

                <table>

                    <thead>

                        <tr>

                            <th>Season</th>

                            <th>Window</th>

                            <th>Player</th>

                            <th>Direction</th>

                            <th class="fee-col">Fee</th>

                            <th>Type</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${filtered.map(renderTransferRow).join('')}

                    </tbody>

                </table>

            </div>

        </section>
    `;

}
function getFilteredTransfers(rr){

    switch(transferFilter){

        case "permanent":

            return rr.filter(t=>!t.is_loan);

        case "permanent_loans":

            return rr.filter(t=>
                t.transfer_type!=="end_of_loan"
            );

        default:

            return rr;

    }

}
  function renderTransferRow(x){

    return `
        <tr>

            <td>${esc(x.season_label)}</td>

            <td>${title(x.window)}</td>

            <td>
                <strong>${esc(x.player_name)}</strong>
            </td>

            <td>
                ${esc(x.from_club)}
                →
                ${esc(x.to_club)}
            </td>

            <td class="money fee-col">
                ${formatTransferFee(x)}
            </td>

            <td>
                ${renderTransferBadge(x)}
            </td>

        </tr>
    `;

}
function renderTransferBadge(x){

    const type = (x.transfer_type || '').toLowerCase();

    if(type==="loan")
        return '<span class="pill loan">Loan</span>';

    if(type==="loan_with_option")
        return '<span class="pill loan-option">Loan + Option</span>';

    if(type==="loan_with_obligation")
        return '<span class="pill loan-obligation">Loan + Obligation</span>';

    if(type==="end_of_loan")
        return '<span class="pill end-loan">End of Loan</span>';

    return '<span class="pill permanent">Permanent</span>';

}
  function formatTransferFee(x){

    if(x.transfer_type==="loan")
        return "Loan";

    if((x.fee_status||'').toLowerCase()==="free")
        return "Free";

    if(x.fee_eur===null || x.fee_eur===undefined)
        return "Undisclosed";

    const value = Number(x.fee_eur);

    if(Number.isNaN(value))
        return "Undisclosed";

    if(value>=1000000)
        return `€${(value/1000000).toFixed(1)}m`;

    if(value>=1000)
        return `€${Math.round(value/1000)}k`;

    return `€${value}`;

}
function renderLeagues(){
  $('#leagueLists').innerHTML=LEAGUE_ORDER.map(l=>{const list=routes.filter(r=>r.leagues.map(normaliseLeague).includes(l)).slice(0,10);return `<section class="surface"><div class="section-heading"><h3>${esc(LEAGUE_LABELS[l])}</h3><span class="muted">${list.length} shown</span></div><div class="tablebox"><table><thead><tr><th>Rank</th><th>Route</th><th>Total</th><th>Both directions</th><th>Players</th><th>Loans</th></tr></thead><tbody>${list.map((r,i)=>`<tr class="clickable" data-a="${esc(r.club_a)}" data-b="${esc(r.club_b)}"><td>${i+1}</td><td><b>${esc(r.club_a)} ↔ ${esc(r.club_b)}</b></td><td>${r.total}</td><td>${r.a_to_b} / ${r.b_to_a}</td><td>${r.unique_players}</td><td>${r.loans}</td></tr>`).join('')||'<tr><td colspan="6">No eligible routes found.</td></tr>'}</tbody></table></div></section>`}).join('');
  $('#leagueLists').querySelectorAll('tr[data-a]').forEach(row=>row.onclick=()=>{activateTab('routes');showPair(row.dataset.a,row.dataset.b)});
}
function sortTransfers(a,b){const season=x=>Number(String(x.season_label).slice(0,4));return season(b)-season(a)||String(b.window).localeCompare(String(a.window))||String(a.player_name).localeCompare(String(b.player_name))}
function labelType(x){return x==='permanent_or_free'?'Permanent / free':String(x||'Transfer').replaceAll('_',' ')}
function title(x){return String(x||'—').replace(/^./,c=>c.toUpperCase())}
function fmt(n){return Number(n||0).toLocaleString('en-GB')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
