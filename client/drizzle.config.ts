import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// O drizzle-kit não lê o .env.local sozinho; o carregador do Next aplica as
// mesmas regras de precedência que o `next dev` usa.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  // schema.ts é gerado pelo Better Auth; schema-app.ts tem as tabelas do próprio app.
  schema: ["./lib/db/schema.ts", "./lib/db/schema-app.ts"],
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
