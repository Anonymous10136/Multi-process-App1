"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  runNotificationSweep,
  requestNotificationPermission,
  notificationPermission,
  type AppNotification,
} from "@/lib/notifications";
import { Badge } from "@/components/ui";

const TONE_CLASS: Record<AppNotification["tone"], string> = {
  info: "border-l-sky-500 bg-sky-50 dark:bg-sky-950/30",
  warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
  danger: "border-l-red-500 bg-red-50 dark:bg-red-950/30",
  success: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [perm, setPerm] = useState(notificationPermission());
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    const list = await runNotificationSweep();
    setNotifications(list);
    setPerm(notificationPermission());
  }

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 60_000);
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const count = notifications.length;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <div className="text-sm font-semibold">Alerts</div>
            <div className="flex items-center gap-2">
              {perm === "default" && (
                <button
                  onClick={async () => { await requestNotificationPermission(); setPerm(notificationPermission()); }}
                  className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white"
                >
                  Enable
                </button>
              )}
              <button onClick={refresh} className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                Refresh
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {perm === "denied" && (
              <div className="mb-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Notifications are blocked in this browser. You can still see alerts here in the app.
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="text-3xl">✅</div>
                <div className="mt-2 text-sm font-medium">All clear!</div>
                <div className="text-xs text-slate-500">No alerts right now.</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href || "#"}
                    onClick={() => setOpen(false)}
                  >
                    <div className={`rounded-lg border-l-4 px-3 py-2 text-left ${TONE_CLASS[n.tone]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{n.title}</div>
                        <Badge tone={n.tone === "danger" ? "red" : n.tone === "warning" ? "amber" : n.tone === "success" ? "green" : "sky"}>
                          {n.tone}
                        </Badge>
                      </div>
                      {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-slate-700 dark:text-slate-300">{n.body}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
