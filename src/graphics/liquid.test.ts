import { describe, expect, it } from "vitest";
import {
  createLiquidGeometry,
  fillHeight,
  pouringAngle,
  updateLiquid,
  UNIT_VOLUME,
  HEIGHT,
} from "./liquid";
describe("3D liquid", () => {
  it("renders an empty bottle with no liquid and leaves room above a full bottle", () => {
    const geometry = createLiquidGeometry();
    updateLiquid(geometry, 0, 0);
    expect(geometry.drawRange.count).toBe(0);
    const surface = updateLiquid(geometry, 4 * UNIT_VOLUME, 0);
    expect(geometry.drawRange.count).toBeGreaterThan(0);
    expect(surface).toBeLessThan(HEIGHT);
    geometry.dispose();
  });
  it("tilts further as the source drains", () => {
    expect(pouringAngle(UNIT_VOLUME)).toBeGreaterThan(
      pouringAngle(UNIT_VOLUME * 3),
    );
  });
  it("clips tilted liquid to a level surface without invalid vertices", () => {
    const geometry = createLiquidGeometry();
    for (const angle of [-1.4, -0.5, 0, 0.5, 1, 1.4]) {
      const height = updateLiquid(geometry, 0.35, angle),
        position = geometry.getAttribute("position");
      expect(geometry.drawRange.count).toBeGreaterThan(0);
      expect(geometry.drawRange.count).toBeLessThan(position.count);
      let cap = 0;
      for (let i = 0; i < geometry.drawRange.count; i++) {
        const y =
          position.getY(i) * Math.cos(angle) -
          position.getX(i) * Math.sin(angle);
        expect(Number.isFinite(y)).toBe(true);
        expect(y).toBeLessThanOrEqual(height + 0.00001);
        if (Math.abs(y - height) < 0.00001) cap++;
      }
      expect(cap).toBeGreaterThan(20);
    }
    expect(fillHeight(0.7, 0)).toBeGreaterThan(fillHeight(0.2, 0));
    geometry.dispose();
  });
});

it("keeps the upper colour above the unchanged bottom layer", () => {
  const geometry = createLiquidGeometry();
  for (const angle of [-1.6, -0.7, 0, 0.7, 1.3, 1.6]) {
    updateLiquid(geometry, 0.6, angle, 0.25);
    const low = fillHeight(0.25, angle),
      high = fillHeight(0.6, angle),
      vertices = geometry.getAttribute("position");
    for (let i = 0; i < geometry.drawRange.count; i++) {
      const height =
        vertices.getY(i) * Math.cos(angle) - vertices.getX(i) * Math.sin(angle);
      expect(height).toBeGreaterThanOrEqual(low - 0.00001);
      expect(height).toBeLessThanOrEqual(high + 0.00001);
    }
  }
  updateLiquid(geometry, 0.25, 0, 0.25);
  expect(geometry.drawRange.count).toBe(0);
  geometry.dispose();
});
