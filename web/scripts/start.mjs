// Inicialização de produção: migrations -> segredos/admin automáticos -> servidor Next.
import pg from "pg";
import { randomBytes, scryptSync } from "node:crypto";
import { runMigrations } from "./migrate.mjs";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  await runMigrations(c);

  // SESSION_SECRET: usa a variável se existir; senão gera uma vez e guarda no banco.
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    const got = await c.query("select value from app_settings where key='session_secret'");
    let secret = got.rows[0]?.value;
    if (!secret) {
      secret = randomBytes(48).toString("base64url");
      await c.query("insert into app_settings(key,value) values('session_secret',$1) on conflict do nothing", [secret]);
      secret = (await c.query("select value from app_settings where key='session_secret'")).rows[0].value;
      console.log("SESSION_SECRET gerado automaticamente e salvo no banco.");
    }
    process.env.SESSION_SECRET = secret;
  }

  // Admin inicial opcional: defina ADMIN_EMAIL (e, se quiser, ADMIN_PASSWORD / ORG_NAME).
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (email) {
    const users = Number((await c.query("select count(*) n from users")).rows[0].n);
    if (users === 0) {
      const generated = !process.env.ADMIN_PASSWORD;
      const password = process.env.ADMIN_PASSWORD || randomBytes(15).toString("base64url");
      const salt = randomBytes(16);
      const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
      const org = (await c.query("insert into organizations(name) values($1) returning id", [process.env.ORG_NAME || "Minha empresa"])).rows[0];
      await c.query("insert into users(org_id,email,password_hash,role) values($1,$2,$3,'admin')", [org.id, email, hash]);
      console.log("==================================================");
      console.log(" Foccus: administrador inicial criado");
      console.log(` Email: ${email}`);
      if (generated) console.log(` Senha: ${password}   (exibida apenas agora — troque-a depois)`);
      console.log("==================================================");
    }
  }
} finally {
  await c.end();
}

await import("../server.js");
