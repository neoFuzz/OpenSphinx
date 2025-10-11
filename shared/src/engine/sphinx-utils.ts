import { Dir, Pos } from '../types';

/**
 * Checks if a Sphinx can face a specific direction from its position
 * @param pos - Position of the Sphinx
 * @param facing - Direction the Sphinx wants to face
 * @returns True if the facing direction is valid (not off the board)
 */
export function isValidSphinxFacing(pos: Pos, facing: Dir): boolean {
  // SPHINX cannot face off the board
  if (pos.r === 0 && facing === 'N') return false;
  if (pos.r === 7 && facing === 'S') return false;
  if (pos.c === 0 && facing === 'W') return false;
  if (pos.c === 9 && facing === 'E') return false;
  return true;
}

/**
 * Gets the next valid direction for Sphinx rotation (clockwise)
 * @param pos - Position of the Sphinx
 * @param currentFacing - Current facing direction
 * @returns Next valid direction or null if rotation not possible
 */
export function getNextValidSphinxDirection(pos: Pos, currentFacing: Dir): Dir | null {
  const dirs: Dir[] = ['N', 'E', 'S', 'W'];
  const currentIndex = dirs.indexOf(currentFacing);
  if (currentIndex === -1) return null;

  // Get all valid directions
  const validDirs = dirs.filter(dir => isValidSphinxFacing(pos, dir));
  if (validDirs.length <= 1) return null; // Can't rotate if only one valid direction

  // Find next valid direction clockwise
  let nextIndex = currentIndex;
  do {
    nextIndex = (nextIndex + 1) % dirs.length;
  } while (!validDirs.includes(dirs[nextIndex]));

  return dirs[nextIndex];
}

/**
 * Calculates the rotation delta needed for Sphinx to face next valid direction
 * @param pos - Position of the Sphinx
 * @param currentFacing - Current facing direction
 * @returns Rotation delta in degrees (90 or -90) or null if no rotation possible
 */
export function getSphinxRotationDelta(pos: Pos, currentFacing: Dir): 90 | -90 | null {
  const nextDir = getNextValidSphinxDirection(pos, currentFacing);
  if (!nextDir) return null;

  const dirs: Dir[] = ['N', 'E', 'S', 'W'];
  const currentIndex = dirs.indexOf(currentFacing);
  const nextIndex = dirs.indexOf(nextDir);

  const delta = (nextIndex - currentIndex + 4) % 4;
  return delta <= 2 ? (delta * 90) as 90 | -90 : ((delta - 4) * 90) as 90 | -90;
}