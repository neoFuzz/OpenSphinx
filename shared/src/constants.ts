
/** Number of rows on the game board */
export const ROWS = 8;
/** Number of columns on the game board */
export const COLS = 10;

/**
 * Checks if coordinates are within the game board bounds
 * @param r - Row coordinate
 * @param c - Column coordinate
 * @returns True if coordinates are within bounds
 */
export const inBounds = (r: number, c: number) =>
  r >= 0 && r < ROWS && c >= 0 && c < COLS;
