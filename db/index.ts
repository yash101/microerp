import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

async function getConnectionString() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = getCloudflareContext();
    const hyperdrive = (context.env as { HYPERDRIVE?: { connectionString?: string } }).HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      return hyperdrive.connectionString;
    }
  } catch {
    // Local Next.js and test runs use DATABASE_URL instead of Cloudflare bindings.
  }

  return process.env.DATABASE_URL ?? "postgres://microerp:microerp@localhost:5432/microerp";
}

declare global {
  var microErpSql: postgres.Sql | undefined;
}

const client =
  globalThis.microErpSql ??
  postgres(await getConnectionString(), {
    max: 5,
    prepare: false,
    fetch_types: false
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.microErpSql = client;
}

export const db = drizzle(client, { schema });
