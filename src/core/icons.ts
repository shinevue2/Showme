/**
 * Icon set (DESIGN §3.7). Owner: WP-02. Inline SVG strings drawn on a 24 px grid: 1.5 px stroke, square
 * caps, mitre joins, `currentColor`, no fills except the eye's pupil and the theme chips' front swatch.
 * Node-safe (imported by render modules). Every icon is decorative (`aria-hidden`); the control that
 * carries it supplies the accessible name.
 */
export const ICON_NAMES = [
  'eye', 'eye-off', 'wheel', 'chip-day', 'chip-night', 'info', 'outline', 'proof', 'layers', 'separations',
  'download', 'copy', 'external', 'close', 'menu', 'play-skip', 'rerake', 'ink', 'seal', 'arrow-rtl',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const svg = (body: string): string =>
  `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${body}</svg>`;

/* Illustrator's eye: a pointed almond, square pupil. */
const ALMOND = '<path d="M2 12C5 7.4 8.3 5.25 12 5.25S19 7.4 22 12c-3 4.6-6.3 6.75-10 6.75S5 16.6 2 12z"/>';
const PUPIL = '<path d="M10 10h4v4h-4z" fill="currentColor" stroke="none"/>';

/* Wang Zhen's revolving type table (王禎 轉輪排字架, 1313): rim, three spokes, sorts set on the rim. */
const WHEEL =
  '<path d="M12 3.75a8.25 8.25 0 1 1 0 16.5 8.25 8.25 0 0 1 0-16.5z"/>' +
  '<path d="M12 12V3.75M12 12l7.14 4.13M12 12l-7.14 4.13" stroke-linecap="butt"/>' +
  '<path d="M14.80 6.89h1.9v1.9h-1.9zM16.53 9.89h1.9v1.9h-1.9zM12.78 16.38h1.9v1.9h-1.9zM9.32 16.38h1.9v1.9h-1.9zM5.57 9.89h1.9v1.9h-1.9zM7.30 6.89h1.9v1.9h-1.9z" fill="currentColor" stroke="none"/>';

/* Swatch chips: the front chip carries the theme's paper (卯の花 WD day / 瑠璃 NC night, tokens --paper). */
const chip = (paper: string): string =>
  '<path d="M3.75 3.75h11v11h-11z"/>' +
  `<path d="M9.25 9.25h11v11h-11z" fill="${paper}"/>`;

export const ICONS: Readonly<Record<IconName, string>> = {
  eye: svg(ALMOND + PUPIL),
  'eye-off': svg(ALMOND + PUPIL + '<path d="M4.5 19.5 19.5 4.5"/>'),
  wheel: svg(WHEEL),
  'chip-day': svg(chip('#F7FCFE')),
  'chip-night': svg(chip('#005CAF')),
  /* ruler corner: an L with ticks along both arms */
  info: svg('<path d="M4.75 3.75v15.5h15.5"/><path d="M4.75 7.75h3M4.75 11.75h2M4.75 15.75h3M8.75 19.25v-3M12.75 19.25v-2M16.75 19.25v-3"/>'),
  /* Illustrator's outline view: the frame with its diagonals */
  outline: svg('<path d="M4.75 4.75h14.5v14.5H4.75z"/><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" stroke-linecap="butt"/>'),
  /* a sheet inside four crop marks */
  proof: svg('<path d="M7.75 6.75h8.5v10.5h-8.5z"/><path d="M2.75 6.75h2.5M7.75 1.75v2.5M21.25 6.75h-2.5M16.25 1.75v2.5M2.75 17.25h2.5M7.75 22.25v-2.5M21.25 17.25h-2.5M16.25 22.25v-2.5"/>'),
  /* three stacked parallelograms */
  layers: svg('<path d="M7.25 4.25h13l-3.5 3.5h-13zM7.25 10.25h13l-3.5 3.5h-13zM7.25 16.25h13l-3.5 3.5h-13z"/>'),
  /* four plates printed slightly out of register: only the front plate is whole */
  separations: svg('<path d="M10.75 10.75h10v10h-10z"/><path d="M7.75 17.75v-10h10"/><path d="M4.75 14.75v-10h10"/><path d="M1.75 11.75v-10h10"/>'),
  /* an arrow into a tray */
  download: svg('<path d="M12 2.75v11.5M7.25 9.75 12 14.5l4.75-4.75"/><path d="M3.75 15.25v5h16.5v-5"/>'),
  /* two offset sheets */
  copy: svg('<path d="M9.25 9.25h11v11h-11z"/><path d="M14.75 6.25v-2.5h-11v11h2.5"/>'),
  /* an arrow leaving a kentō L */
  external: svg('<path d="M3.75 9.25v11h11"/><path d="M9.75 14.25 20.25 3.75M13.25 3.75h7v7"/>'),
  close: svg('<path d="M5.75 5.75l12.5 12.5M18.25 5.75 5.75 18.25"/>'),
  /* 子持ち罫: a thick rule with its thin companion */
  menu: svg('<path d="M3.75 8.5h16.5" stroke-width="3"/><path d="M3.75 14.75h16.5"/>'),
  'play-skip': svg('<path d="M4.75 6.25 10.5 12l-5.75 5.75M12.75 6.25 18.5 12l-5.75 5.75"/>'),
  /* a rake head: bar, five tines, handle */
  rerake: svg('<path d="M3.75 10.75h16.5"/><path d="M4.5 10.75v7M8.25 10.75v7M12 10.75v7M15.75 10.75v7M19.5 10.75v7"/><path d="M12 10.75V2.75"/>'),
  /* a brush: ferrule and a tip drawn to a point */
  ink: svg('<path d="M10.25 2.75h3.5v6.5h-3.5z"/><path d="M9.25 9.25h5.5c0 5-1.25 8.6-2.75 12-1.5-3.4-2.75-7-2.75-12z"/>'),
  /* a seal face with the notch that marks its top */
  seal: svg('<path d="M4.25 4.25h5.75L12 6.5l2-2.25h5.75v15.5H4.25z"/><path d="M8.25 9.75h7.5v6h-7.5z"/>'),
  /* ← reading direction, with a kentō foot at its tail */
  'arrow-rtl': svg('<path d="M20.25 10.5H4.25M9.25 5.5l-5 5 5 5"/><path d="M20.25 15.25v4h-4"/>'),
};

export function icon(name: IconName): string {
  return ICONS[name];
}
