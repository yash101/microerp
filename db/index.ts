import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "postgres://microerp:microerp@localhost:5432/microerp";

declare global {
  var microErpSql: postgres.Sql | undefined;
}

const client = globalThis.microErpSql ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalThis.microErpSql = client;
}

export const db = drizzle(client, { schema });
