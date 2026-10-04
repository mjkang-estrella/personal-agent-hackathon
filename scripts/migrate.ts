import pg from "pg";
import fs from "node:fs/promises";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});
await client.connect();
try {
  await client.query("BEGIN");
  for (const file of (await fs.readdir("migrations"))
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort()) {
    await client.query(await fs.readFile(`migrations/${file}`, "utf8"));
  }
  await client.query("COMMIT");
  console.log("JobSwitch migration applied.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
