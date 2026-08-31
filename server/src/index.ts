import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { migrate, DB_PATH, UPLOADS_DIR } from "./db.js";
import { attachUser } from "./auth.js";
import { seedDatabase } from "./seed.js";
import { authRouter } from "./routes/auth.js";
import { contentRouter } from "./routes/content.js";
import { progressRouter } from "./routes/progress.js";
import { formsRouter } from "./routes/forms.js";
import { tutorRouter } from "./routes/tutor.js";
import { adminRouter } from "./routes/admin.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;

async function main() {
  migrate();
  const report = await seedDatabase();
  if (report.modules || report.adminCreated) {
    console.log(`[seed] database initialised at ${DB_PATH}`);
    if (report.adminCreated) console.log(`[seed] admin account: ${report.adminEmail} / ${process.env.ADMIN_PASSWORD || "Admin@12345"}`);
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: (origin, cb) => cb(null, origin || true),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d", index: false }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use("/api/auth", authRouter);
  app.use("/api", contentRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/forms", formsRouter);
  app.use("/api/tutor", tutorRouter);
  app.use("/api/admin", adminRouter);

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // Serve the built client when it exists (production / `npm run build && npm start`).
  const clientDist = path.resolve(here, "..", "..", "client", "dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist, { maxAge: "1h", index: false }));
    app.get("*", (_req, res) => {
      res.setHeader("cache-control", "no-cache");
      res.sendFile(path.join(clientDist, "index.html"));
    });
    console.log(`[static] serving client from ${clientDist}`);
  } else {
    app.get("/", (_req, res) =>
      res
        .type("text/plain")
        .send("PyDataMaster API is running. Start the client with `npm run dev -w client` or build it with `npm run build`."),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    console.error(err);
    res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
  });

  app.listen(PORT, () => {
    console.log(`PyDataMaster server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
