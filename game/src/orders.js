// Order tickets: generation, patience, expiry. An order is one broth, one
// doneness and a set of toppings; difficulty grows as the shift goes on.
import { BROTHS, DONENESS, TOPPINGS } from './config.js';

let nextTicketNumber = 1;

export function createOrder(rng, elapsedRatio) {
  const broth = BROTHS[Math.floor(rng() * BROTHS.length)];
  const doneness = DONENESS[Math.floor(rng() * DONENESS.length)];
  // Early tickets ask for 2 toppings; late-shift tickets ask for up to 5.
  const toppingCount = Math.min(2 + Math.floor(elapsedRatio * 3.4), 5);
  const pool = [...TOPPINGS];
  const toppings = [];
  for (let i = 0; i < toppingCount; i += 1) {
    const pick = Math.floor(rng() * pool.length);
    toppings.push(pool.splice(pick, 1)[0].id);
  }
  const patience = Math.max(26, 40 - elapsedRatio * 12);
  return {
    number: nextTicketNumber++,
    customer: '',
    broth: broth.id,
    doneness: doneness.id,
    toppings,
    patience,
    patienceLeft: patience,
  };
}

export function resetTicketNumbers() { nextTicketNumber = 1; }

/** Seconds between new tickets arriving; shrinks as the rush builds. */
export function spawnIntervalSeconds(elapsedRatio) {
  return 11 - elapsedRatio * 5.5;
}

/** Tick every open ticket's patience. Returns the orders that just walked out. */
export function tickOrderPatience(orders, dtSeconds) {
  const walkedOut = [];
  for (const order of orders) {
    order.patienceLeft -= dtSeconds;
    if (order.patienceLeft <= 0) walkedOut.push(order);
  }
  return walkedOut;
}
