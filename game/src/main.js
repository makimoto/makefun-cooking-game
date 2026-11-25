// Umami Rush entry point: builds the stall, wires player actions to the
// kitchen rules, runs the shift clock, and serves ?shot= screenshot scenes.
import { createSeededRng, createShiftState, startShift, tickShift, selectOrder, selectedOrder, serveCurrentBowl } from './game.js';
import {
  takeFreshBowl, trashBowl, ladleBroth, addToppingToBowl,
  dropNoodlesInPot, pullNoodlesFromPot, tickPot,
} from './cooking.js';
import { buildCounterButtons, renderGame, showOverlay, hideOverlay } from './render.js';
import { bindKeyboard, bindTicketClicks, blurButtonsAfterClick } from './input.js';
import { buildShotScene, shotEndSummary } from './shots.js';
import { sfx } from './audio.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName) document.body.dataset.shot = shotName;
const seed = Number(params.get('seed') || 1);

let state = shotName
  ? buildShotScene(shotName, seed)
  : createShiftState(createSeededRng((Math.random() * 1e9) | 0));

const handlers = {
  onBroth(brothId) {
    if (!state.kitchen.bowl) takeFreshBowl(state.kitchen);
    if (ladleBroth(state.kitchen, brothId)) { sfx.ladle(); state.feedback = ''; }
    renderGame(state);
  },
  onTopping(toppingId) {
    if (!state.kitchen.bowl) takeFreshBowl(state.kitchen);
    if (addToppingToBowl(state.kitchen, toppingId)) sfx.plate();
    renderGame(state);
  },
  onNewBowl() { takeFreshBowl(state.kitchen); sfx.click(); renderGame(state); },
  onTrash() { trashBowl(state.kitchen); sfx.trash(); renderGame(state); },
  onNoodleAction() {
    if (state.kitchen.potProgress === null) {
      if (dropNoodlesInPot(state.kitchen)) sfx.dropNoodles();
    } else {
      if (!state.kitchen.bowl) takeFreshBowl(state.kitchen);
      const doneness = pullNoodlesFromPot(state.kitchen);
      if (doneness) {
        sfx.pullNoodles();
        state.feedback = doneness === 'undercooked' || doneness === 'overcooked'
          ? `Noodles pulled ${doneness}! The ticket will notice…` : `Noodles pulled: ${doneness.toUpperCase()} — right in the zone.`;
        state.feedbackKind = '';
      }
    }
    renderGame(state);
  },
  onServe() {
    const result = serveCurrentBowl(state);
    if (result) { sfx.serveBell(); if (result.perfect) setTimeout(() => sfx.perfect(), 150); }
    renderGame(state);
  },
  onSelectIndex(index) {
    const order = state.orders[index];
    if (order) { selectOrder(state, order.number); sfx.click(); renderGame(state); }
  },
};

buildCounterButtons(handlers);
blurButtonsAfterClick();
bindTicketClicks((number) => { selectOrder(state, number); sfx.click(); renderGame(state); });
bindKeyboard(handlers);
document.getElementById('bowl-btn').addEventListener('click', handlers.onNewBowl);
document.getElementById('trash-btn').addEventListener('click', handlers.onTrash);
document.getElementById('noodle-btn').addEventListener('click', handlers.onNoodleAction);
document.getElementById('serve-btn').addEventListener('click', handlers.onServe);

function beginShift() {
  delete document.body.dataset.shot;
  state = createShiftState(createSeededRng((Math.random() * 1e9) | 0));
  startShift(state);
  hideOverlay();
  renderGame(state);
}
document.getElementById('start-btn').addEventListener('click', beginShift);
document.getElementById('overlay-btn').addEventListener('click', beginShift);

if (shotName === 'end') {
  showOverlay('🌙 SHIFT OVER', shotEndSummary(state), 'PLAY AGAIN', true);
} else if (!shotName) {
  showOverlay('🍜 UMAMI RUSH — Midnight Ramen Stand',
    'Ninety seconds, one steaming pot, a board full of hungry night owls.\nMatch each ticket: broth, noodle doneness, every topping.\nPull the noodles inside the ticket\'s zone — perfect bowls build your combo.',
    'OPEN THE STALL');
}
renderGame(state);

// Shift clock: only real play advances; screenshot scenes stay frozen.
let lastTimestamp = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
  lastTimestamp = now;
  if (state.running && !state.over) {
    tickPot(state.kitchen, dt);
    tickShift(state, dt, {
      onWalkout() { sfx.walkout(); },
      onShiftEnd() {
        showOverlay('🌙 SHIFT OVER',
          shotEndSummary(state),
          'PLAY AGAIN', true);
      },
    });
    renderGame(state);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
