import pg from "pg";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function runMigrations(c) {
  const dir = [process.env.MIGRATIONS_DIR, "./db/migrations", "../db/migrations"].find((d) => d && existsSync(d));
  if (!dir) throw new Error("migrations dir não encontrado");
  await c.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now())"
  );
  const done = new Set((await c.query("select name from schema_migrations")).rows.map((r) => r.name));
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    console.log("aplicando", f);
    await c.query("begin");
    try {
      await c.query(readFileSync(join(dir, f), "utf8"));
      await c.query("insert into schema_migrations(name) values($1)", [f]);
      await c.query("commit");
    } catch (e) {
      await c.query("rollback");
      throw e;
    }
  }
  console.log("migrations ok");
}

// Execução direta: npm run migrate
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { await runMigrations(c); } catch (e) { console.error(e); process.exit(1); }
  await c.end();
}
