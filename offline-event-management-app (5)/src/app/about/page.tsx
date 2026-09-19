import { Shell, BottomNav } from "@/components/Shell";
import { Card, PageHeader } from "@/components/ui";

export default function AboutPage() {
  return (
    <Shell>
      <PageHeader title="About" />
      <div className="space-y-3 p-4">
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl shadow-lg">
            🎉
          </div>
          <div className="text-lg font-bold">EventOps</div>
          <div className="text-xs text-slate-500">Offline Event Business Manager</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">v1.0.0</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-600 dark:text-slate-300">
            A fully offline-first inventory, costing, equipment, and event management app designed for
            <span className="font-semibold"> Grazing Table</span>,
            <span className="font-semibold"> Photobooth</span>, and
            <span className="font-semibold"> Mobile Wine Bar</span> businesses.
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highlights</div>
          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li>✓ 100% offline — data stored locally on your device</li>
            <li>✓ Philippine Peso (₱) formatting</li>
            <li>✓ Pax-based, print-based, and hour-based package scaling</li>
            <li>✓ Partial bottle / ml-level consumption tracking</li>
            <li>✓ Historical costing preserved across price changes</li>
            <li>✓ Inventory reservations (no false deductions)</li>
            <li>✓ Backup / Restore to JSON</li>
          </ul>
        </Card>
      </div>
      <BottomNav />
    </Shell>
  );
}
