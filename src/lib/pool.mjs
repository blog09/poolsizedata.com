// Pool maths, shared by the static build and the browser. Every dose comes from stoichiometry, shown on /sources/.
export const GAL_L = 3.78541;
const OZ_G = 28.3495, FLOZ_L = 0.0295735, LB_G = 453.592;
export const FT3_GAL = 7.48052;

export const num = (x, d = 0) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const gallons = (x) => `${num(Math.round(x / 10) * 10)} gallons`;

/** Weight from grams: "6 oz" below a pound, then "2.3 lb". */
export const weight = (g) => { const oz = g / OZ_G; return oz < 16 ? `${num(oz, oz < 3 ? 1 : 0)} oz` : `${num(g / LB_G, 1)} lb`; };
/** Liquid from litres: fl oz below a quart, then quarts and gallons. */
export const liquid = (l) => { const fl = l / FLOZ_L; return fl < 32 ? `${num(fl, fl < 3 ? 1 : 0)} fl oz` : fl < 128 ? `${num(fl / 32, 1)} qt (${num(fl)} fl oz)` : `${num(l / GAL_L, 1)} gal (${num(fl)} fl oz)`; };

/** Volume in gallons. Round pools use `length` as the diameter; kidney pools take two widths. */
export function volume({ shape = 'rectangle', length = 0, width = 0, width2 = 0, shallow = 0, deep = 0 }) {
  const avg = (+shallow + +deep) / 2;
  const area = shape === 'round' ? Math.PI / 4 * length * length : shape === 'oval' ? Math.PI / 4 * length * width : shape === 'kidney' ? 0.45 * (+width + +width2) * length : length * width;
  return area * avg * FT3_GAL;
}

/** Grams of a pure substance that raise `gal` of water by `ppm` of itself (mg/L). */
const ppmGrams = (gal, ppm) => gal * GAL_L * ppm / 1000;

/** Salt: g of NaCl to raise salinity. */
export const saltGrams = (gal, ppm) => ppmGrams(gal, ppm);
export const saltBags = (g, lb = 40) => Math.ceil(g / LB_G / lb);

export const CHLORINE = {
  liquid10: { name: 'Liquid chlorine, 10%', pct: 10, liquid: true },
  liquid125: { name: 'Liquid chlorine, 12.5%', pct: 12.5, liquid: true },
  bleach6: { name: 'Plain bleach, 6%', pct: 6, liquid: true },
  bleach825: { name: 'Plain bleach, 8.25%', pct: 8.25, liquid: true },
  calhypo65: { name: 'Cal-hypo shock, 65%', pct: 65 },
  calhypo73: { name: 'Cal-hypo shock, 73%', pct: 73 },
  dichlor: { name: 'Dichlor, 56%', pct: 56, cya: 0.9 },
  trichlor: { name: 'Trichlor, 90%', pct: 90, cya: 0.6 },
};
/** Amount of a chlorine product to raise free chlorine by `ppm`, formatted. Liquid % is treated as g per 100 mL. */
export function chlorineDose(gal, ppm, key) {
  const p = CHLORINE[key], g = ppmGrams(gal, ppm);
  return p.liquid ? liquid(g / (p.pct * 10)) : weight(g / (p.pct / 100));
}

// Alkalinity is measured as CaCO3: 10 ppm = 0.2 meq/L.
const meq = (gal, ppmAsCaCO3) => gal * GAL_L * ppmAsCaCO3 / 50;
export const bakingSodaGrams = (gal, ppm) => meq(gal, ppm) * 0.084;
const HCL_MOL_L = 10; // 31.45% muriatic acid, about 10 mol/L
export const acidLitres = (gal, ppm) => meq(gal, ppm) / 1000 / HCL_MOL_L;
export const dryAcidGrams = (gal, ppm) => meq(gal, ppm) * 0.129; // sodium bisulfate, 93%
export const stabilizerGrams = (gal, ppm) => ppmGrams(gal, ppm);
export const calciumGrams = (gal, ppm) => (gal * GAL_L * ppm / 100) * 0.147; // 77% calcium chloride flake (dihydrate)

// pH moves along the carbonate system at constant dissolved carbonate (pK1' 6.2, pK2' 10.1; cyanuric acid and borates ignored).
const PK1 = 6.2, PK2 = 10.1;
const ratios = (ph) => ({ r: 10 ** (PK1 - ph), s: 10 ** (ph - PK2) });
function carbonate(ta, ph) { const { r, s } = ratios(ph), H = (ta / 50) / (1 + 2 * s); return { H, dic: H * (1 + r + s) }; }
/** Muriatic acid (litres) to lower pH. */
export function phAcidLitres(gal, ph0, ph1, ta) {
  const { dic } = carbonate(ta, ph0), { r, s } = ratios(ph1);
  const H1 = dic / (1 + r + s), delta = ta / 50 - H1 * (1 + 2 * s);
  return Math.max(0, delta) * gal * GAL_L / 1000 / HCL_MOL_L;
}
/** Soda ash to raise pH: grams, and the alkalinity it adds. */
export function phSodaAsh(gal, ph0, ph1, ta) {
  const { dic } = carbonate(ta, ph0), { r, s } = ratios(ph1), k = (1 + r + s) / (1 + 2 * s), T = ta / 50;
  const x = Math.max(0, (dic - T * k) / (2 * k - 1)); // mmol/L of Na2CO3
  return { g: x * gal * GAL_L * 0.106, ta: x * 2 * 50 };
}
const dilution = (cur, tgt) => Math.round((1 - tgt / cur) * 100);
const row = (a, b) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`;
const result = (rows, note = '') => `<div class="tbl"><table><tbody>${rows.join('')}</tbody></table></div>${note ? `<p class="small">${note}</p>` : ''}`;
const CHOICES = Object.entries(CHLORINE).map(([v, c]) => [v, c.name]);
const GAL = { id: 'gal', label: 'Pool gallons', value: 15000, step: 500 };

// Each calculator: its inputs and a function from input values to result HTML.
export const TOOLS = {
  volume: {
    inputs: [{ id: 'shape', label: 'Shape', options: [['rectangle', 'Rectangle'], ['round', 'Round'], ['oval', 'Oval'], ['kidney', 'Kidney']], value: 'rectangle' }, { id: 'length', label: 'Length or diameter (ft)', value: 32 }, { id: 'width', label: 'Width (ft)', value: 16 }, { id: 'width2', label: 'Kidney: second width (ft)', value: 0 }, { id: 'shallow', label: 'Shallow depth (ft)', value: 3, step: 0.5 }, { id: 'deep', label: 'Deep depth (ft)', value: 6, step: 0.5 }],
    run: (v) => { const g = volume(v); return result([row('Gallons', `<strong>${num(g)}</strong>`), row('Liters', num(g * GAL_L)), row('Cubic feet', num(g / FT3_GAL))], 'Measure to the water line, not the top of the wall. Average depth is (shallow + deep) ÷ 2.'); },
  },
  salt: {
    inputs: [GAL, { id: 'cur', label: 'Current salt (ppm)', value: 0, step: 100 }, { id: 'tgt', label: 'Target salt (ppm)', value: 3200, step: 100 }],
    run: (v) => { if (+v.cur >= +v.tgt) return `<p>Salt is already at or above target. To come down, replace about <strong>${dilution(v.cur, v.tgt)}%</strong> of the water, since salt does not evaporate.</p>`; const g = saltGrams(v.gal, v.tgt - v.cur); return result([row('Pool salt to add', `<strong>${num(g / LB_G)} lb</strong>`), row('In kilograms', `${num(g / 1000)} kg`), row('40 lb bags', saltBags(g))], 'Add it in stages, brush it around, run the pump for 24 hours, then retest before adding the rest.'); },
  },
  chlorine: {
    inputs: [GAL, { id: 'cur', label: 'Current free chlorine (ppm)', value: 1, step: 0.5 }, { id: 'tgt', label: 'Target (ppm)', value: 4, step: 0.5 }, { id: 'prod', label: 'Product', options: CHOICES, value: 'liquid10' }],
    run: (v) => { const up = v.tgt - v.cur; if (up <= 0) return '<p>Chlorine is already at or above target. Stop adding it and let the sun and swimmers use it up.</p>'; const c = CHLORINE[v.prod]; return result([row(`${c.name} to add`, `<strong>${chlorineDose(v.gal, up, v.prod)}</strong>`), ...(c.cya ? [row('Stabilizer this adds', `${num(up * c.cya, 1)} ppm`)] : [])], 'Pour slowly near a return jet with the pump running. Retest after an hour.'); },
  },
  shock: {
    inputs: [GAL, { id: 'cya', label: 'Stabilizer, CYA (ppm)', value: 40, step: 10 }, { id: 'cur', label: 'Current free chlorine (ppm)', value: 1, step: 0.5 }, { id: 'prod', label: 'Product', options: CHOICES, value: 'calhypo65' }],
    run: (v) => { const tgt = Math.max(10, 0.4 * v.cya), up = Math.max(0, tgt - v.cur), c = CHLORINE[v.prod]; return result([row('Shock level for this CYA', `${num(tgt, 1)} ppm`), row(`${c.name} to add`, `<strong>${up ? chlorineDose(v.gal, up, v.prod) : 'none'}</strong>`), ...(c.cya && up ? [row('Stabilizer this adds', `${num(up * c.cya, 1)} ppm`)] : [])], 'Shock at dusk with the pump running. Stay out until chlorine is back under 10 ppm, and do not rely on a DPD test reading above that level.'); },
  },
  alkalinity: {
    inputs: [GAL, { id: 'cur', label: 'Current alkalinity (ppm)', value: 70, step: 10 }, { id: 'tgt', label: 'Target (ppm)', value: 100, step: 10 }],
    run: (v) => { const d = v.tgt - v.cur; if (d === 0) return '<p>Alkalinity is on target.</p>'; if (d > 0) return result([row('Baking soda to add', `<strong>${weight(bakingSodaGrams(v.gal, d))}</strong>`)], 'Add up to 2 lb per 10,000 gallons at a time, wait 6 hours with the pump on, then retest.'); return result([row('Muriatic acid (31.45%) in total', `<strong>${liquid(acidLitres(v.gal, -d))}</strong>`), row('Or dry acid', weight(dryAcidGrams(v.gal, -d)))], 'Add in several small doses over days, and aerate between them to bring pH back up.'); },
  },
  ph: {
    inputs: [GAL, { id: 'cur', label: 'Current pH', value: 7.8, step: 0.1 }, { id: 'tgt', label: 'Target pH', value: 7.4, step: 0.1 }, { id: 'ta', label: 'Alkalinity (ppm)', value: 100, step: 10 }],
    run: (v) => { const d = v.tgt - v.cur; if (Math.abs(d) < 0.01) return '<p>pH is on target.</p>'; if (d < 0) return result([row('Muriatic acid (31.45%)', `<strong>${liquid(phAcidLitres(v.gal, +v.cur, +v.tgt, +v.ta))}</strong>`)], 'An estimate: stabilizer and borates change the real amount. Add three quarters, run the pump for an hour, retest and adjust.'); const s = phSodaAsh(v.gal, +v.cur, +v.tgt, +v.ta); return result([row('Soda ash', `<strong>${weight(s.g)}</strong>`), row('Alkalinity it also adds', `${num(s.ta, 1)} ppm`)], 'An estimate: add three quarters, run the pump for an hour, retest and adjust.'); },
  },
  stabilizer: {
    inputs: [GAL, { id: 'cur', label: 'Current CYA (ppm)', value: 10, step: 10 }, { id: 'tgt', label: 'Target CYA (ppm)', value: 40, step: 10 }],
    run: (v) => { const d = v.tgt - v.cur; if (d <= 0) return `<p>${d === 0 ? 'CYA is on target.' : `Only water replacement lowers CYA in practice: replace about <strong>${dilution(v.cur, v.tgt)}%</strong> of the water.`}</p>`; return result([row('Stabilizer (cyanuric acid)', `<strong>${weight(stabilizerGrams(v.gal, d))}</strong>`)], 'It dissolves slowly. Hang it in a sock in front of a return jet, and wait about a week before retesting.'); },
  },
  calcium: {
    inputs: [GAL, { id: 'cur', label: 'Current hardness (ppm)', value: 150, step: 10 }, { id: 'tgt', label: 'Target hardness (ppm)', value: 300, step: 10 }],
    run: (v) => { const d = v.tgt - v.cur; if (d <= 0) return `<p>${d === 0 ? 'Hardness is on target.' : `To lower hardness, replace about <strong>${dilution(v.cur, v.tgt)}%</strong> of the water with softer water.`}</p>`; return result([row('Calcium chloride, 77% flake', `<strong>${weight(calciumGrams(v.gal, d))}</strong>`)], 'Dissolve in a bucket of water first: it gets hot. Add slowly around the pool with the pump running.'); },
  },
  chemical: {
    inputs: [GAL, { id: 'fc', label: 'Free chlorine', value: 1, step: 0.5 }, { id: 'ph', label: 'pH', value: 7.8, step: 0.1 }, { id: 'ta', label: 'Alkalinity', value: 70, step: 10 }, { id: 'ch', label: 'Calcium hardness', value: 200, step: 10 }, { id: 'cya', label: 'Stabilizer (CYA)', value: 20, step: 10 }],
    run: (v) => {
      const a = [];
      if (v.ta < 80) a.push(`<strong>Alkalinity first:</strong> add ${weight(bakingSodaGrams(v.gal, 100 - v.ta))} of baking soda to reach 100 ppm.`);
      else if (v.ta > 120) a.push(`<strong>Alkalinity first:</strong> it is high. Lower it in stages with up to ${liquid(acidLitres(v.gal, v.ta - 100))} of muriatic acid in total.`);
      if (v.ph > 7.6) a.push(`<strong>pH:</strong> add about ${liquid(phAcidLitres(v.gal, +v.ph, 7.4, Math.max(+v.ta, 40)))} of muriatic acid.`);
      else if (v.ph < 7.2) a.push(`<strong>pH:</strong> add about ${weight(phSodaAsh(v.gal, +v.ph, 7.4, Math.max(+v.ta, 40)).g)} of soda ash.`);
      if (v.ch < 200) a.push(`<strong>Calcium:</strong> add ${weight(calciumGrams(v.gal, 300 - v.ch))} of 77% calcium chloride.`);
      if (v.cya < 30) a.push(`<strong>Stabilizer:</strong> add ${weight(stabilizerGrams(v.gal, 40 - v.cya))} to reach 40 ppm.`);
      else if (v.cya > 80) a.push(`<strong>Stabilizer:</strong> replace about ${dilution(v.cya, 50)}% of the water.`);
      const min = Math.max(2, 0.075 * v.cya);
      if (v.fc < min) a.push(`<strong>Chlorine last:</strong> add ${chlorineDose(v.gal, min + 2 - v.fc, 'liquid10')} of 10% liquid chlorine to reach ${num(min + 2, 1)} ppm.`);
      return a.length ? `<ol>${a.map((x) => `<li>${x}</li>`).join('')}</ol><p class="small">Run the pump between steps and retest before the next one. Never mix chemicals together.</p>` : '<p>Everything is in range. Nothing to add today.</p>';
    },
  },
  fill: {
    inputs: [GAL, { id: 'gpm', label: 'Hose flow (gallons per minute)', value: 9 }, { id: 'rate', label: 'Water price ($ per 1,000 gal)', value: 5, step: 0.5 }],
    run: (v) => { const h = v.gal / v.gpm / 60; return result([row('Time to fill', `<strong>${num(h, 1)} hours</strong>`), row('That is', `${num(h / 24, 1)} days`), row('Water cost', `<strong>$${num(v.gal / 1000 * v.rate)}</strong>`)], 'Time your hose: seconds to fill a 5-gallon bucket ÷ 5 gives seconds per gallon; 60 ÷ that is your flow. The price is only a starting value, so use the one on your water bill.'); },
  },
  heater: {
    inputs: [GAL, { id: 'rise', label: 'Temperature rise (°F)', value: 20 }, { id: 'hours', label: 'Hours to heat', value: 24 }, { id: 'eff', label: 'Heater efficiency (%)', value: 82 }],
    run: (v) => { const btu = v.gal * 8.34 * v.rise; return result([row('Heat needed', `${num(btu)} BTU`), row('Heater input size', `<strong>${num(btu / v.hours / (v.eff / 100))} BTU/hr</strong>`)], 'Water only, with a cover on. Wind and an uncovered surface lose heat quickly, so go up a size if you heat without a cover.'); },
  },
  pump: {
    inputs: [GAL, { id: 'hours', label: 'Hours per full turnover', value: 8 }],
    run: (v) => result([row('Flow needed', `<strong>${num(v.gal / v.hours / 60)} GPM</strong>`), row('Per hour', `${num(v.gal / v.hours)} gal`)], 'Match the pump to this flow at your plumbing\'s resistance, using the maker\'s pump curve. Do not exceed the filter\'s rated flow.'),
  },
  filter: {
    inputs: [GAL, { id: 'hours', label: 'Hours per full turnover', value: 8 }],
    run: (v) => { const gpm = v.gal / v.hours / 60, ft2 = gpm / 20, d = Math.sqrt(ft2 * 4 / Math.PI) * 12; return result([row('Flow needed', `${num(gpm)} GPM`), row('Sand filter area, at 20 GPM/sq ft', `<strong>${num(ft2, 1)} sq ft</strong>`), row('Tank diameter, at least', `<strong>${num(d)} in</strong>`)], 'Oversizing is fine: a bigger filter runs longer between backwashes.'); },
  },
  sand: {
    inputs: [{ id: 'tank', label: 'Filter tank', options: [['16', '16 in'], ['18', '18 in'], ['21', '21 in'], ['22', '22 in'], ['24', '24 in']], value: '24' }],
    run: (v) => { const lb = { 16: 100, 18: 150, 21: 200, 22: 200, 24: 300 }[v.tank]; return result([row('#20 silica sand, about', `<strong>${lb} lb</strong>`), row('50 lb bags', Math.ceil(lb / 50))], 'Typical for this tank. The label on your filter is the final word, because models vary.'); },
  },
};
