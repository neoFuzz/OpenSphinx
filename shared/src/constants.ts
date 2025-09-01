
export const ROWS = 8;
export const COLS = 10;

export const inBounds = (r: number, c: number) =>
  r >= 0 && r < ROWS && c >= 0 && c < COLS;
