// Menu data for Umami Rush: broths, noodle doneness windows and toppings.
// Everything the kitchen can cook is declared here; the other modules only read it.

export const SHIFT_SECONDS = 90;

export const BROTHS = [
  { id: 'shoyu',    name: 'Shoyu',    jp: '醤油', color: '#5d3a17', key: 'q', blurb: 'clear soy' },
  { id: 'miso',     name: 'Miso',     jp: '味噌', color: '#9c6527', key: 'w', blurb: 'rich fermented' },
  { id: 'tonkotsu', name: 'Tonkotsu', jp: '豚骨', color: '#d9bd8d', key: 'e', blurb: 'creamy pork' },
];

// Boil meter runs 0..1 over BOIL_SECONDS. Each doneness owns a slice of the meter.
export const BOIL_SECONDS = 6;
export const DONENESS = [
  { id: 'firm',    name: 'Firm',    from: 0.30, to: 0.45 },
  { id: 'regular', name: 'Regular', from: 0.45, to: 0.65 },
  { id: 'soft',    name: 'Soft',    from: 0.65, to: 0.80 },
];
export function donenessAt(progress) {
  if (progress < DONENESS[0].from) return 'undercooked';
  for (const d of DONENESS) if (progress >= d.from && progress < d.to) return d.id;
  return 'overcooked';
}

export const TOPPINGS = [
  { id: 'ajitama',    name: 'Ajitama Egg', short: 'EGG',  key: 'a' },
  { id: 'chashu',     name: 'Chashu Pork', short: 'PORK', key: 's' },
  { id: 'negi',       name: 'Spring Onion', short: '✦✦✦', key: 'd' },
  { id: 'nori',       name: 'Nori Seaweed', short: 'NORI', key: 'f' },
  { id: 'menma',      name: 'Menma Bamboo', short: 'MENMA', key: 'g' },
  { id: 'karamiso',   name: 'Spicy Miso',  short: 'HOT',  key: 'h' },
  { id: 'corn',       name: 'Sweet Corn',  short: '✿✿✿',  key: 'j' },
  { id: 'narutomaki', name: 'Narutomaki',  short: '◎',    key: 'k' },
];
export const toppingById = (id) => TOPPINGS.find((t) => t.id === id);
export const brothById = (id) => BROTHS.find((b) => b.id === id);

// Where each topping lands on the bowl (percent of the bowl box), so a plated
// bowl looks arranged rather than stacked in one pile.
export const PLATING_SPOTS = [
  { left: 13, top: 8 }, { left: 60, top: 5 }, { left: 40, top: 28 }, { left: 69, top: 30 },
  { left: 7, top: 34 }, { left: 46, top: 1 }, { left: 24, top: 20 }, { left: 57, top: 18 },
];

export const CUSTOMER_NAMES = [
  'Night-bus Driver', 'Jazz Pianist', 'Taxi Poet', 'Insomniac Novelist', 'Night Nurse',
  'Street Photographer', 'Late-shift Baker', 'Astronomy Student', 'Vinyl Collector', 'Metro Guard',
];
