import { expect, test } from "@playwright/test";
import { buyBottle, createGame, LOOKS } from "../src/game";

test("buys both helpers, preserves them and outfits through restart and reload", async ({
  page,
}) => {
  const save = { ...createGame(205), coins: 2000 };
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("sortie-save-v1", JSON.stringify(s)),
    save,
  );
  await page.reload();
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "Obchod" }).click();
  await expect(page.getByRole("dialog", { name: "Obchod" })).toBeVisible();
  await page.getByRole("button", { name: "Koupit malou" }).click();
  await page.getByRole("button", { name: "Koupit prázdnou" }).click();
  await expect(page.getByRole("button", { name: "Už máš" })).toHaveCount(2);
  await page.getByRole("button", { name: "Vzhledy", exact: true }).click();
  for (const look of LOOKS)
    await page
      .locator(".shop-card")
      .filter({ has: page.getByRole("heading", { name: look.name }) })
      .getByRole("button", { name: "Koupit" })
      .click();
  await page.getByRole("button", { name: "Zavřít" }).click();
  await expect(page.locator(".bottle")).toHaveCount(10);
  await expect(page.locator(".app")).toHaveAttribute(
    "data-background",
    "aurora",
  );
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 765",
  );
  await page
    .locator(".bottle")
    .nth(save.board.findIndex((b) => b.length > 0))
    .click();
  await page.locator(".bottle").nth(8).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
  await page.getByRole("button", { name: "Zpět" }).click();
  await page.getByRole("button", { name: "Znovu" }).click();
  await page
    .getByRole("button", { name: "Začít úroveň znovu", exact: true })
    .click();
  await expect(page.locator(".bottle")).toHaveCount(10);
  await page.reload();
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.locator(".bottle")).toHaveCount(10);
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 765",
  );
  const b = await page.locator(".bottle").evaluateAll((nodes) =>
    nodes.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }),
  );
  for (const r of b) {
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(r.bottom).toBeLessThan(page.viewportSize()!.height - 65);
  }
  expect(new Set(b.map((r) => `${r.x},${r.y}`)).size).toBe(10);
  await page.screenshot({
    path: `artifacts/shop-board-${test.info().project.name}.png`,
  });
  await page.getByRole("button", { name: "Obchod" }).click();
  await page.getByRole("button", { name: "Vzhledy", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Používá se", exact: true }),
  ).toHaveCount(4);
  await page.screenshot({
    path: `artifacts/shop-looks-${test.info().project.name}.png`,
  });
});

test("hint charges only on acceptance and highlights a real move", async ({
  page,
}) => {
  const save = { ...createGame(15), coins: 50 };
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("sortie-save-v1", JSON.stringify(s)),
    save,
  );
  await page.reload();
  await page.getByRole("button", { name: "Obchod" }).click();
  await page.getByRole("button", { name: "Nápověda ·" }).click();
  await expect(page.getByRole("button", { name: "Ukázat tah" })).toBeVisible({
    timeout: 16000,
  });
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 50",
  );
  await page.getByRole("button", { name: "Zrušit bez placení" }).click();
  await page.getByRole("button", { name: "Obchod" }).click();
  await page.getByRole("button", { name: "Nápověda ·" }).click();
  await page
    .getByRole("button", { name: "Ukázat tah" })
    .click({ timeout: 16000 });
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 40",
  );
  await expect(page.locator(".hint-source")).toHaveCount(1);
  await expect(page.locator(".hint-target")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 40",
  );
  await expect(page.locator(".hint-source")).toHaveCount(1);
  await page.locator(".hint-source").click();
  await page.locator(".hint-target").click();
  await expect(page.locator(".moves strong")).toHaveText("1");
});

test("dead-end recovery explains the rewind before spending coins", async ({
  page,
}) => {
  const save = createGame(205);
  save.coins = 40;
  save.history = [save.board];
  save.board = [
    [2, 3, 0, 0],
    [2, 3, 1, 1],
    [4, 5, 0, 0],
    [4, 5, 1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ];
  save.solution = null;
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("sortie-save-v1", JSON.stringify(s)),
    save,
  );
  await page.reload();
  await page.getByRole("button", { name: "Obchod" }).click();
  await page.getByRole("button", { name: "Nápověda ·" }).click();
  await expect(page.getByText("Tato pozice už nemá řešení.")).toBeVisible({
    timeout: 16000,
  });
  await expect(page.getByText(/o 1 tah zpět/)).toBeVisible();
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 40",
  );
  await page.getByRole("button", { name: "Vrátit a poradit" }).click();
  await expect(page.locator(".moves strong")).toHaveText("0");
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 30",
  );
});

test("small bottle accepts only one unit and remains a helper", async ({
  page,
}) => {
  const save = buyBottle({ ...createGame(), coins: 100 }, "small");
  save.board = [[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [], [], []];
  save.solution = null;
  // Move one colour out first so the puzzle is in progress.
  save.board = [[0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [0], [], []];
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("sortie-save-v1", JSON.stringify(s)),
    save,
  );
  await page.reload();
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await page.locator(".bottle").nth(1).click();
  await page.locator(".bottle").nth(5).click();
  await expect(page.locator(".moves strong")).toHaveText("1");
  const result = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("sortie-save-v1")!),
  );
  expect(result.board[1]).toHaveLength(3);
  expect(result.board[5]).toEqual([1]);
  await expect(page.locator(".win")).toHaveCount(0);
});
