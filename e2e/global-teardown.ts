// Playwright globalTeardown — runs after all tests complete.
// Supabase is left running for local dev convenience.
// Uncomment supabase stop for CI environments.

// import { execSync } from "child_process"

export default async function globalTeardown() {
  // execSync("npx supabase stop", { stdio: "inherit" })
}
