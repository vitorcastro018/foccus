// Redefine a senha de um usuário do painel.
// Uso:  npm run reset-password -- email@empresa.com [nova-senha]
// Sem nova senha, gera uma aleatória e a imprime. Usa DATABASE_URL (ou .env.local).
import pg from "pg";
import { randomBytes, scryptSync } from "node:crypto";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) { console.error("Uso: npm run reset-password -- email@empresa.com [nova-senha]"); process.exit(1); }
const generated = !process.argv[3];
const password = process.argv[3] || randomBytes(12).toString("base64url");
if (password.length < 8) { console.error("A senha precisa ter ao menos 8 caracteres."); process.exit(1); }

const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  const r = await c.query("update users set password_hash=$2 where lower(email)=$1 returning email", [email, hash]);
  if (r.rowCount === 0) {
    const all = await c.query("select email from users order by created_at");
    console.error(`Usuário "${email}" não encontrado. Existentes: ${all.rows.map((x) => x.email).join(", ") || "(nenhum)"}`);
    process.exit(1);
  }
  console.log(`Senha de ${r.rows[0].email} redefinida.` + (generated ? ` Nova senha: ${password}` : ""));
} finally {
  await c.end();
}
