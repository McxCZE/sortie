import { boardKey, complete, followsSolution, pour, won } from "./game";
import type { Board, Move, Save } from "./game";
export type SearchResult = {
  status: "solved" | "impossible" | "limit";
  path: Move[];
  visited: number;
};
export function solve(
  board: Board,
  capacities: number[],
  budget = 120000,
): SearchResult {
  const seen = new Set<string>(),
    path: Move[] = [];
  let visited = 0,
    limited = false;
  const canonical = (b: Board) =>
    b
      .map((v, i) => `${capacities[i]}:${v.join("")}`)
      .sort()
      .join("|");
  function visit(b: Board, depth: number): boolean {
    if (won(b, capacities)) return true;
    if (visited >= budget || depth > 400) {
      limited = true;
      return false;
    }
    const key = canonical(b);
    if (seen.has(key)) return false;
    seen.add(key);
    visited++;
    const candidates: { move: Move; board: Board; score: number }[] = [];
    b.forEach((a, from) => {
      if (!a.length || (capacities[from] === 4 && complete(a))) return;
      const emptyCaps = new Set<number>();
      b.forEach((dest, to) => {
        if (!dest.length) {
          if (emptyCaps.has(capacities[to])) return;
          emptyCaps.add(capacities[to]);
          if (capacities[from] === capacities[to] && a.every((c) => c === a[0]))
            return;
        }
        const next = pour(b, from, to, capacities);
        if (!next) return;
        candidates.push({
          move: { from, to },
          board: next,
          score:
            (complete(next[to]) ? 100 : 0) +
            (dest.length ? 20 : 0) +
            (!next[from].length ? 10 : 0),
        });
      });
    });
    candidates.sort((a, b) => b.score - a.score);
    for (const candidate of candidates) {
      path.push(candidate.move);
      if (visit(candidate.board, depth + 1)) return true;
      path.pop();
      if (visited >= budget) break;
    }
    return false;
  }
  return visit(board, 0)
    ? { status: "solved", path: [...path], visited }
    : { status: limited ? "limit" : "impossible", path: [], visited };
}
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
