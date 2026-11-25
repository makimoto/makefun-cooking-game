// Deterministic screenshot scenes, reached with ?shot=<name>&seed=<n>.
// Each scene builds a real mid-shift state with the game's own rules — the
// same orders, pot and bowl a player would see — then freezes the clock so
// the camera captures a stable, honest frame of the game.
import { createSeededRng, createShiftState, startShift, selectOrder, addOrder } from './game.js';
import { takeFreshBowl, ladleBroth, addToppingToBowl } from './cooking.js';

function plateTicket(state, ticket, toppingCount = ticket.toppings.length) {
  selectOrder(state, ticket.number);
  takeFreshBowl(state.kitchen);
  ladleBroth(state.kitchen, ticket.broth);
  state.kitchen.bowl.noodleDoneness = ticket.doneness;
  for (const topping of ticket.toppings.slice(0, toppingCount)) {
    addToppingToBowl(state.kitchen, topping);
  }
}

export function buildShotScene(name, seed) {
  const state = createShiftState(createSeededRng(seed || 1));
  startShift(state);
  state.running = false;

  const target = state.orders[0];
  if (name === 'cover') {
    state.timeLeft = 58; state.elapsed = 32;
    state.score = 1240; state.combo = 3; state.servedCount = 4; state.perfectCount = 3;
    state.kitchen.pass = [
      { label: '#3 tonkotsu', broth: 'tonkotsu' },
      { label: '#4 shoyu', broth: 'shoyu' },
    ];
    addOrder(state);
    state.orders.forEach((order, index) => { order.number = 5 + index; });
    Object.assign(target, { broth: 'shoyu', doneness: 'firm', toppings: ['chashu', 'ajitama', 'negi', 'nori'] });
    target.patienceLeft = 24;
    state.orders[1].patienceLeft = 8;
    plateTicket(state, target, 3);
    state.kitchen.potProgress = 0.375;
    state.feedback = 'One topping to go — then ring the bell!';
    state.feedbackKind = 'good';
  }

  if (name === 'serve') {
    state.timeLeft = 41; state.elapsed = 49;
    state.score = 2315; state.combo = 5; state.servedCount = 7; state.perfectCount = 5;
    state.kitchen.pass = [{ label: '#7 miso', broth: 'miso' }];
    state.orders.forEach((order, index) => { order.number = 8 + index; });
    Object.assign(target, {
      broth: 'tonkotsu',
      toppings: ['chashu', 'ajitama', 'corn', 'nori', 'negi'],
      patienceLeft: 28,
    });
    plateTicket(state, target);
    state.feedback = 'Bowl complete — hit SERVE while it steams!';
    state.feedbackKind = 'good';
  }

  if (name === 'play') {
    // The payoff moment: the last bowl was PERFECT, the combo is hot, and the
    // next bowl is already boiling toward its SOFT window.
    state.timeLeft = 64; state.elapsed = 26;
    state.score = 1875; state.combo = 5; state.servedCount = 5; state.perfectCount = 4;
    state.kitchen.pass = [{ label: '#5 tonkotsu', broth: 'tonkotsu' }];
    state.orders.forEach((order, index) => { order.number = 6 + index; });
    Object.assign(target, { broth: 'miso', doneness: 'soft', toppings: ['narutomaki', 'karamiso', 'corn'] });
    plateTicket(state, target, 2);
    state.kitchen.bowl.noodleDoneness = null;
    state.kitchen.potProgress = 0.73;
    state.feedback = 'PERFECT BOWL! +412 — combo ×1.75! Next bowl: pull SOFT now!';
    state.feedbackKind = 'good';
  }

  if (name === 'end') {
    state.timeLeft = 0; state.elapsed = 90; state.over = true;
    state.score = 3480; state.servedCount = 11; state.perfectCount = 7;
    state.walkedOut = 2;
    state.kitchen.pass = [{ label: '#12 shoyu', broth: 'shoyu' }, { label: '#13 miso', broth: 'miso' }];
    state.orders.forEach((order, index) => { order.number = 14 + index; });
    Object.assign(target, { broth: 'miso', toppings: ['ajitama', 'nori', 'corn', 'karamiso'] });
    plateTicket(state, target, 3);
    state.feedback = 'Last train gone. The night owls are fed.';
  }
  return state;
}

export function shotEndSummary(state) {
  const accuracy = state.servedCount > 0 ? Math.round((state.perfectCount / state.servedCount) * 100) : 0;
  const grade = accuracy >= 80 ? 'S' : accuracy >= 60 ? 'A' : accuracy >= 40 ? 'B' : 'C';
  return `Bowls served: ${state.servedCount} · Perfect bowls: ${state.perfectCount} · Accuracy: ${accuracy}%\n` +
    `Walked out hungry: ${state.walkedOut} · Final score: ${state.score} · Stall grade: ${grade}`;
}
