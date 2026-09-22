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
    .locator(".coin-balance, .settings-button, .level-plaque, .controls")
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      }),
    );
  for (const b of boxes) {
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(320);
    expect(b.top).toBeGreaterThanOrEqual(0);
    expect(b.bottom).toBeLessThanOrEqual(700);
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      expect(
        a.right <= b.left ||
          b.right <= a.left ||
          a.bottom <= b.top ||
          b.bottom <= a.top,
      ).toBe(true);
    }
  await page.screenshot({
    path: `artifacts/coins-${test.info().project.name}.png`,
  });
});
