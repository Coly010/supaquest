import { defineConfig } from "@playwright/test"
import { config } from "dotenv"

// Load .env.local so NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY etc.
// are available in global setup and test files.
config({ path: ".env.local", quiet: true })

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-infra.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false, // Supabase state is shared — run serially
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // 1. Global setup: signs in as admin, saves session file
    {
      name: "setup",
      testMatch: "**/global.setup.ts",
    },
    // 2. Tests that start unauthenticated (auth forms, redirects)
    {
      name: "unauthenticated",
      testMatch: ["**/auth.spec.ts", "**/onboarding.spec.ts"],
      dependencies: ["setup"],
    },
    // 3. Tests that start as the seeded admin (dashboard, nav, game pages)
    {
      name: "authenticated",
      testMatch: [
        "**/dashboard.spec.ts",
        "**/shops.spec.ts",
        "**/inventory.spec.ts",
        "**/tasks.spec.ts",
        "**/environments.spec.ts",
        "**/chat.spec.ts",
        "**/admin.spec.ts",
      ],
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth/admin.json",
      },
    },
  ],
  // Starts Next.js dev server automatically; reuses it if already running
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
