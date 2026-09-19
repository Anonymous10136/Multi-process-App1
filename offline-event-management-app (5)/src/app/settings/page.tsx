"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { canNotify, notificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { usePWAInstall, triggerPWAInstallModal } from "@/components/PWAInstall";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [expDays, setExpDays] = useState(7);
  const [defaultMin, setDefaultMin] = useState(5);
  const [reminders, setReminders] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { canNativePrompt, isInstalled, promptInstall } = usePWAInstall();

  useEffect(() => {
    (async () => {
      const exp = await db.settings.where("key").equals("expirationWarningDays").first();
      const min = await db.settings.where("key").equals("defaultMinStock").first();
      const rem = await db.settings.where("key").equals("remindersEnabled").first();
      if (exp) setExpDays(JSON.parse(exp.value));
      if (min) setDefaultMin(JSON.parse(min.value));
      if (rem) setReminders(JSON.parse(rem.value));
      setLoaded(true);
    })();
  }, []);

  async function save() {
    await db.settings.where("key").equals("expirationWarningDays").delete();
    await db.settings.where("key").equals("defaultMinStock").delete();
    await db.settings.where("key").equals("remindersEnabled").delete();
    await db.settings.bulkAdd([
      { key: "expirationWarningDays", value: JSON.stringify(expDays) },
      { key: "defaultMinStock", value: JSON.stringify(defaultMin) },
      { key: "remindersEnabled", value: JSON.stringify(reminders) },
    ]);
    alert("Settings saved.");
  }

  if (!loaded) return <Shell><div className="p-6 text-center text-sm text-slate-500">Loading…</div></Shell>;

  return (
    <Shell>
      <PageHeader title="Settings" />
      <div className="space-y-3 p-4">
        <Card>
          <div className="mb-3 text-sm font-semibold">Appearance</div>
          <Select value={theme || "system"} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">☀ Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="system">💻 System</option>
          </Select>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold">Notifications & Alerts</div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-xs">Enable in-app reminders</span>
              <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            </label>
            {canNotify() && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Device notifications</div>
                  <div className="text-[10px] text-slate-500">
                    Status: <span className="font-semibold capitalize">{notificationPermission()}</span>
                  </div>
                </div>
                {notificationPermission() !== "granted" && notificationPermission() !== "denied" && (
                  <Button size="sm" onClick={async () => { await requestNotificationPermission(); }}>
                    Allow
                  </Button>
                )}
                {notificationPermission() === "denied" && (
                  <span className="text-[10px] text-red-500">Blocked — enable in browser settings</span>
                )}
              </div>
            )}
            <div>
              <Label>Expiration warning (days)</Label>
              <Input type="number" value={expDays} onChange={(e) => setExpDays(Number(e.target.value))} />
            </div>
            <div>
              <Label>Default minimum stock</Label>
              <Input type="number" value={defaultMin} onChange={(e) => setDefaultMin(Number(e.target.value))} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold">Install App on Your Mobile Device</div>
          <p className="mb-3 text-xs text-slate-500">
            Install EventOps on your phone or tablet home screen for full offline access. All your data stays locally on your device.
          </p>
          {isInstalled ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✓ EventOps is installed on this device.
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={async () => {
                  if (canNativePrompt) {
                    const res = await promptInstall();
                    if (res === "manual") triggerPWAInstallModal();
                  } else {
                    triggerPWAInstallModal();
                  }
                }}
                className="w-full"
              >
                📲 {canNativePrompt ? "Install EventOps Now (1-Tap)" : "Open Mobile Installation Guide"}
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold">Data</div>
          <div className="text-xs text-slate-500">All your data is stored locally on this device. Use Backup & Restore to export/import.</div>
        </Card>

        <Button onClick={save} className="w-full">Save Settings</Button>
      </div>
      <BottomNav />
    </Shell>
  );
}
