import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://bdo:bdo_local_only@localhost:5432/bdo_companion",
  },
  strict: true,
  verbose: true,
});
