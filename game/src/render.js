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

export function renderGame(state) {
  el('shift-time').textContent = String(Math.ceil(state.timeLeft));
  el('shift-meter').style.width = `${(state.timeLeft / 90) * 100}%`;
  el('score').textContent = String(state.score);
  el('combo').textContent = `×${(1 + 0.15 * Math.min(state.combo, 6)).toFixed(2).replace(/0$/, '')} (${state.combo})`;
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
  el('target-name').textContent = target ? `#${target.number} ${brothById(target.broth).name} / ${target.doneness}` : '—';
  const bowl = state.kitchen.bowl;
  el('serve-btn').classList.toggle('unready', state.over || !target || !bowl?.broth || !bowl.noodleDoneness || bowl.noodleDoneness === 'undercooked');
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
  el('overlay').classList.toggle('results', isResults);
  el('overlay').classList.remove('hidden');
}
export function hideOverlay() { el('overlay').classList.add('hidden'); }
