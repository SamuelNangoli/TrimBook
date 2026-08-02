import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// A Prisma config file disables Prisma's automatic `.env` loading, so load it
// ourselves for local CLI commands (migrate/generate/seed). On Vercel the env
// vars come from the dashboard (process.env), so the missing `.env` is a no-op.
loadEnv();

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
