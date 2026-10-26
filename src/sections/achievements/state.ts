/** Achievements shared state (index.ts ↔ view.ts). Owner: WP-09. */
export const pressState = {
  /** "Ink it" pressed. */
  ink: false,
  /** Light-angle range 0 (high, 35°) … 1 (grazing, 8°); `lightSet` once the visitor touched it. */
  light: 0,
  lightSet: false,
  /** Wakes the stage (set once the stage exists). */
  wake: (): void => {},
};
