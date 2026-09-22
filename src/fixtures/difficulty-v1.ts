// Measured with level() at commit 0cc8659 before the 35% difficulty adjustment.
// Score = fragments * 5 + buried colours * 3 + certified solution length * 0.15.
export const difficultyBaseline = [
  {
    from: 1,
    to: 20,
    scoreSum: 977.8,
  },
  {
    from: 21,
    to: 80,
    scoreSum: 3741.0,
  },
  {
    from: 81,
    to: 200,
    scoreSum: 9377.65,
  },
  {
    from: 201,
    to: 1000,
    scoreSum: 75049.85,
  },
] as const;
