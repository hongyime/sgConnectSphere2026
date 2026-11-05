import { defineConfig } from "@playwright/test";
// Run against the isolated local E10-S04 stack documented in the manual guide.
export default defineConfig({
  testDir: "./tests/cancellation",
  workers: 1,
  timeout: 45000,
  outputDir: process.env.PW_OUTPUT_DIR ?? "test-results",
  // PW_SCREENSHOT=on captures every test for the submission evidence.
  use: { baseURL: "http://localhost:5175", headless: true, screenshot: process.env.PW_SCREENSHOT === "on" ? "on" : "only-on-failure" },
  reporter: [["list"], ["html", { outputFolder: process.env.PW_HTML_REPORT ?? "playwright-report/cancellation", open: "never" }],
    ["json", { outputFile: process.env.PW_JSON ?? "test-results/cancellation-results.json" }]],
});
