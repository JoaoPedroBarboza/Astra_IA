import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// O drizzle-kit não lê o .env.local sozinho; o carregador do Next aplica as
// mesmas regras de precedência que o `next dev` usa.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
