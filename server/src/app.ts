import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { migrate } from "./db.js";
import { attachUser } from "./auth.js";
import { seedDatabase, type SeedReport } from "./seed.js";
import { authRouter } from "./routes/auth.js";
import { contentRouter, uploadsRouter } from "./routes/content.js";
import { progressRouter } from "./routes/progress.js";
import { formsRouter } from "./routes/forms.js";
import { tutorRouter } from "./routes/tutor.js";
import { adminRouter } from "./routes/admin.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Memoized so serverless cold starts (and repeated createApp calls) migrate and seed exactly once.
let readyPromise: Promise<SeedReport> | null = null;

/** Runs migrations and seeding once per process; resolves with the seed report. */
export function appReady(): Promise<SeedReport> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await migrate();
      return seedDatabase();
    })();
  }
  return readyPromise;
}

let appPromise: Promise<express.Express> | null = null;

/** Builds the fully configured Express app (DB migrated and seeded). Memoized per process. */
export function createApp(): Promise<express.Express> {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}

async function buildApp(): Promise<express.Express> {
  await appReady();

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
  app.use("/uploads", uploadsRouter);

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

  return app;
}
