// Shift orchestration: the clock, ticket flow, combo and score. Rendering and
// input live in their own modules; this one only owns the rules of a shift.
import { SHIFT_SECONDS, CUSTOMER_NAMES } from './config.js';
import { createKitchenState, scoreServedBowl } from './cooking.js';
import { createOrder, resetTicketNumbers, spawnIntervalSeconds, tickOrderPatience } from './orders.js';

// Small deterministic PRNG so screenshot scenes (?seed=) are reproducible.
export function createSeededRng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createShiftState(rng) {
  resetTicketNumbers();
  return {
    rng,
    running: false,
    paused: false,
    perfectBanner: false,
    over: false,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    servedCount: 0,
    perfectCount: 0,
    walkedOut: 0,
    orders: [],
    selectedOrderNumber: null,
    kitchen: createKitchenState(),
    spawnTimer: 0,
    feedback: '',
    feedbackKind: '',
    lastServe: null,
  };
}

export function elapsedRatio(state) {
  return Math.min(1, state.elapsed / SHIFT_SECONDS);
}

export function addOrder(state) {
  const order = createOrder(state.rng, elapsedRatio(state));
  order.customer = CUSTOMER_NAMES[Math.floor(state.rng() * CUSTOMER_NAMES.length)];
  state.orders.push(order);
  if (state.selectedOrderNumber === null) state.selectedOrderNumber = order.number;
  return order;
}

export function startShift(state) {
  state.running = true;
  state.paused = false;
  state.perfectBanner = false;
  state.orders = [];
  addOrder(state); addOrder(state);
  state.spawnTimer = spawnIntervalSeconds(0);
}

export function selectedOrder(state) {
  return state.orders.find((o) => o.number === state.selectedOrderNumber) || state.orders[0] || null;
}

export function selectOrder(state, number) {
  if (state.orders.some((o) => o.number === number)) state.selectedOrderNumber = number;
}

/** Advance the whole shift by dt seconds. Returns events for sound/render. */
export function tickShift(state, dt, hooks) {
  if (!state.running || state.over) return;
  state.timeLeft -= dt;
  state.elapsed += dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0; state.over = true; state.running = false;
    hooks.onShiftEnd?.();
    return;
  }
  state.spawnTimer -= dt;
  const walked = tickOrderPatience(state.orders, dt);
  if (walked.length) {
    state.orders = state.orders.filter((order) => !walked.includes(order));
    state.walkedOut += walked.length;
    state.combo = 0;
  }
  if (state.spawnTimer <= 0 && state.orders.length < 3) {
    if (state.orders.length === 0 && walked.length === 0) state.feedback = '';
    addOrder(state);
    state.spawnTimer = spawnIntervalSeconds(elapsedRatio(state));
    hooks.onNewOrder?.();
  }
  if (walked.length) {
    const lostTarget = walked.find((order) => order.number === state.selectedOrderNumber);
    state.feedback = `Ticket #${(lostTarget || walked[0]).number} walked out hungry… combo lost.`;
    state.feedbackKind = 'bad';
    if (lostTarget) {
      state.selectedOrderNumber = state.orders[0]?.number ?? null;
      state.feedback += state.selectedOrderNumber === null
        ? ' Waiting for a new ticket.'
        : ` Now targeting #${state.selectedOrderNumber}.`;
    }
    for (const order of walked) hooks.onWalkout?.(order);
  }
}

/** Serve the current bowl to the selected ticket. Returns the scoring result or null. */
export function serveCurrentBowl(state) {
  if (!state.running || state.over) return null;
  const order = selectedOrder(state);
  if (!order || !state.kitchen.bowl) return null;
  if (!state.kitchen.bowl.broth || !state.kitchen.bowl.noodleDoneness) {
    state.feedback = 'That bowl is not food yet — it needs broth and noodles before it can be served.';
    state.feedbackKind = 'bad';
    return null;
  }
  if (state.kitchen.bowl.noodleDoneness === 'undercooked') {
    state.feedback = 'Cook a fresh batch of noodles before serving.';
    state.feedbackKind = 'bad';
    return null;
  }
  const result = scoreServedBowl(state.kitchen.bowl, order, state.combo);
  state.score += result.points;
  state.servedCount += 1;
  if (result.perfect) { state.perfectCount += 1; state.combo += 1; }
  else state.combo = Math.max(0, state.combo - 1);
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.feedback = result.verdict;
  state.feedbackKind = result.perfect ? 'good' : '';
  state.lastServe = { order, result };
  state.kitchen.pass.push({ label: `#${order.number} ${state.kitchen.bowl.broth}`, broth: state.kitchen.bowl.broth });
  if (state.kitchen.pass.length > 3) state.kitchen.pass.shift();
  state.kitchen.bowl = null;
  state.orders = state.orders.filter((o) => o !== order);
  state.selectedOrderNumber = state.orders[0]?.number ?? null;
  if (state.orders.length < 2) addOrder(state);
  return result;
}
