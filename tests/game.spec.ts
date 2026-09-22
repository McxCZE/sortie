import { expect, test } from "@playwright/test";
import { level, pour } from "../src/game";
test("plays a full level, persists progress, undoes and restarts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.getByRole("heading", { name: /Úroveň 01/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const puzzle = level(1),
    first = puzzle.solution[0];
  const bottle = (i: number) =>
    page.getByRole("button", { name: `Lahvička ${i + 1}:`, exact: false });
  await bottle(first.from).click();
  await bottle(first.to).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
  await page.reload();
  await expect(page.locator(".moves strong")).toHaveText("1");
  await page.getByRole("button", { name: "Zpět" }).click();
  await expect(page.locator(".moves strong")).toHaveText("0");
  let board = puzzle.board;
  for (const m of puzzle.solution) {
    if (
      board.every(
        (b) => !b.length || (b.length === 4 && b.every((c) => c === b[0])),
      )
    )
      break;
    await bottle(m.from).click();
    await bottle(m.to).click();
    await expect(page.locator(".pouring")).toHaveCount(0);
    board = pour(board, m.from, m.to)!;
  }
  await expect(page.getByText("Kouzlo se povedlo.")).toBeVisible();
  await page.getByRole("button", { name: "Další úroveň" }).click();
  await expect(page.getByRole("heading", { name: /Úroveň 02/ })).toBeVisible();
  await page.getByRole("button", { name: "Znovu", exact: false }).click();
  await page
    .getByRole("button", { name: "Začít úroveň znovu", exact: true })
    .click();
  await expect(page.locator(".moves strong")).toHaveText("0");
  await expect(page.getByRole("button", { name: "Jak hrát" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("small screens, reduced motion and malformed storage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("sortie-save-v1", "{bad json"),
  );
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.locator(".bottle")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const move = level(1).solution[0];
  await page.locator(".bottle").nth(move.from).click();
  await page.locator(".bottle").nth(move.to).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-animating",
    "false",
  );
  await page.screenshot({ path: "artifacts/sortie-small.png", fullPage: true });
});
test("advanced eight bottle layout", async ({ page }) => {
  const board = level(205).board;
  await page.addInitScript(
    (board) =>
      localStorage.setItem(
        "sortie-save-v1",
        JSON.stringify({ level: 205, board, history: [], sound: false }),
      ),
    board,
  );
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.locator(".bottle")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/sortie-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("restores the level, bottles, undo and sound after closing the page", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "Zapnout zvuk" }).click();
  const move = level(1).solution[0];
  await page
    .getByRole("button", { name: `Lahvička ${move.from + 1}:` })
    .click();
  await page.getByRole("button", { name: `Lahvička ${move.to + 1}:` }).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
  const labels = await page
    .locator(".bottle")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");
  await expect(
    reopened.getByRole("heading", { name: /Úroveň 01/ }),
  ).toBeVisible();
  await expect(reopened.locator(".moves strong")).toHaveText("1");
  expect(
    await reopened
      .locator(".bottle")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label"))),
  ).toEqual(labels);
  await expect(
    reopened.getByRole("button", { name: "Vypnout zvuk" }),
  ).toHaveAttribute("aria-pressed", "true");
  await reopened.getByRole("button", { name: "Zpět" }).click();
  await expect(reopened.locator(".moves strong")).toHaveText("0");
});

test("3D pours commit one legal move and lock controls while animating", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-renderer",
    "3d",
  );
  const initial = level(1).board,
    move = level(1).solution[0],
    expected = pour(initial, move.from, move.to);
  await page.locator(".bottle").nth(move.from).click();
  await page.locator(".bottle").nth(move.to).click();
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-animating",
    "true",
  );
  await expect(page.getByRole("button", { name: "Znovu" })).toBeDisabled();
  await expect(page.locator(".moves strong")).toHaveText("1", {
    timeout: 15000,
  });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("sortie-save-v1")!).board,
    ),
  ).toEqual(expected);
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-animating",
    "false",
  );
  await expect(page.getByRole("link", { name: "3D ukázka" })).toHaveCount(0);
});

test("loss of 3D context keeps the game playable and commits a pending move once", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  const move = level(1).solution[0];
  await page.locator(".bottle").nth(move.from).click();
  await page.locator(".bottle").nth(move.to).click();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-renderer",
    "svg",
  );
  await expect(page.locator(".moves strong")).toHaveText("1");
  await page.getByRole("button", { name: "Zpět" }).click();
  await expect(page.locator(".moves strong")).toHaveText("0");
  await page.locator(".bottle").nth(move.from).click();
  await page.locator(".bottle").nth(move.to).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
});

test("a browser without WebGL still loads a playable saved game", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      if (
        kind === "webgl" ||
        kind === "webgl2" ||
        kind === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-renderer",
    "svg",
    { timeout: 30000 },
  );
  const move = level(1).solution[0];
  await page.locator(".bottle").nth(move.from).click();
  await page.locator(".bottle").nth(move.to).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
});
