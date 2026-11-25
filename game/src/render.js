// All DOM rendering: HUD, tickets, pot, bowl and counter buttons. The game
// state modules never touch the document; everything visual happens here.
import { BROTHS, TOPPINGS, brothById, toppingById, PLATING_SPOTS } from './config.js';
import { selectedOrder, elapsedRatio } from './game.js';

const el = (id) => document.getElementById(id);

export function buildCounterButtons(handlers) {
  const soupRow = el('soup-row');
  for (const broth of BROTHS) {
    const btn = document.createElement('button');
    btn.className = 'soup-btn'; btn.dataset.broth = broth.id;
    btn.innerHTML = `<div class="swatch" style="background:${broth.color}"></div><b>${broth.jp} ${broth.name}</b><span>${broth.blurb} · key ${broth.key.toUpperCase()}</span>`;
    btn.addEventListener('click', () => handlers.onBroth(broth.id));
    soupRow.appendChild(btn);
  }
  const grid = el('topping-grid');
  for (const topping of TOPPINGS) {
    const btn = document.createElement('button');
    btn.className = 'top-btn'; btn.dataset.topping = topping.id;
    btn.innerHTML = `<span class="chip top-${topping.id}">${topping.short}</span><b>${topping.name}</b><span class="count" data-count="${topping.id}">0</span>`;
    btn.addEventListener('click', () => handlers.onTopping(topping.id));
    grid.appendChild(btn);
  }
}

function ticketHtml(order) {
  const broth = brothById(order.broth);
  const items = order.toppings.map((id) => {
    const topping = toppingById(id);
    return `<li><span class="chip top-${id}" aria-hidden="true">${topping.short}</span>${topping.name}</li>`;
  }).join('');
  const pct = Math.max(0, Math.round((order.patienceLeft / order.patience) * 100));
  return `<h4><span>#${order.number} ${order.customer}</span><span>${Math.ceil(order.patienceLeft)}s</span></h4>
    <div class="ticket-order ticket-${broth.id}"><strong>${broth.name}</strong><span>Noodles: ${order.doneness.toUpperCase()}</span></div>
    <ul>${items}</ul>
    <div class="patience"><div style="width:${pct}%"></div></div>`;
}

function comboMultiplier(state) {
  return (1 + 0.15 * Math.min(state.combo, 6)).toFixed(2).replace(/0$/, '');
}

export function renderGame(state) {
  // The header button starts the stall before a shift, then becomes the
  // pause/resume control while a shift is on — it never offers "OPEN STALL"
  // in the middle of service.
  const startBtn = el('start-btn');
  const inShift = !state.over && (state.running || state.orders.length > 0);
  startBtn.textContent = inShift ? (state.paused ? '▶ RESUME' : '⏸ PAUSE') : '▶ OPEN STALL';

  // Big celebration pop over the bowl right after a perfect serve.
  const pop = el('perfect-pop');
  if (state.perfectBanner) {
    pop.classList.remove('hidden');
    pop.querySelector('.perfect-sub').textContent = `COMBO ×${comboMultiplier(state)} (${state.combo})`;
  } else {
    pop.classList.add('hidden');
  }

  el('shift-time').textContent = String(Math.ceil(state.timeLeft));
  el('shift-meter').style.width = `${(state.timeLeft / 90) * 100}%`;
  el('score').textContent = String(state.score);
  el('combo').textContent = `×${comboMultiplier(state)} (${state.combo})`;
  el('served').textContent = String(state.servedCount);
  el('rush-level').textContent = `RUSH LV ${1 + Math.floor(elapsedRatio(state) * 3.99)}`;

  // Tickets
  const tickets = el('tickets');
  const wanted = state.orders.slice(0, 3);
  while (tickets.children.length < 3) {
    const d = document.createElement('div'); d.className = 'ticket'; tickets.appendChild(d);
  }
  wanted.forEach((order, i) => {
    const node = tickets.children[i];
    node.className = `ticket${order.number === state.selectedOrderNumber ? ' selected' : ''}${order.patienceLeft < 10 ? ' urgent' : ''}`;
    node.dataset.order = String(order.number);
    node.innerHTML = ticketHtml(order);
  });
  for (let i = wanted.length; i < 3; i += 1) {
    tickets.children[i].className = 'ticket';
    tickets.children[i].innerHTML = '<div class="empty-note">— waiting for the next hungry night owl —</div>';
    delete tickets.children[i].dataset.order;
  }

  // Target line + bowl
  const target = selectedOrder(state);
  const activeBowl = state.kitchen.bowl;
  const preview = state.servedBowlPreview;
  const displayedOrder = preview ? state.lastServe.order : target;
  el('target-label').textContent = preview ? 'Last served' : 'Target';
  el('target-name').textContent = displayedOrder
    ? `#${displayedOrder.number} ${brothById(displayedOrder.broth).name} / ${displayedOrder.doneness}`
    : '—';
  el('serve-btn').classList.toggle('unready', state.over || !target || !activeBowl?.broth
    || !activeBowl.noodleDoneness || activeBowl.noodleDoneness === 'undercooked');
  const bowl = preview || activeBowl;
  const brothLayer = el('broth');
  brothLayer.className = bowl?.broth ? bowl.broth : '';
  el('bowl-steam').className = bowl?.broth ? 'on' : '';
  el('noodle-layer').className = bowl?.noodleDoneness ? 'on' : '';
  const layer = el('topping-layer');
  const toppingKey = bowl ? bowl.toppings.join(',') : '';
  if (layer.dataset.key !== toppingKey) {
    layer.dataset.key = toppingKey;
    layer.innerHTML = '';
    (bowl?.toppings || []).forEach((t, i) => {
      const spot = PLATING_SPOTS[i % PLATING_SPOTS.length];
      const piece = document.createElement('div');
      piece.className = `top-piece top-${t}`;
      piece.style.left = `${spot.left}%`; piece.style.top = `${spot.top}px`;
      piece.textContent = toppingById(t).short;
      layer.appendChild(piece);
    });
  }
  el('bowl-status').textContent = !bowl
    ? 'Take a fresh bowl to start.'
    : `Broth: ${bowl.broth ? brothById(bowl.broth).name : '—'} · Noodles: ${bowl.noodleDoneness || '—'} · Toppings: ${bowl.toppings.length}`;

  // Pot
  const pot = state.kitchen;
  el('pot').className = pot.potProgress !== null ? 'boiling' : '';
  const marker = el('boil-marker');
  if (pot.potProgress === null) {
    marker.style.left = '0%';
    el('boil-status').textContent = 'Pot is empty. Drop noodles!';
    el('noodle-btn').innerHTML = '🍜 DROP NOODLES <kbd>Space</kbd>';
  } else {
    marker.style.left = `calc(${Math.min(100, pot.potProgress * 100)}% - 3px)`;
    const pct = Math.floor(pot.potProgress * 100);
    el('boil-status').textContent = pot.potProgress < 0.3 ? `Boiling… ${pct}% — too firm still`
      : pot.potProgress < 0.45 ? `Boiling… ${pct}% — FIRM zone!`
      : pot.potProgress < 0.65 ? `Boiling… ${pct}% — REGULAR zone!`
      : pot.potProgress < 0.8 ? `Boiling… ${pct}% — SOFT zone!`
      : `Boiling… ${pct}% — SOGGY! Pull to clear the pot`;
    el('noodle-btn').innerHTML = '🥢 PULL NOODLES <kbd>Space</kbd>';
  }

  // Pass shelf
  const pass = el('pass-bowls');
  const passKey = state.kitchen.pass.map((p) => p.label).join('|');
  if (pass.dataset.key !== passKey) {
    pass.dataset.key = passKey;
    pass.innerHTML = state.kitchen.pass.map((p) =>
      `<div class="pass-bowl">
        <div class="mini-bowl" aria-hidden="true"><span class="mini-steam"></span>
          <div class="mini-broth" style="background-color:${brothById(p.broth).color}"></div>
        </div>
        <span>${p.label}</span>
      </div>`).join('')
      || '<div style="color:#8a7a55;font-size:12px;font-weight:700">Served bowls appear here, steaming.</div>';
  }

  // Soup active state + topping counts
  document.querySelectorAll('.soup-btn').forEach((b) => b.classList.toggle('active', bowl?.broth === b.dataset.broth));
  for (const t of TOPPINGS) {
    const counter = document.querySelector(`[data-count="${t.id}"]`);
    if (counter) counter.textContent = String(bowl ? bowl.toppings.filter((x) => x === t.id).length : 0);
  }

  const fb = el('feedback');
  fb.textContent = state.feedback || '';
  fb.className = state.feedbackKind || '';
}

export function showOverlay(title, text, buttonLabel, isResults = false) {
  el('overlay-title').textContent = title;
  el('overlay-text').textContent = text;
  el('overlay-btn').textContent = buttonLabel;
  el('overlay-extra').classList.add('hidden');
  el('overlay-extra').innerHTML = '';
  el('overlay').classList.toggle('results', isResults);
  el('overlay').classList.remove('hidden');
}

/**
 * Full-screen closing report for the results overlay: the grade up top, the
 * night's numbers as stat chips, the last bowls on the pass, what is left on
 * the board, and the counter's toppings — the whole shift at a glance, with
 * nothing of the live game showing behind it.
 */
export function renderResults(state) {
  const accuracy = state.servedCount > 0 ? Math.round((state.perfectCount / state.servedCount) * 100) : 0;
  const grade = accuracy >= 80 ? 'S' : accuracy >= 60 ? 'A' : accuracy >= 40 ? 'B' : 'C';
  const pinned = state.servedCount + state.walkedOut + state.orders.length;
  const chip = (label, value) => `<div class="stat-chip"><span>${label}</span><b>${value}</b></div>`;
  const passBowls = state.kitchen.pass.map((p) =>
    `<div class="pass-bowl">
      <div class="mini-bowl" aria-hidden="true"><span class="mini-steam"></span>
        <div class="mini-broth" style="background-color:${brothById(p.broth).color}"></div>
      </div>
      <span>${p.label}</span>
    </div>`).join('');
  const leftTickets = state.orders.map((order) =>
    `<span class="recap-ticket">#${order.number} ${brothById(order.broth).name}</span>`).join('');
  const counterChips = TOPPINGS.map((t) =>
    `<span class="chip top-${t.id} recap-chip">${t.short}</span>`).join('');
  el('overlay-extra').innerHTML = `
    <div class="results-grade"><span>STALL GRADE</span><b>${grade}</b></div>
    <div class="stat-chips">
      ${chip('FINAL SCORE', state.score)}
      ${chip('BOWLS SERVED', state.servedCount)}
      ${chip('PERFECT BOWLS', state.perfectCount)}
      ${chip('ACCURACY', `${accuracy}%`)}
      ${chip('WALKED OUT', state.walkedOut)}
      ${chip('BEST COMBO', `×${(1 + 0.15 * Math.min(state.bestCombo, 6)).toFixed(2).replace(/0$/, '')}`)}
      ${chip('SHIFT TIMER', '0:00 — TIME UP')}
    </div>
    <div class="recap-row">
      <div class="recap-panel">
        <h3>PASS — LAST BOWLS OUT</h3>
        <div class="recap-pass">${passBowls}</div>
      </div>
      <div class="recap-panel">
        <h3>ORDER BOARD — CLOSED</h3>
        <p>${pinned} tickets pinned tonight · ${state.servedCount} served · ${state.walkedOut} walked out</p>
        <p>Left on the board: ${leftTickets || 'none — every owl fed'}</p>
      </div>
      <div class="recap-panel">
        <h3>FROM THE COUNTER</h3>
        <div class="recap-counter">${counterChips}</div>
        <p>3 broths · 8 toppings · one steaming pot</p>
      </div>
    </div>`;
  el('overlay-extra').classList.remove('hidden');
}
export function hideOverlay() { el('overlay').classList.add('hidden'); }
