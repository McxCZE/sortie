import { afterEach, describe, expect, it, vi } from "vitest";
import {
  level,
  pour,
  validBoard,
  won,
  rewardVictory,
  LEVEL_REWARD,
  restore,
} from "./game";
afterEach(() => vi.unstubAllGlobals());
describe("pour rules", () => {
  it("moves the maximal top run without mutating input", () => {
    const b = [[0, 1, 1], [1], []];
    expect(pour(b, 0, 1)).toEqual([[0], [1, 1, 1], []]);
    expect(b).toEqual([[0, 1, 1], [1], []]);
  });
  it("respects capacity and rejects illegal moves", () => {
    expect(
      pour(
        [
          [0, 0, 0],
          [0, 0, 0],
        ],
        0,
        1,
      ),
    ).toEqual([
      [0, 0],
      [0, 0, 0, 0],
    ]);
    expect(pour([[0], [1]], 0, 1)).toBeNull();
    expect(pour([[], []], 0, 1)).toBeNull();
    expect(pour([[0], []], 0, 0)).toBeNull();
    expect(pour([[0], [0, 0, 0, 0]], 0, 1)).toBeNull();
  });
  it("requires full single-colour bottles", () => {
    expect(won([[0], [1], []])).toBe(false);
    expect(won([[0, 0, 0, 0], []])).toBe(true);
  });
});
it("generates deterministic, unsolved, provably solvable levels", () => {
  for (let n = 1; n <= 200; n++) {
    const puzzle = level(n);
    let board = puzzle.board;
    expect(board).toEqual(level(n).board);
    expect(won(board)).toBe(false);
    expect(validBoard(board, n)).toBe(true);
    for (const m of puzzle.solution) {
      const next = pour(board, m.from, m.to);
      expect(next, `level ${n}`).not.toBeNull();
      board = next!;
    }
    expect(won(board), `level ${n}`).toBe(true);
  }
});
it("rejects corrupt saved boards", () => {
  expect(validBoard([[9]], 1)).toBe(false);
  expect(validBoard(null, 1)).toBe(false);
  expect(validBoard([[], [], [], [], []], 1)).toBe(false);
});

describe("coins for victories", () => {
  const solved = [[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [], []];
  const save = {
    level: 1,
    board: solved,
    history: [],
    sound: false,
    coins: 0,
    rewardedThrough: 0,
  };
  it("awards once, including after undo or restart and solving again", () => {
    const earned = rewardVictory(save);
    expect(earned.coins).toBe(LEVEL_REWARD);
    expect(rewardVictory(earned)).toEqual(earned);
    expect(rewardVictory({ ...earned, board: level(1).board }).coins).toBe(
      LEVEL_REWARD,
    );
    expect(rewardVictory({ ...earned, board: solved }).coins).toBe(
      LEVEL_REWARD,
    );
    expect(rewardVictory({ ...earned, level: 2 }).coins).toBe(2 * LEVEL_REWARD);
    expect(save.coins).toBe(0);
  });
  it("does not pay for unfinished puzzles", () => {
    expect(rewardVictory({ ...save, board: level(1).board }).coins).toBe(0);
  });
  it("preserves old progress and restores new wallets without paying again", () => {
    const legacy = {
      level: 7,
      board: level(7).board,
      history: [],
      sound: true,
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(legacy) });
    const migrated = restore();
    expect(migrated).toMatchObject({ ...legacy, coins: 0, rewardedThrough: 6 });
    const earned = rewardVictory(save);
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(earned) });
    expect(rewardVictory(restore())).toMatchObject(earned);
  });
  it("repairs malformed wallet fields without discarding the puzzle", () => {
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          ...save,
          board: level(1).board,
          coins: -20,
          rewardedThrough: "bad",
        }),
    });
    expect(restore()).toMatchObject({
      board: level(1).board,
      coins: 0,
      rewardedThrough: 0,
    });
  });
});
