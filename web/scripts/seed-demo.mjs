// Gera dados fictícios para visualizar o dashboard. Uso: npm run seed:demo
import pg from "pg";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const org = (await c.query("select id from organizations order by created_at limit 1")).rows[0];
if (!org) { console.error("Crie a organização primeiro (acesse /setup)."); process.exit(1); }

const hosts = [["PC-FINANCEIRO-01", "ana"], ["PC-VENDAS-02", "bruno"], ["PC-SUPORTE-03", "carla"], ["PC-DEV-04", "diego"]];
const apps = [
  ["chrome.exe", 5], ["EXCEL.EXE", 4], ["Teams.exe", 3], ["OUTLOOK.EXE", 3], ["Code.exe", 3],
  ["WINWORD.EXE", 2], ["Spotify.exe", 1], ["WhatsApp.exe", 2],
];
const cats = { "EXCEL.EXE": "productive", "WINWORD.EXE": "productive", "Code.exe": "productive", "OUTLOOK.EXE": "productive", "Spotify.exe": "unproductive", "WhatsApp.exe": "unproductive" };
for (const [p, cat] of Object.entries(cats))
  await c.query("insert into app_catalog(org_id,process_name,category) values($1,$2,$3) on conflict do nothing", [org.id, p, cat]);

const pick = () => { const t = apps.reduce((a, x) => a + x[1], 0); let r = Math.random() * t; for (const [n, w] of apps) if ((r -= w) <= 0) return n; return apps[0][0]; };

for (const [i, [host, user]] of hosts.entries()) {
  const key = `demo-${host}`;
  const d = (await c.query(
    `insert into devices(org_id,hostname,windows_user,agent_version,device_key_hash,last_seen_at)
     values($1,$2,$3,'0.1.0',$4, now() - ($5 * interval '1 minute'))
     on conflict (device_key_hash) do update set last_seen_at=excluded.last_seen_at returning id`,
    [org.id, host, user, key, i === 3 ? 90 : 1]
  )).rows[0];
  await c.query("delete from app_sessions where device_id=$1", [d.id]);
  for (let day = 0; day < 14; day++) {
    for (let h = 9; h < 18; h++) {
      let t = new Date(); t.setDate(t.getDate() - day); t.setHours(h, 0, 0, 0);
      if (t > new Date()) continue;
      for (let k = 0; k < 4; k++) {
        const len = 300 + Math.floor(Math.random() * 600);
        const s = new Date(t.getTime() + k * 900_000);
        const e = new Date(s.getTime() + len * 1000);
        if (e > new Date()) continue;
        const idle = Math.floor(len * Math.random() * 0.25);
        await c.query(
          "insert into app_sessions(org_id,device_id,process_name,started_at,ended_at,active_seconds,idle_seconds) values($1,$2,$3,$4,$5,$6,$7)",
          [org.id, d.id, pick(), s, e, len - idle, idle]
        );
      }
    }
  }
}
await c.end();
console.log("dados de demonstração criados");
