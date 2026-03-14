import { serve } from "@hono/node-server";
import { app } from "../_hono-app";

const port = 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono API server listening on http://localhost:${info.port}`);
});
