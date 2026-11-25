// Deterministic screenshot scenes, reached with ?shot=<name>&seed=<n>.
// Each scene builds a real mid-shift state with the game's own rules — the
// same orders, pot and bowl a player would see — then freezes the clock so
// the camera captures a stable, honest frame of the game.
import { createSeededRng, createShiftState, startShift, selectOrder } from './game.js';
import { takeFreshBowl, ladleBroth, addToppingToBowl } from './cooking.js';

export function buildShotScene(name, seed) {
  const state = createShiftState(createSeededRng(seed || 1));
  startShift(state);
  state.running = false; // freeze: screenshots must not drift

  if (name === 'cover' || name === 'play') {
    // A rush in full swing: 58 seconds left, two bowls already out, combo hot.
    state.timeLeft = 58; state.elapsed = 32;
    state.score = 1240; state.combo = 3; state.servedCount = 4; state.perfectCount = 3;
    state.kitchen.pass = [
      { label: '#3 tonkotsu', broth: 'tonkotsu' },
      { label: '#4 shoyu', broth: 'shoyu' },
    ];
    const target = state.orders[0];
    selectOrder(state, target.number);
    takeFreshBowl(state.kitchen);
    ladleBroth(state.kitchen, target.broth);
    state.kitchen.bowl.noodleDoneness = target.doneness;
    // Plate most of the ticket's toppings: visibly mid-assembly, one to go.
    for (const t of target.toppings.slice(0, Math.max(1, target.toppings.length - 1))) {
      addToppingToBowl(state.kitchen, t);
    }
    state.kitchen.potProgress = 0.55; // second portion boiling in the REGULAR zone
    target.patienceLeft = target.patience * 0.62;
    if (state.orders[1]) state.orders[1].patienceLeft = state.orders[1].patience * 0.3;
    state.feedback = name === 'cover'
      ? 'One topping to go — then ring the bell!'
      : 'Combo is hot — finish this bowl, keep the line moving!';
    state.feedbackKind = 'good';
  }

  if (name === 'serve') {
    // The hero bowl is complete and about to be served.
    state.timeLeft = 41; state.elapsed = 49;
    state.score = 2315; state.combo = 5; state.servedCount = 7; state.perfectCount = 5;
    state.kitchen.pass = [{ label: '#7 miso', broth: 'miso' }];
    const target = state.orders[0];
    selectOrder(state, target.number);
    takeFreshBowl(state.kitchen);
    ladleBroth(state.kitchen, target.broth);
    state.kitchen.bowl.noodleDoneness = target.doneness;
    for (const t of target.toppings) addToppingToBowl(state.kitchen, t);
    state.kitchen.potProgress = 0.38;
    target.patienceLeft = target.patience * 0.8;
    state.feedback = 'Bowl complete — hit SERVE while it steams!';
    state.feedbackKind = 'good';
  }

  if (name === 'end') {
    state.timeLeft = 0; state.elapsed = 90; state.over = true;
    state.score = 3480; state.combo = 0; state.servedCount = 11; state.perfectCount = 7;
    state.walkedOut = 2;
    state.orders = []; state.selectedOrderNumber = null;
    state.kitchen.pass = [{ label: '#11 shoyu', broth: 'shoyu' }, { label: '#12 miso', broth: 'miso' }];
    state.feedback = 'Last train gone. The night owls are fed.';
  }
  return state;
}

export function shotEndSummary(state) {
  return `Bowls served: ${state.servedCount} · Perfect bowls: ${state.perfectCount}\n` +
    `Walked out hungry: ${state.walkedOut} · Final score: ${state.score}`;
}
