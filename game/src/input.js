// Mouse and keyboard wiring. Buttons are bound in render/main; this module
// owns the ticket clicks and the keyboard shortcuts printed on the stall.
import { BROTHS, TOPPINGS } from './config.js';

export function bindTicketClicks(onSelect) {
  document.getElementById('tickets').addEventListener('click', (event) => {
    const ticket = event.target.closest('.ticket');
    if (ticket?.dataset.order) onSelect(Number(ticket.dataset.order));
  });
}

export function bindKeyboard(handlers) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ') { event.preventDefault(); handlers.onNoodleAction(); return; }
    if (key === 'enter') { handlers.onServe(); return; }
    if (key === 'b') { handlers.onNewBowl(); return; }
    if (key === 't') { handlers.onTrash(); return; }
    if (['1', '2', '3'].includes(key)) { handlers.onSelectIndex(Number(key) - 1); return; }
    const broth = BROTHS.find((b) => b.key === key);
    if (broth) { handlers.onBroth(broth.id); return; }
    const topping = TOPPINGS.find((t) => t.key === key);
    if (topping) handlers.onTopping(topping.id);
  });
}
