import { expect, test } from "@playwright/test";
test("coins survive reload, undo and advancing to the next level", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "sortie-save-v1",
      JSON.stringify({
        level: 1,
        board: [[0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [0], []],
        history: [],
        sound: false,
      }),
    ),
  );
  await page.reload();
  await expect(page.locator(".board-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 0",
  );
  await page.locator(".bottle").nth(3).click();
  await page.locator(".bottle").nth(0).click();
  await expect(page.locator(".win")).toBeVisible();
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 10",
  );
  await expect(page.locator(".win-reward")).toContainText("10 mincí");
  await page.reload();
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 10",
  );
  await page.getByRole("button", { name: "Zpět" }).click();
  await expect(page.locator(".win")).toHaveCount(0);
  await page.locator(".bottle").nth(3).click();
  await page.locator(".bottle").nth(0).click();
  await expect(page.locator(".win")).toBeVisible();
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 10",
  );
  await page.getByRole("button", { name: "Další úroveň" }).click();
  await expect(page.getByRole("heading", { name: "Úroveň 02" })).toBeVisible();
  await expect(page.locator(".coin-balance")).toHaveAttribute(
    "aria-label",
    "Mince: 10",
  );
  await page.setViewportSize({ width: 320, height: 700 });
  const boxes = await page
    .locator(".game-top h1, .coin-balance, .moves, .icon-button")
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBoundingClientRect();
        return { left: b.left, right: b.right };
      }),
    );
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i].left).toBeGreaterThanOrEqual(0);
    expect(boxes[i].right).toBeLessThanOrEqual(320);
    if (i) expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
  }
  await page.screenshot({
    path: `artifacts/coins-${test.info().project.name}.png`,
  });
});
