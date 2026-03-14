import { handle } from "hono/vercel";
import { app } from "../_hono-app";

export const GET = handle(app);
