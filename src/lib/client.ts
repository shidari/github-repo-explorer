import { hc } from "hono/client";
import type { AppType } from "@/app/api/_hono-app";

export const client = hc<AppType>("/api");
