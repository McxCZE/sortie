import { complete, pour, won } from "./rules";
import type { Board, Move } from "./rules";
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
      if (visited >= budget) {
        limited = true;
        break;
      }
    }
    return false;
  }
  return visit(board, 0)
    ? { status: "solved", path: [...path], visited }
    : { status: limited ? "limit" : "impossible", path: [], visited };
}
