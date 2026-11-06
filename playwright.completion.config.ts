import { defineConfig } from "@playwright/test";
// Separate authenticated real-stack suite, not the default fixture scaffold.
export default defineConfig({
  testDir: "./tests/completion",
  workers: 1,
  timeout: 45000,
  outputDir: process.env.PW_OUTPUT_DIR ?? "test-results",
  // PW_SCREENSHOT=on captures every test for the submission evidence.
  use: { baseURL: "http://localhost:5176", headless: true, screenshot: process.env.PW_SCREENSHOT === "on" ? "on" : "only-on-failure" },
  reporter: [["list"], ["html", { outputFolder: process.env.PW_HTML_REPORT ?? "playwright-report/completion", open: "never" }],
    ["json", { outputFile: process.env.PW_JSON ?? "test-results/completion-results.json" }]],
});
