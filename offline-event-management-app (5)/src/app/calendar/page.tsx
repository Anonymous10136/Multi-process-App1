"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Badge, Card, PageHeader, Tabs } from "@/components/ui";
import { cn } from "@/components/ui";
import type { ServiceKey } from "@/lib/types";

export default function CalendarPage() {
  const events = useLiveQuery(() => db.events.toArray(), []) || [];
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [cursor, setCursor] = useState(new Date());
  const [filterService, setFilterService] = useState<ServiceKey | "all">("all");
  const [selected, setSelected] = useState<Date | null>(null);

  const filteredEvents = useMemo(() => {
    if (filterService === "all") return events;
    // Need to know services per event; load synchronously via eventServices is async. Use a simple approach: fetch once
    return events;
  }, [events, filterService]);

  // Month days
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const eventsOn = (d: Date) => filteredEvents.filter((e) => isSameDay(new Date(e.date), d));

  return (
    <Shell>
      <PageHeader title="Calendar" subtitle={format(cursor, "MMMM yyyy")} />
      <div className="space-y-3 p-4">
        <Tabs
          tabs={[
            { key: "month", label: "Month" },
            { key: "week", label: "Week" },
            { key: "list", label: "Upcoming" },
          ]}
          value={view}
          onChange={(k) => setView(k as "month" | "week" | "list")}
        />

        <div className="flex items-center justify-between">
          <button onClick={() => setCursor(subMonths(cursor, 1))} className="rounded-full bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">‹</button>
          <div className="text-sm font-semibold">{format(cursor, "MMMM yyyy")}</div>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="rounded-full bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">›</button>
        </div>

        {view === "month" && (
          <Card className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {monthDays.map((d) => {
                const dayEv = eventsOn(d);
                const isCurrentMonth = isSameMonth(d, cursor);
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelected(d)}
                    className={cn(
                      "relative aspect-square rounded-lg p-1 text-xs transition",
                      isCurrentMonth ? "bg-slate-50 dark:bg-slate-800/50" : "opacity-40",
                      isToday && "ring-2 ring-indigo-500",
                      selected && isSameDay(d, selected) && "bg-indigo-100 dark:bg-indigo-900/40"
                    )}
                  >
                    <div className="text-left text-[10px] font-medium">{format(d, "d")}</div>
                    {dayEv.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {dayEv.slice(0, 3).map((e) => (
                          <span key={e.id} className="block h-1 w-1 rounded-full bg-indigo-500" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {view === "week" && (
          <Card className="p-3">
            <div className="space-y-2">
              {eachDayOfInterval({
                start: startOfWeek(cursor, { weekStartsOn: 0 }),
                end: endOfWeek(cursor, { weekStartsOn: 0 }),
              }).map((d) => {
                const dayEv = eventsOn(d);
                return (
                  <div key={d.toISOString()} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{format(d, "EEE, MMM d")}</span>
                      <Badge tone="slate">{dayEv.length}</Badge>
                    </div>
                    {dayEv.map((e) => (
                      <Link key={e.id} href="/events" className="mt-1 block rounded-lg bg-white p-2 text-xs shadow-sm dark:bg-slate-900">
                        <div className="font-semibold">{e.name}</div>
                        <div className="text-slate-500">{e.client} · {e.startTime || "—"}</div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {view === "list" && (
          <div className="space-y-2">
            {filteredEvents
              .filter((e) => new Date(e.date) >= new Date() && e.status !== "completed" && e.status !== "cancelled")
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => (
                <Link key={e.id} href="/events">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold">{e.name}</div>
                        <div className="text-xs text-slate-500">{format(new Date(e.date), "MMM d, yyyy")} · {e.startTime || "—"}</div>
                        <div className="text-xs text-slate-500">{e.client} · {e.venue}</div>
                      </div>
                      <Badge tone="indigo">{e.status}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        )}

        {selected && (
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">{format(selected, "EEEE, MMMM d")}</div>
              <button onClick={() => setSelected(null)} className="text-xs text-slate-500">Close</button>
            </div>
            {eventsOn(selected).length === 0 ? (
              <div className="text-xs text-slate-500">No events.</div>
            ) : (
              <div className="space-y-1">
                {eventsOn(selected).map((e) => (
                  <Link key={e.id} href="/events" className="block rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/50">
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-slate-500">{e.client} · {e.venue}</div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
      <BottomNav />
    </Shell>
  );
}
