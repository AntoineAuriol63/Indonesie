// Briques communes aux scènes détaillées.
import { Builder, createModel, flag, person, puff, rise } from '../models.js';

export { Builder, createModel, flag, person, puff, rise };
export const PI = Math.PI;

// Vélo avec son cycliste, origine au sol, tourné vers +x.
export function bike(color) {
  const b = new Builder();
  b.cyl('#343a40', 0.05, 0.05, 0.016, 8, -0.07, 0.05, 0, PI / 2, 0, 0);
  b.cyl('#343a40', 0.05, 0.05, 0.016, 8, 0.07, 0.05, 0, PI / 2, 0, 0);
  b.box(color, 0.15, 0.022, 0.022, 0, 0.09, 0);
  b.box(color, 0.022, 0.07, 0.022, 0.06, 0.12, 0);
  person(b, color, color, -0.01, 0.09, 0, 0.75);
  return b.mesh();
}
