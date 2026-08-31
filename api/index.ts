// Vercel serverless entry point. All /api/* and /uploads/* traffic is rewritten here
// (see vercel.json) and handled by the same Express app that plain Node hosts run.
import { createApp } from "../server/dist/app.js";

const appPromise = createApp();

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
