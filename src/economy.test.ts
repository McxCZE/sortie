import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buyBottle,
  buyLook,
  commitMove,
  createGame,
  DEFAULT_EQUIPMENT,
  DIFFICULTIES,
  followsSolution,
  level,
  levelInfo,
  nextLevel,
  pour,
  PRICES,
  restartLevel,
  restore,
  won,
} from "./game";
import { findHint, solve } from "./hints";
afterEach(() => vi.unstubAllGlobals());

describe("endless difficulty cycle", () => {
  it("repeats the reward rhythm and supports levels beyond 1000 and 10000", () => {
    expect([1, 2, 3, 4, 5].map((n) => levelInfo(n).reward)).toEqual([
      10, 10, 10, 15, 25,
    ]);
    for (const n of [1, 5, 20, 21, 81, 201, 999, 1000, 1001, 10001, 1000001]) {
      const puzzle = level(n);
      expect(puzzle).toEqual(level(n));
      expect(won(puzzle.board)).toBe(false);
      expect(followsSolution(puzzle.board, puzzle.solution)).toBe(true);
      expect(puzzle.board.length).toBeLessThanOrEqual(8);
    }
  });
  it("selects more fragmented challenges on average and eases the next cycle", () => {
    let easy = 0,
      hard = 0;
    for (let n = 201; n <= 296; n += 5) {
      easy += level(n).score;
      hard += level(n + 4).score;
    }
    expect(hard).toBeGreaterThan(easy * 1.15);
  });
});
describe("purchases and saved progress", () => {
  it("keeps paid bottles through undo, restart and reload, clears them next level", () => {
    let g = createGame();
    g.coins = 100;
    g = commitMove(g, g.solution![0]);
    g = buyBottle(g, "small");
    g = buyBottle(g, "large");
    expect(g.coins).toBe(15);
    expect(g.capacities.slice(-2)).toEqual([1, 4]);
    expect(g.history.every((b) => b.length === g.board.length)).toBe(true);
    expect(buyBottle(g, "small")).toBe(g);
    const reset = restartLevel(g);
    expect(reset.capacities).toEqual(g.capacities);
    expect(reset.coins).toBe(15);
    expect(reset.board.slice(-2)).toEqual([[], []]);
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(g) });
    expect(restore()).toEqual(g);
    const next = nextLevel(g);
    expect(next.board.length).toBe(level(2).board.length);
    expect(next.coins).toBe(15);
  });
  it("enforces the one-unit capacity and requires the small bottle to be empty", () => {
    expect(pour([[0, 0], []], 0, 1, [4, 1])).toEqual([[0], [0]]);
    expect(pour([[0], [0]], 0, 1, [4, 1])).toBeNull();
    expect(won([[0, 0, 0, 0], [1]], [4, 1])).toBe(false);
    expect(won([[0, 0, 0, 0], []], [4, 1])).toBe(true);
  });
  it("does not overspend and charges permanent looks only once", () => {
    const poor = createGame();
    expect(buyBottle(poor, "large")).toBe(poor);
    expect(buyLook(poor, "amethyst")).toBe(poor);
    let g = { ...createGame(), coins: 1200 };
    for (const id of ["amethyst", "gold", "aurora", "sparkles"] as const)
      g = buyLook(g, id);
    expect(g.coins).toBe(50);
    expect(g.owned).toHaveLength(4);
    expect(g.equipment).toEqual({
      glass: "amethyst",
      base: "gold",
      background: "aurora",
      effect: "sparkles",
    });
    expect(buyLook(g, "amethyst").coins).toBe(50);
    expect(nextLevel(g).equipment).toEqual(g.equipment);
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(g) });
    expect(restore().owned).toEqual(g.owned);
  });
  it("preserves legacy level, wallet, board and history with a restart witness", () => {
    const board = level(1000).board;
    const legacy = {
      level: 1000,
      board,
      history: [],
      coins: 123,
      rewardedThrough: 999,
      sound: true,
    };
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(legacy) });
    const migrated = restore();
    expect(migrated).toMatchObject(legacy);
    expect(migrated.equipment).toEqual(DEFAULT_EQUIPMENT);
    expect(
      followsSolution(
        migrated.initial,
        migrated.initialSolution,
        migrated.capacities,
      ),
    ).toBe(true);
  });
  it("pays difficulty rewards even after using purchased helpers", () => {
    let g = { ...createGame(5), coins: 100 };
    g = buyBottle(g, "large");
    for (const move of [...g.solution!]) g = commitMove(g, move);
    expect(won(g.board, g.capacities)).toBe(true);
    expect(g.coins).toBe(100 - PRICES.large + DIFFICULTIES.challenge.reward);
  });
});
describe("verified hints", () => {
  it("finds a genuine solution after departing from the stored witness", () => {
    const g = { ...createGame(25), solution: null };
    const hint = findHint(g);
    expect(hint.status).toBe("ready");
    if (hint.status === "ready") {
      expect(hint.rewind).toBe(0);
      expect(followsSolution(hint.board, hint.path, g.capacities)).toBe(true);
    }
    expect(g.coins).toBe(0);
  });
  it("solves using a one-unit helper without treating it as a finished bottle", () => {
    const g = buyBottle({ ...createGame(15), coins: 100 }, "small"),
      result = solve(g.board, g.capacities);
    expect(result.status).toBe("solved");
    expect(followsSolution(g.board, result.path, g.capacities)).toBe(true);
  });
  it("distinguishes a proven dead end and offers a verified rewind", () => {
    const dead = [
      [2, 3, 0, 0],
      [2, 3, 1, 1],
      [4, 5, 0, 0],
      [4, 5, 1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ];
    const g = createGame(205);
    g.history = [g.board];
    g.board = dead;
    g.solution = null;
    expect(solve(dead, g.capacities).status).toBe("impossible");
    const hint = findHint(g);
    expect(hint.status).toBe("ready");
    if (hint.status === "ready") {
      expect(hint.rewind).toBe(1);
      expect(hint.reason).toBe("dead-end");
      expect(followsSolution(hint.board, hint.path, g.capacities)).toBe(true);
    }
  });
  it("does not claim a budget-limited search proves impossibility", () => {
    const g = createGame(205);
    expect(solve(g.board, g.capacities, 0).status).toBe("limit");
  });
});

it("explicitly marks a fallback reset even without retained history", () => {
  const g = createGame(205);
  g.board = [
    [2, 3, 0, 0],
    [2, 3, 1, 1],
    [4, 5, 0, 0],
    [4, 5, 1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ];
  g.solution = null;
  const hint = findHint(g);
  expect(hint.status).toBe("ready");
  if (hint.status === "ready") {
    expect(hint.reset).toBe(true);
    expect(hint.rewind).toBe(0);
  }
});
