import { boardKey, followsSolution, pour, won } from "./rules";
import type { Board, Move } from "./rules";
import { solve } from "./solver";
export {
  CAPACITY,
  complete,
  won,
  pour,
  boardKey,
  followsSolution,
} from "./rules";
export type { Board, Move } from "./rules";
export const COLORS = [
  "#9854f5",
  "#ff902c",
  "#1fd6a0",
  "#f44798",
  "#3c9eff",
  "#f6cc32",
  "#15d6ec",
  "#b96945",
];
export const NAMES = [
  "levandulová",
  "broskvová",
  "mátová",
  "růžová",
  "modrá",
  "zlatá",
  "tyrkysová",
  "měděná",
];
export const LEVEL_REWARD = 10;
export const PRICES = { hint: 10, small: 25, large: 60 } as const;
export type Difficulty = "easy" | "normal" | "hard" | "challenge";
export const DIFFICULTIES: Record<
  Difficulty,
  { name: string; reward: number }
> = {
  easy: { name: "Oddech", reward: 10 },
  normal: { name: "Běžná", reward: 10 },
  hard: { name: "Těžká", reward: 15 },
  challenge: { name: "Výzva", reward: 25 },
};
export function levelInfo(number: number) {
  const phase = (number - 1) % 5,
    difficulty: Difficulty =
      phase === 0
        ? "easy"
        : phase === 3
          ? "hard"
          : phase === 4
            ? "challenge"
            : "normal";
  const colors = (number < 11 ? [5, 6, 6, 7, 8] : [6, 7, 7, 8, 8])[phase];
  return {
    difficulty,
    ...DIFFICULTIES[difficulty],
    colors,
    phase,
    spareBottles: 1,
    searchTarget: [40, 60, 75, 95, 130][phase],
  };
}
export type LookCategory = "glass" | "base" | "background" | "effect";
export const LOOKS = [
  {
    id: "amethyst",
    category: "glass",
    name: "Ametystové sklo",
    description: "Fialově tónované hrdlo a jemné odlesky.",
    price: 150,
  },
  {
    id: "gold",
    category: "base",
    name: "Zlaté podložky",
    description: "Zlatý podstavec pod každou lahvičkou.",
    price: 200,
  },
  {
    id: "aurora",
    category: "background",
    name: "Polární záře",
    description: "Tyrkysové a fialové světlo v pozadí.",
    price: 300,
  },
  {
    id: "sparkles",
    category: "effect",
    name: "Jiskřivý lektvar",
    description: "Drobné barevné jiskry kolem proudu.",
    price: 500,
  },
] as const;
export type LookId = (typeof LOOKS)[number]["id"];
export type Equipment = Record<LookCategory, string>;
export const DEFAULT_EQUIPMENT: Equipment = {
  glass: "default",
  base: "default",
  background: "default",
  effect: "default",
};
function seedFor(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function scramble(colors: number, seed: number, steps: number) {
  let state = seed;
  const random = (n: number) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % n;
  };
  const board: Board = Array.from({ length: colors }, (_, i) =>
    Array<number>(4).fill(i),
  ).concat([[]]);
  let solution: Move[] = [];
  const seen = new Map<string, Move[]>();
  seen.set(boardKey(board), []);
  for (let step = 0; step < steps; step++) {
    const options: { from: number; to: number; amount: number }[] = [];
    board.forEach((a, from) => {
      if (!a.length) return;
      const color = a.at(-1)!;
      let run = 0;
      for (let i = a.length - 1; i >= 0 && a[i] === color; i--) run++;
      board.forEach((b, to) => {
        if (from === to || b.length === 4 || b.at(-1) === color) return;
        for (let amount = 1; amount <= Math.min(run, 4 - b.length); amount++) {
          if (
            (amount === run && a.length > run) ||
            (!b.length && amount === a.length)
          )
            continue;
          options.push({ from, to, amount });
        }
      });
    });
    if (!options.length) break;
    const m = options[random(options.length)];
    board[m.to].push(...board[m.from].splice(-m.amount));
    solution = [{ from: m.to, to: m.from }, ...solution];
    const key = boardKey(board),
      old = seen.get(key);
    if (old) solution = old;
    else seen.set(key, solution);
  }
  return { board, solution, score: puzzleScore(board, solution.length) };
}
export function puzzleScore(board: Board, moves: number) {
  const colors = new Set(board.flat()).size;
  const fragments =
    board.reduce(
      (sum, b) => sum + b.filter((c, i) => i === 0 || c !== b[i - 1]).length,
      0,
    ) - colors;
  const buried = board.reduce(
    (sum, b) => sum + new Set(b).size - (b.length ? 1 : 0),
    0,
  );
  return fragments * 5 + buried * 3 + moves * 0.15;
}
function shuffledBoard(colors: number, seed: number, distinct: boolean): Board {
  let state = seed;
  const random = (n: number) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % n;
  };
  const pool = Array.from({ length: colors * 4 }, (_, i) => Math.floor(i / 4));
  const board: Board = [];
  for (let i = 0; i < colors; i++) {
    const b: number[] = [];
    for (let j = 0; j < 4; j++) {
      let choices = pool
        .map((_, i) => i)
        .filter((i) => !distinct || !b.includes(pool[i]));
      if (!choices.length) choices = pool.map((_, i) => i);
      b.push(...pool.splice(choices[random(choices.length)], 1));
    }
    board.push(b);
  }
  return [...board, []];
}
export const DIFFICULTY_GENERATION = 3;
export type Puzzle = {
  board: Board;
  solution: Move[];
  score: number;
  searchEffort: number;
};
const cache = new Map<number, Puzzle>();
export function level(number: number): Puzzle {
  const cached = cache.get(number);
  if (cached) return structuredClone(cached);
  const info = levelInfo(number),
    target = info.searchTarget;
  let best: Puzzle | null = null,
    fallback: Puzzle | null = null;
  for (let i = 0; i < 384; i++) {
    const seed = seedFor(`expert:${number}:${i}`);
    const reverse = i % 4 !== 0 ? scramble(info.colors, seed, 120) : null;
    const board =
      reverse?.board ?? shuffledBoard(info.colors, seed, i % 8 === 0);
    const result = solve(
      board,
      board.map(() => 4),
      6000,
    );
    if (reverse && !fallback)
      fallback = { ...reverse, searchEffort: result.visited };
    if (result.status !== "solved" || !result.path.length) continue;
    const candidate = {
      board,
      solution: result.path,
      score: puzzleScore(board, result.path.length),
      searchEffort: result.visited,
    };
    if (!fallback || candidate.solution.length > fallback.solution.length)
      fallback = candidate;
    if (result.path.length < Math.ceil(info.colors * 2.5)) continue;
    if (
      !best ||
      Math.abs(candidate.searchEffort - target) <
        Math.abs(best.searchEffort - target)
    )
      best = candidate;
    if (Math.abs(best.searchEffort - target) < target * 0.05) break;
  }
  const result = best ?? fallback;
  if (!result || won(result.board))
    throw new Error("Nepodařilo se připravit řešitelnou úroveň.");
  cache.set(number, result);
  if (cache.size > 30) cache.delete(cache.keys().next().value!);
  return structuredClone(result);
}
// Frozen generator used only to recover the starting layout of pre-upgrade saves.
export function legacyLevel(number: number) {
  let seed = number * 7919 + 17;
  const random = (n: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  const count = Math.min(6, 3 + Math.floor((number - 1) / 4));
  const board: Board = Array.from({ length: count }, (_, i) =>
    Array<number>(4).fill(i),
  ).concat([[], []]);
  const solution: Move[] = [];
  for (let step = 0; step < Math.min(180, 28 + number * 3); step++) {
    const options: { from: number; to: number; amount: number }[] = [];
    board.forEach((a, from) => {
      if (!a.length) return;
      const color = a.at(-1)!;
      let run = 0;
      for (let i = a.length - 1; i >= 0 && a[i] === color; i--) run++;
      board.forEach((b, to) => {
        if (from === to || b.length === 4 || b.at(-1) === color) return;
        for (let amount = 1; amount <= Math.min(run, 4 - b.length); amount++) {
          if (
            (amount === run && a.length > run) ||
            (!b.length && amount === a.length)
          )
            continue;
          options.push({ from, to, amount });
        }
      });
    });
    if (!options.length) break;
    const m = options[random(options.length)];
    board[m.to].push(...board[m.from].splice(-m.amount));
    solution.unshift({ from: m.to, to: m.from });
  }
  return { board, solution };
}
export type Save = {
  version: 3;
  generation: number;
  baseBottleCount: number;
  level: number;
  board: Board;
  initial: Board;
  capacities: number[];
  initialSolution: Move[] | null;
  solution: Move[] | null;
  hint: Move | null;
  history: Board[];
  sound: boolean;
  coins: number;
  rewardedThrough: number;
  owned: LookId[];
  equipment: Equipment;
  difficulty: Difficulty;
  reward: number;
};
export function createGame(number = 1): Save {
  const puzzle = level(number),
    info = levelInfo(number);
  return {
    version: 3,
    generation: DIFFICULTY_GENERATION,
    baseBottleCount: puzzle.board.length,
    level: number,
    board: puzzle.board,
    initial: structuredClone(puzzle.board),
    capacities: puzzle.board.map(() => 4),
    initialSolution: puzzle.solution,
    solution: puzzle.solution,
    hint: null,
    history: [],
    sound: false,
    coins: 0,
    rewardedThrough: 0,
    owned: [],
    equipment: { ...DEFAULT_EQUIPMENT },
    difficulty: info.difficulty,
    reward: info.reward,
  };
}
export function rewardVictory<
  T extends {
    level: number;
    board: Board;
    coins: number;
    rewardedThrough: number;
    capacities?: number[];
    reward?: number;
  },
>(save: T): T {
  if (!won(save.board, save.capacities) || save.level <= save.rewardedThrough)
    return save;
  return {
    ...save,
    coins: save.coins + (save.reward ?? levelInfo(save.level).reward),
    rewardedThrough: save.level,
  };
}
export function commitMove(save: Save, move: Move): Save {
  const board = pour(save.board, move.from, move.to, save.capacities);
  if (!board) return save;
  const first = save.solution?.[0];
  return rewardVictory({
    ...save,
    board,
    hint: null,
    history: [...save.history, save.board].slice(-1000),
    solution:
      first?.from === move.from && first?.to === move.to
        ? save.solution!.slice(1)
        : null,
  });
}
export function restartLevel(save: Save): Save {
  return {
    ...save,
    board: structuredClone(save.initial),
    hint: null,
    history: [],
    solution: save.initialSolution,
  };
}
export function nextLevel(save: Save): Save {
  const fresh = createGame(save.level + 1);
  return {
    ...fresh,
    coins: save.coins,
    rewardedThrough: save.rewardedThrough,
    owned: save.owned,
    equipment: save.equipment,
    sound: save.sound,
  };
}
export function buyBottle(save: Save, kind: "small" | "large"): Save {
  const capacity = kind === "small" ? 1 : 4,
    baseCount = save.baseBottleCount;
  if (
    won(save.board, save.capacities) ||
    save.coins < PRICES[kind] ||
    save.capacities.slice(baseCount).includes(capacity)
  )
    return save;
  const add = (b: Board) => [...b.map((x) => [...x]), []];
  return {
    ...save,
    coins: save.coins - PRICES[kind],
    hint: null,
    capacities: [...save.capacities, capacity],
    board: add(save.board),
    initial: add(save.initial),
    history: save.history.map(add),
  };
}
export function buyLook(save: Save, id: LookId): Save {
  const item = LOOKS.find((x) => x.id === id);
  if (!item) return save;
  if (save.owned.includes(id))
    return { ...save, equipment: { ...save.equipment, [item.category]: id } };
  if (save.coins < item.price) return save;
  return {
    ...save,
    coins: save.coins - item.price,
    owned: [...save.owned, id],
    equipment: { ...save.equipment, [item.category]: id },
  };
}
export function validBoard(
  value: unknown,
  number: number,
  capacities?: number[],
): value is Board {
  if (
    !Number.isSafeInteger(number) ||
    number < 1 ||
    !Array.isArray(value) ||
    value.length < 4 ||
    value.length > 12
  )
    return false;
  if (capacities && capacities.length !== value.length) return false;
  if (
    !value.every(
      (b, i) =>
        Array.isArray(b) &&
        b.length <= (capacities?.[i] ?? 4) &&
        b.every((c) => Number.isInteger(c) && c >= 0 && c < COLORS.length),
    )
  )
    return false;
  const colors = new Set<number>(value.flat());
  if (colors.size < 3 || colors.size > COLORS.length) return false;
  if (value.length < colors.size + 1 || value.length > colors.size + 4)
    return false;
  return Array.from(
    { length: colors.size },
    (_, c) => value.flat().filter((v) => v === c).length,
  ).every((n) => n === 4);
}
function validPlan(
  value: unknown,
  board: Board,
  capacities: number[],
): value is Move[] {
  return (
    Array.isArray(value) &&
    value.length <= 2000 &&
    value.every(
      (m) => m && Number.isInteger(m.from) && Number.isInteger(m.to),
    ) &&
    followsSolution(board, value, capacities)
  );
}
export function restore(): Save {
  try {
    const s = JSON.parse(localStorage.getItem("sortie-save-v1") || "null");
    if (!s || !Number.isSafeInteger(s.level) || s.level < 1)
      return createGame();
    const caps =
      Array.isArray(s.capacities) &&
      s.capacities.every((n: unknown) => n === 1 || n === 4)
        ? s.capacities
        : s.board?.map(() => 4);
    if (!caps || !validBoard(s.board, s.level, caps)) return createGame();
    const colorCount = new Set(s.board.flat()).size;
    const baseCount =
      Number.isInteger(s.baseBottleCount) &&
      [colorCount + 1, colorCount + 2].includes(s.baseBottleCount)
        ? s.baseBottleCount
        : Math.min(colorCount + 2, caps.length);
    const extras = caps.slice(baseCount);
    if (
      !caps.slice(0, baseCount).every((n: number) => n === 4) ||
      extras.length > 2 ||
      new Set(extras).size !== extras.length
    )
      return createGame();
    const history =
      Array.isArray(s.history) &&
      s.history.length <= 1000 &&
      s.history.every((b: unknown) => validBoard(b, s.level, caps))
        ? s.history
        : [];
    let initial: Board,
      initialSolution: Move[] | null = null;
    if (
      (s.version === 2 || s.version === 3) &&
      validBoard(s.initial, s.level, caps)
    )
      initial = s.initial;
    else {
      const original = legacyLevel(s.level),
        modern = level(s.level),
        colors = new Set(s.board.flat()).size;
      const puzzle = original.board.length === colors + 2 ? original : modern;
      initial =
        puzzle.board.length === colors + 2
          ? puzzle.board
          : (history[0] ?? s.board);
      if (boardKey(initial) === boardKey(puzzle.board))
        initialSolution = puzzle.solution;
    }
    if (initial.length < caps.length)
      initial = [
        ...initial,
        ...Array.from({ length: caps.length - initial.length }, () => []),
      ];
    if (validPlan(s.initialSolution, initial, caps))
      initialSolution = s.initialSolution;
    const solution = validPlan(s.solution, s.board, caps)
      ? s.solution
      : boardKey(initial) === boardKey(s.board)
        ? initialSolution
        : null;
    const walletValid =
      Number.isSafeInteger(s.coins) &&
      s.coins >= 0 &&
      s.coins <= Number.MAX_SAFE_INTEGER - 25 &&
      Number.isSafeInteger(s.rewardedThrough) &&
      s.rewardedThrough >= 0 &&
      s.rewardedThrough <= s.level;
    const owned: LookId[] = Array.isArray(s.owned)
      ? [
          ...new Set<LookId>(
            s.owned.filter((id: unknown) => LOOKS.some((x) => x.id === id)),
          ),
        ]
      : [];
    const equipment = { ...DEFAULT_EQUIPMENT };
    for (const item of LOOKS)
      if (owned.includes(item.id) && s.equipment?.[item.category] === item.id)
        equipment[item.category] = item.id;
    const info = levelInfo(s.level),
      difficulty: Difficulty =
        (s.version === 2 || s.version === 3) &&
        Object.hasOwn(DIFFICULTIES, s.difficulty)
          ? s.difficulty
          : info.difficulty;
    return {
      version: 3,
      generation:
        s.generation === DIFFICULTY_GENERATION ? DIFFICULTY_GENERATION : 2,
      baseBottleCount: baseCount,
      level: s.level,
      board: s.board,
      initial,
      capacities: caps,
      initialSolution,
      solution,
      hint:
        solution?.length &&
        s.hint?.from === solution[0].from &&
        s.hint?.to === solution[0].to
          ? solution[0]
          : null,
      history,
      sound: s.sound === true,
      coins: walletValid ? s.coins : 0,
      rewardedThrough: walletValid
        ? s.rewardedThrough
        : s.level - (won(s.board, caps) ? 0 : 1),
      owned,
      equipment,
      difficulty,
      reward: DIFFICULTIES[difficulty].reward,
    };
  } catch {
    return createGame();
  }
}
