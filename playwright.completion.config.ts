import { defineConfig } from "@playwright/test";
// Separate authenticated real-stack suite, not the default fixture scaffold.
export default defineConfig({
  testDir: "./tests/completion",
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://localhost:5176", headless: true },
  reporter: "list",
});
