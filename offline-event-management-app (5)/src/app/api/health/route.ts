export const dynamic = "force-dynamic";

/**
 * EventOps stores its business data locally in IndexedDB, so the deployed PWA
 * does not require PostgreSQL for normal operation. This dependency-free health
 * endpoint also lets Vercel and other hosts verify the deployment without a
 * DATABASE_URL environment variable.
 */
export async function GET() {
  return Response.json({
    ok: true,
    app: "EventOps",
    storage: "offline-indexeddb",
    timestamp: new Date().toISOString(),
  });
}
