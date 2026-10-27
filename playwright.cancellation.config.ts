import { defineConfig } from "@playwright/test";
// Run against the isolated local E10-S04 stack documented in the manual guide.
export default defineConfig({
  testDir: "./tests/cancellation",
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://localhost:5175", headless: true },
  reporter: "list",
});
