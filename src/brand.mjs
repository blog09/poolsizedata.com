// Brand: logo mark, homepage illustration, colours. Inline SVG only (no requests).
export const NAME = ['Pool', 'SizeData'];
export const COLORS = { bg: '#0c4a6e', hi: '#67e8f9', accent: '#0e7490' };
export const DOMAIN = 'poolsizedata.com';
export const TAGLINE = ['Pool sizes and chemical doses', 'Calculators with the maths shown'];
const FONT = 'font-family="system-ui,Segoe UI,Arial,sans-serif"';

// Water with a depth gauge.
export const mark = (size = 34) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
<rect width="40" height="40" rx="9" fill="#0c4a6e"/>
<path d="M4 17c4-4 8-4 12 0s8 4 12 0 6-3 8-1v16a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#22d3ee"/>
<path d="M4 25c4-4 8-4 12 0s8 4 12 0 6-3 8-1" fill="none" stroke="#fff" stroke-width="2"/>
<path d="M27 4v10M24 7h6" stroke="#fbbf24" stroke-width="2.4" stroke-linecap="round"/></svg>`;

// Homepage: a pool plan with its dimensions.
export const hero = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 232" role="img" aria-label="A 16 by 32 foot pool plan, holding about 17,000 gallons">
<rect width="360" height="232" rx="14" fill="#ecfeff"/>
<rect x="44" y="50" width="272" height="130" rx="10" fill="#22d3ee" stroke="#0c4a6e" stroke-width="4"/>
<path d="M60 92c14-9 28-9 42 0s28 9 42 0 28-9 42 0 28 9 42 0 28-9 42 0M60 134c14-9 28-9 42 0s28 9 42 0 28-9 42 0 28 9 42 0 28-9 42 0" fill="none" stroke="#a5f3fc" stroke-width="3"/>
<text x="180" y="122" text-anchor="middle" ${FONT} font-size="22" font-weight="800" fill="#0c4a6e">17,000 gal</text>
<path d="M44 30h272M44 24v12M316 24v12" stroke="#0c4a6e" stroke-width="2"/><text x="180" y="22" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="#0c4a6e">32 ft</text>
<path d="M332 50v130M326 50h12M326 180h12" stroke="#0c4a6e" stroke-width="2"/><text x="344" y="120" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="#0c4a6e" transform="rotate(90 344 115)">16 ft</text>
<text x="44" y="210" ${FONT} font-size="13" fill="#0c4a6e">3 to 6 ft floor: 16 × 32 × 4.5 × 7.48</text></svg>`;
