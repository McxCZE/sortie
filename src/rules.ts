export type Board = number[][];
export type Move = { from: number; to: number };
export const CAPACITY = 4;
export const complete = (b: number[]) =>
  b.length === 4 && b.every((c) => c === b[0]);
export const won = (board: Board, capacities?: number[]) =>
  board.length > 0 &&
  board.every(
    (b, i) => !b.length || ((capacities?.[i] ?? 4) === 4 && complete(b)),
  );
export function pour(
  board: Board,
  from: number,
  to: number,
  capacities?: number[],
): Board | null {
  const a = board[from],
    b = board[to],
    capacity = capacities?.[to] ?? 4;
  if (!a || !b || from === to || !a.length || b.length >= capacity) return null;
  const color = a.at(-1)!;
  if (b.length && b.at(-1) !== color) return null;
  let run = 0;
  for (let i = a.length - 1; i >= 0 && a[i] === color; i--) run++;
  const amount = Math.min(run, capacity - b.length);
  return board.map((b, i) =>
    i === from
      ? b.slice(0, -amount)
      : i === to
        ? [...b, ...Array<number>(amount).fill(color)]
        : [...b],
  );
}
export function boardKey(board: Board) {
  return board.map((b) => b.join("")).join("|");
}
export function followsSolution(
  board: Board,
  solution: Move[] | null,
  capacities?: number[],
): boolean {
  if (!solution || solution.length > 2000) return false;
  let next = board;
  for (const m of solution) {
    const b = pour(next, m.from, m.to, capacities);
    if (!b) return false;
    next = b;
  }
  return won(next, capacities);
}
