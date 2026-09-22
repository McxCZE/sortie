// A real pre-expert puzzle family used to verify migration and recovery.
import { createGame, legacyLevel, levelInfo } from "../game";
import type { Save } from "../game";
export function legacySave(number = 205): Save {
  const puzzle = legacyLevel(number),
    info = levelInfo(number);
  return {
    ...createGame(1),
    level: number,
    generation: 2,
    board: structuredClone(puzzle.board),
    initial: structuredClone(puzzle.board),
    capacities: puzzle.board.map(() => 4),
    baseBottleCount: puzzle.board.length,
    initialSolution: puzzle.solution,
    solution: puzzle.solution,
    difficulty: info.difficulty,
    reward: info.reward,
  };
}
