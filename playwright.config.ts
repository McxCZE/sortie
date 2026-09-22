import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 90000,
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
