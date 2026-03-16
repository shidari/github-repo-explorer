import { hc } from "hono/client";
import type { AppType } from "@/app/api/_hono-app";

// Client Component（ブラウザ）から API Route を叩くためのクライアント
export const client = hc<AppType>("");
