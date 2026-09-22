import { boardKey, followsSolution, won } from "./game";
import type { Board, Move, Save } from "./game";
export { solve } from "./solver";
import { solve } from "./solver";
export type HintResult =
  | {
      status: "ready";
      path: Move[];
      board: Board;
      historyLength: number;
      rewind: number;
      reset?: boolean;
      reason: "current" | "dead-end" | "search-limit";
    }
  | { status: "unavailable" };
export function findHint(save: Save): HintResult {
  if (won(save.board, save.capacities)) return { status: "unavailable" };
  const result = solve(
    save.board,
    save.capacities,
    save.solution ? 20000 : 120000,
  );
  if (result.status === "solved")
    return {
      status: "ready",
      path: result.path,
      board: save.board,
      historyLength: save.history.length,
      rewind: 0,
      reason: "current",
    };
  if (
    save.solution?.length &&
    followsSolution(save.board, save.solution, save.capacities)
  )
    return {
      status: "ready",
      path: save.solution,
      board: save.board,
      historyLength: save.history.length,
      rewind: 0,
      reason: "current",
    };
  let remaining = 120000;
  for (let i = save.history.length - 1; i >= 0 && remaining > 0; i--) {
    const board = save.history[i];
    const path =
      boardKey(board) === boardKey(save.initial) &&
      save.initialSolution &&
      followsSolution(board, save.initialSolution, save.capacities)
        ? save.initialSolution
        : null;
    const earlier = path
      ? { status: "solved", path, visited: 0 }
      : solve(board, save.capacities, Math.min(15000, remaining));
    remaining -= earlier.visited;
    if (earlier.status === "solved" && earlier.path.length)
      return {
        status: "ready",
        path: earlier.path,
        board,
        historyLength: i,
        rewind: save.history.length - i,
        reason: result.status === "impossible" ? "dead-end" : "search-limit",
      };
  }
  if (
    save.initialSolution?.length &&
    followsSolution(save.initial, save.initialSolution, save.capacities)
  )
    return {
      status: "ready",
      path: save.initialSolution,
      board: save.initial,
      historyLength: 0,
      rewind: save.history.length,
      reset: boardKey(save.initial) !== boardKey(save.board),
      reason: result.status === "impossible" ? "dead-end" : "search-limit",
    };
  return { status: "unavailable" };
}
