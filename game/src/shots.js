// Deterministic screenshot scenes, reached with ?shot=<name>&seed=<n>.
// The four scenes are one single shift told in order — cover, serve, play,
// end — so the clock only ever runs down and the score, bowls served and
// perfect count only ever climb from frame to frame. Each scene builds a
// real mid-shift state with the game's own rules, then freezes the clock so
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
    // 18 seconds in: two bowls out, ticket #3 on the counter with its
    // noodles still bubbling in the FIRM zone, and #4 about to walk.
    state.timeLeft = 72; state.elapsed = 18;
    state.score = 640; state.combo = 2; state.bestCombo = 2;
    state.servedCount = 2; state.perfectCount = 2; state.walkedOut = 0;
    state.kitchen.pass = [
      { label: '#1 tonkotsu', broth: 'tonkotsu' },
      { label: '#2 shoyu', broth: 'shoyu' },
    ];
    addOrder(state);
    state.orders.forEach((order, index) => { order.number = 3 + index; });
    Object.assign(target, { broth: 'shoyu', doneness: 'firm', toppings: ['chashu', 'ajitama', 'nori'], patience: 36, patienceLeft: 30 });
    Object.assign(state.orders[1], { toppings: ['negi', 'ajitama', 'menma'], patience: 36, patienceLeft: 8 });
    plateTicket(state, target, 2);
    state.kitchen.bowl.noodleDoneness = null; // still in the pot, not yet pulled
    state.kitchen.potProgress = 0.375;
    state.feedback = 'One topping to go — then ring the bell!';
    state.feedbackKind = 'good';
  }

  if (name === 'serve') {
    // 44 seconds in: five bowls out, ticket #6 finished and steaming on the
    // counter, two more tickets already pinned behind it.
    state.timeLeft = 46; state.elapsed = 44;
    state.score = 1620; state.combo = 4; state.bestCombo = 4;
    state.servedCount = 5; state.perfectCount = 4; state.walkedOut = 0;
    state.kitchen.pass = [
      { label: '#3 shoyu', broth: 'shoyu' },
      { label: '#4 miso', broth: 'miso' },
      { label: '#5 tonkotsu', broth: 'tonkotsu' },
    ];
    addOrder(state);
    state.orders.forEach((order, index) => { order.number = 6 + index; });
    Object.assign(target, {
      broth: 'tonkotsu',
      doneness: 'regular',
      toppings: ['chashu', 'ajitama', 'nori'],
      patience: 34,
      patienceLeft: 28,
    });
    Object.assign(state.orders[1], { toppings: ['corn', 'negi', 'karamiso'], patience: 34, patienceLeft: 20 });
    plateTicket(state, target);
    state.feedback = 'Bowl complete — hit SERVE while it steams!';
    state.feedbackKind = 'good';
  }

  if (name === 'play') {
    // 67 seconds in: ticket #8 just flew out PERFECT and the banner is still
    // up, while bowl #9 is already plated — noodles pulled SOFT, one
    // topping to go — under the late-shift rush.
    state.timeLeft = 23; state.elapsed = 67;
    state.score = 2590; state.combo = 6; state.bestCombo = 6;
    state.servedCount = 8; state.perfectCount = 6; state.walkedOut = 1;
    state.kitchen.pass = [
      { label: '#6 shoyu', broth: 'shoyu' },
      { label: '#7 miso', broth: 'miso' },
      { label: '#8 tonkotsu', broth: 'tonkotsu' },
    ];
    state.orders.forEach((order, index) => { order.number = 9 + index; });
    Object.assign(target, { broth: 'miso', doneness: 'soft', toppings: ['narutomaki', 'corn', 'negi'], patience: 37, patienceLeft: 30 });
    Object.assign(state.orders[1], { patience: 37, patienceLeft: 35 });
    plateTicket(state, target, 2);
    state.perfectBanner = true;
    state.feedback = 'PERFECT BOWL! +592 — #8 flew out. This one needs negi, then serve!';
    state.feedbackKind = 'good';
  }

  if (name === 'end') {
    // Time up: eleven bowls served, eight of them perfect (73% — a solid A,
    // not a gift), two owls walked out, two tickets still on the board.
    state.timeLeft = 0; state.elapsed = 90; state.over = true;
    state.score = 3540; state.combo = 0; state.bestCombo = 6;
    state.servedCount = 11; state.perfectCount = 8; state.walkedOut = 2;
    state.kitchen.pass = [
      { label: '#9 shoyu', broth: 'shoyu' },
      { label: '#10 miso', broth: 'miso' },
      { label: '#11 tonkotsu', broth: 'tonkotsu' },
    ];
    state.orders.forEach((order, index) => { order.number = 14 + index; });
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
