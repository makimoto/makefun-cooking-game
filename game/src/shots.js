// Frozen screenshots from a single scripted shift. The seed parameter is
// accepted for capture URLs, but every seed tells the same story.
import { BOIL_SECONDS, DONENESS, SHIFT_SECONDS, toppingById } from './config.js';
import { createShiftState, selectOrder, serveCurrentBowl } from './game.js';
import {
  takeFreshBowl, ladleBroth, addToppingToBowl,
  dropNoodlesInPot, tickPot, pullNoodlesFromPot,
} from './cooking.js';

// Times are elapsed seconds. A serve can name a topping that was missed.
// Tickets that walk out expire on the same patience curve as live tickets.
const TICKETS = [
  { pinned: 0, customer: 'Night-bus Driver', broth: 'tonkotsu', doneness: 'firm', toppings: ['chashu', 'negi'], served: 3 },
  { pinned: 0, customer: 'Jazz Pianist', broth: 'shoyu', doneness: 'regular', toppings: ['menma', 'nori'], served: 11 },
  { pinned: 3, customer: 'Taxi Poet', broth: 'shoyu', doneness: 'firm', toppings: ['chashu', 'ajitama'], served: 37, missed: 'ajitama' },
  { pinned: 11, customer: 'Insomniac Novelist', broth: 'shoyu', doneness: 'soft', toppings: ['negi', 'menma'], served: 40 },
  { pinned: 28, customer: 'Night Nurse', broth: 'miso', doneness: 'regular', toppings: ['ajitama', 'corn', 'karamiso'], served: 44 },
  { pinned: 38, customer: 'Street Photographer', broth: 'tonkotsu', doneness: 'regular', toppings: ['chashu', 'ajitama', 'nori'], served: 49 },
  { pinned: 41, customer: 'Late-shift Baker', broth: 'shoyu', doneness: 'firm', toppings: ['menma', 'negi', 'nori'], served: 54 },
  { pinned: 45, customer: 'Astronomy Student', broth: 'miso', doneness: 'soft', toppings: ['narutomaki', 'corn', 'negi'], served: 66 },
  { pinned: 50, customer: 'Vinyl Collector', broth: 'tonkotsu', doneness: 'soft', toppings: ['chashu', 'menma', 'narutomaki'], walksOut: true },
  { pinned: 55, customer: 'Metro Guard', broth: 'shoyu', doneness: 'regular', toppings: ['negi', 'ajitama', 'nori', 'menma'], walksOut: true },
  { pinned: 66, customer: 'Jazz Pianist', broth: 'tonkotsu', doneness: 'firm', toppings: ['negi', 'menma', 'nori', 'chashu'], served: 72, missed: 'menma' },
  { pinned: 72, customer: 'Taxi Poet', broth: 'miso', doneness: 'regular', toppings: ['corn', 'karamiso', 'chashu', 'ajitama'], served: 79 },
  { pinned: 79, customer: 'Night Nurse', broth: 'shoyu', doneness: 'soft', toppings: ['narutomaki', 'nori', 'ajitama', 'negi'], served: 85, missed: 'nori' },
  { pinned: 85, customer: 'Vinyl Collector', broth: 'tonkotsu', doneness: 'regular', toppings: ['chashu', 'ajitama', 'negi', 'nori', 'menma'] },
  { pinned: 88, customer: 'Metro Guard', broth: 'miso', doneness: 'firm', toppings: ['karamiso', 'corn', 'narutomaki', 'negi', 'ajitama'] },
];

const SHOT_TIMES = { cover: 35, serve: 46, play: 66, end: SHIFT_SECONDS };

function plateTicket(state, order, { noodles = true, missed } = {}) {
  const kitchen = state.kitchen;
  const bowl = takeFreshBowl(kitchen);
  ladleBroth(kitchen, order.broth);
  for (const topping of order.toppings) {
    if (topping !== missed) addToppingToBowl(kitchen, topping);
  }
  const zone = DONENESS.find((entry) => entry.id === order.doneness);
  dropNoodlesInPot(kitchen);
  tickPot(kitchen, BOIL_SECONDS * (zone.from + zone.to) / 2);
  if (noodles) pullNoodlesFromPot(kitchen);
  return bowl;
}

function assemblyFeedback(order, bowl) {
  const steps = [];
  if (!bowl.noodleDoneness) steps.push(`Pull ${order.doneness} noodles`);
  const missing = order.toppings.filter((topping) => !bowl.toppings.includes(topping));
  if (missing.length) steps.push(`Add ${missing.map((topping) => toppingById(topping).name).join(' and ')}`);
  if (!steps.length) return 'Bowl complete — ring the bell.';
  steps.push('Ring the bell');
  return `${steps.join(' → ')}.`;
}

function replayShift(state, elapsed) {
  const events = TICKETS.flatMap(({ pinned, served, walksOut, missed, ...recipe }, index) => {
    const patience = Math.max(26, 40 - (pinned / SHIFT_SECONDS) * 12);
    const order = { ...recipe, number: index + 1, patience, patienceLeft: patience };
    const arrival = { time: pinned, kind: 'pin', order };
    if (walksOut) return [arrival, { time: pinned + patience, kind: 'walk', order }];
    if (served !== undefined) return [arrival, { time: served, kind: 'serve', order, missed }];
    return [arrival];
  });
  // At equal times a serve frees a board slot before a new ticket is pinned.
  events.sort((a, b) => a.time - b.time || Number(a.kind === 'pin') - Number(b.kind === 'pin'));

  let lastServedBowl;
  for (const { time, kind, order, missed } of events) {
    if (time > elapsed) break;
    const dt = time - state.elapsed;
    state.elapsed = time;
    for (const open of state.orders) open.patienceLeft -= dt;
    if (kind === 'pin') {
      state.orders.push(order);
    } else if (kind === 'walk') {
      state.orders = state.orders.filter((open) => open !== order);
      state.walkedOut += 1;
      state.combo = 0;
    } else {
      selectOrder(state, order.number);
      lastServedBowl = plateTicket(state, order, { missed });
      const remaining = state.orders.length - 1;
      serveCurrentBowl(state);
      // Live service can auto-pin a refill. Scripted arrivals own the board here.
      state.orders.length = remaining;
    }
  }
  for (const open of state.orders) open.patienceLeft -= elapsed - state.elapsed;
  state.selectedOrderNumber = state.orders[0]?.number ?? null;
  return lastServedBowl;
}

export function buildShotScene(name, seed) {
  const scene = Object.hasOwn(SHOT_TIMES, name) ? name : 'cover';
  const elapsed = SHOT_TIMES[scene];
  const state = createShiftState(() => 0);
  state.running = true;
  const lastServedBowl = replayShift(state, elapsed);
  state.elapsed = elapsed;
  state.timeLeft = SHIFT_SECONDS - elapsed;
  state.running = false;
  state.over = state.timeLeft === 0;

  if (scene === 'cover' || scene === 'serve') {
    const target = state.orders[0];
    const bowl = plateTicket(state, target, {
      noodles: scene === 'serve',
      missed: scene === 'cover' ? target.toppings.at(-1) : undefined,
    });
    state.feedback = assemblyFeedback(target, bowl);
    state.feedbackKind = 'good';
  } else if (scene === 'play') {
    state.perfectBanner = state.lastServe.result.perfect;
    state.servedBowlPreview = lastServedBowl;
    state.feedback = `#${state.lastServe.order.number} served · ${state.lastServe.result.verdict}`;
  }
  return state;
}

export function shotEndSummary(state) {
  const accuracy = state.servedCount > 0 ? Math.round((state.perfectCount / state.servedCount) * 100) : 0;
  const grade = accuracy >= 80 ? 'S' : accuracy >= 60 ? 'A' : accuracy >= 40 ? 'B' : 'C';
  return `Bowls served: ${state.servedCount} · Perfect bowls: ${state.perfectCount} · Accuracy: ${accuracy}%\n` +
    `Walked out hungry: ${state.walkedOut} · Final score: ${state.score} · Stall grade: ${grade}`;
}
