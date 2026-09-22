import { expect, test } from "@playwright/test";
import { buyBottle, createGame } from "../src/game";

test("reference-style interface stays usable across phone orientations", async ({
  page,
}) => {
  let save = { ...createGame(205), coins: 685 };
  save = buyBottle(buyBottle(save, "small"), "large");
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
  for (const [width, height] of [
    [320, 700],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => {
        const b = document.querySelector(selector)!.getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          right: b.right,
          bottom: b.bottom,
          width: b.width,
          height: b.height,
        };
      };
      return {
        hud: [
          rect(".coin-balance"),
          rect(".settings-button"),
          rect(".level-plaque"),
        ],
        controls: rect(".controls"),
        bottles: [...document.querySelectorAll(".bottle")].map((el) => {
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, right: b.right, bottom: b.bottom };
        }),
        scroll: [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
        ],
      };
    });
    expect(geometry.scroll).toEqual([width, height]);
    for (const r of [...geometry.hud, geometry.controls, ...geometry.bottles]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(width);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.bottom).toBeLessThanOrEqual(height);
    }
    for (const label of await page.locator(".action-name:visible").all()) {
      const box = await label.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(geometry.controls.y);
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        geometry.controls.bottom,
      );
    }
    for (const b of geometry.bottles) {
      const c = geometry.controls;
      expect(
        b.right <= c.x || b.x >= c.right || b.bottom <= c.y || b.y >= c.bottom,
      ).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Nastavení", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Nastavení" })).toBeVisible();
  await page.getByRole("button", { name: "Zapnout zvuk" }).click();
  await expect(
    page.getByRole("button", { name: "Vypnout zvuk" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Zavřít" }).click();
  await page.getByRole("button", { name: "Obchod", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Obchod" })).toBeVisible();
  await page.getByRole("button", { name: "Zavřít" }).click();
  await page.getByRole("button", { name: "Znovu", exact: true }).click();
  await page
    .getByRole("button", { name: "Začít úroveň znovu", exact: true })
    .click();
  await expect(page.locator(".bottle")).toHaveCount(10);
});
