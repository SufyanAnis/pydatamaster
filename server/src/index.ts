import "dotenv/config";
import { appReady, createApp } from "./app.js";
import { DB_PATH } from "./db.js";

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  const app = await createApp();
  const report = await appReady();
  if (report.modules || report.adminCreated) {
    console.log(`[seed] database initialised at ${DB_PATH}`);
    if (report.adminCreated) console.log(`[seed] admin account: ${report.adminEmail} / ${process.env.ADMIN_PASSWORD || "Admin@12345"}`);
  }

  app.listen(PORT, () => {
    console.log(`PyDataMaster server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
