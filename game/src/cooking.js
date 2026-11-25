// The bowl being built and the noodle pot: pure state transitions plus the
// serve-time scoring that compares a finished bowl against its ticket.
import { BOIL_SECONDS, donenessAt } from './config.js';

export function createKitchenState() {
  return {
    bowl: null,            // { broth: string|null, noodleDoneness: string|null, toppings: string[] }
    potProgress: null,     // null = pot empty, otherwise 0..1+ boil progress
    pass: [],              // finished bowls waiting on the pass shelf {label, broth}
  };
}

export function takeFreshBowl(state) {
  state.bowl = { broth: null, noodleDoneness: null, toppings: [] };
  return state.bowl;
}

export function trashBowl(state) { state.bowl = null; }

export function ladleBroth(state, brothId) {
  if (!state.bowl) return false;
  state.bowl.broth = brothId;
  return true;
}

export function addToppingToBowl(state, toppingId) {
  if (!state.bowl) return false;
  state.bowl.toppings.push(toppingId);
  return true;
}

export function dropNoodlesInPot(state) {
  if (state.potProgress !== null) return false;
  state.potProgress = 0;
  return true;
}

export function tickPot(state, dtSeconds) {
  if (state.potProgress === null) return;
  state.potProgress = Math.min(1.15, state.potProgress + dtSeconds / BOIL_SECONDS);
}

export function pullNoodlesFromPot(state) {
  if (state.potProgress === null || !state.bowl) return null;
  const doneness = donenessAt(state.potProgress);
  state.bowl.noodleDoneness = doneness;
  state.potProgress = null;
  return doneness;
}

/**
 * Score a served bowl against its ticket.
 * Returns { points, verdict, perfect } — exact broth, doneness inside the
 * ticket's window and the exact topping set earn the full ticket price;
 * every miss is named so the player learns the kitchen's rules.
 */
export function scoreServedBowl(bowl, order, combo) {
  const problems = [];
  let earned = 120; // base pay for any plausible bowl of ramen
  if (!bowl) return { points: 0, verdict: 'No bowl to serve!', perfect: false };
  if (bowl.broth === order.broth) earned += 60; else problems.push(bowl.broth ? 'wrong broth' : 'no broth');
  if (bowl.noodleDoneness === order.doneness) earned += 60;
  else problems.push(bowl.noodleDoneness ? `noodles ${bowl.noodleDoneness}` : 'no noodles');
  const wanted = new Set(order.toppings);
  const missing = order.toppings.filter((t) => !bowl.toppings.includes(t));
  const extras = bowl.toppings.filter((t) => !wanted.has(t));
  earned += (order.toppings.length - missing.length) * 22;
  if (missing.length) problems.push(`missing ${missing.join(', ')}`);
  if (extras.length) { earned -= extras.length * 18; problems.push(`extra ${extras.join(', ')}`); }
  const patienceBonus = Math.round(40 * Math.max(0, order.patienceLeft / order.patience));
  earned += patienceBonus;
  const perfect = problems.length === 0;
  if (perfect) earned += 50;
  const points = Math.max(10, Math.round(earned * (1 + 0.15 * Math.min(combo, 6))));
  return {
    points,
    perfect,
    verdict: perfect
      ? `PERFECT BOWL! +${points} — the customer slurps happily.`
      : `Served +${points} — ${problems.join('; ')}.`,
  };
}
