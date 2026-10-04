import pg from "pg";
import fs from "node:fs/promises";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(await fs.readFile("migrations/001_jobswitch.sql", "utf8"));
  await client.query("COMMIT");
  console.log("JobSwitch migration applied.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
