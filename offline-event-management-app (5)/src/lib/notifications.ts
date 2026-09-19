"use client";

/**
 * Simple offline notification system.
 * Uses the Web Notifications API for native notifications + in-app tracking.
 * All logic runs client-side so it works fully offline.
 */

import { db } from "./db";
import { differenceInDays, isSameDay } from "date-fns";

const SHOWN_KEY = "eventops_notifications_shown";
const LAST_RUN_KEY = "eventops_notifications_lastrun";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "danger" | "success";
  timestamp: string;
  href?: string;
}

function getShown(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveShown(set: Set<string>) {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!canNotify()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

function fireNative(title: string, body: string) {
  if (canNotify() && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon:
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎉</text></svg>",
        badge:
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎉</text></svg>",
      });
    } catch {}
  }
}

/**
 * Generate the current set of active notifications by scanning DB state.
 * Only returns notifications that should be visible now.
 */
export async function collectNotifications(): Promise<AppNotification[]> {
  const out: AppNotification[] = [];
  const today = new Date();

  // Load settings
  const expWarnRaw = await db.settings.where("key").equals("expirationWarningDays").first();
  const expWarnDays = expWarnRaw ? (JSON.parse(expWarnRaw.value) as number) : 7;
  const remindersOnRaw = await db.settings.where("key").equals("remindersEnabled").first();
  const remindersEnabled = remindersOnRaw ? (JSON.parse(remindersOnRaw.value) as boolean) : true;

  if (remindersEnabled) {
    // Inventory alerts
    const items = await db.inventoryItems.toArray();
    const outOfStock = items.filter((i) => i.quantity <= 0);
    const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.minimumStock);
    const expired = items.filter(
      (i) => i.expirationDate && differenceInDays(new Date(i.expirationDate), today) < 0
    );
    const expiring = items.filter((i) => {
      if (!i.expirationDate) return false;
      const d = differenceInDays(new Date(i.expirationDate), today);
      return d >= 0 && d <= expWarnDays;
    });

    if (outOfStock.length > 0) {
      out.push({
        id: "out-of-stock",
        title: `${outOfStock.length} item(s) out of stock`,
        body: outOfStock
          .slice(0, 3)
          .map((i) => i.name)
          .join(", "),
        tone: "danger",
        timestamp: today.toISOString(),
        href: "/inventory?filter=out",
      });
    }
    if (lowStock.length > 0) {
      out.push({
        id: "low-stock",
        title: `${lowStock.length} item(s) running low`,
        body: lowStock
          .slice(0, 3)
          .map((i) => `${i.name} (${i.quantity} ${i.unit})`)
          .join(", "),
        tone: "warning",
        timestamp: today.toISOString(),
        href: "/inventory?filter=low",
      });
    }
    if (expired.length > 0) {
      out.push({
        id: "expired",
        title: `${expired.length} item(s) expired`,
        body: expired
          .slice(0, 3)
          .map((i) => i.name)
          .join(", "),
        tone: "danger",
        timestamp: today.toISOString(),
        href: "/inventory?filter=expired",
      });
    }
    if (expiring.length > 0) {
      out.push({
        id: "expiring",
        title: `${expiring.length} item(s) expiring within ${expWarnDays} days`,
        body: expiring
          .slice(0, 3)
          .map((i) => i.name)
          .join(", "),
        tone: "warning",
        timestamp: today.toISOString(),
        href: "/inventory?filter=expiring",
      });
    }

    // Equipment alerts
    const equip = await db.equipment.toArray();
    const needsAttention = equip.filter((e) =>
      ["needs_maintenance", "damaged", "under_repair", "missing"].includes(e.status)
    );
    if (needsAttention.length > 0) {
      out.push({
        id: "equipment-attention",
        title: `${needsAttention.length} equipment items need attention`,
        body: needsAttention
          .slice(0, 3)
          .map((e) => e.name)
          .join(", "),
        tone: "warning",
        timestamp: today.toISOString(),
        href: "/equipment",
      });
    }

    // Event reminders — today & tomorrow
    const events = await db.events.toArray();
    const todayEvents = events.filter(
      (e) => isSameDay(new Date(e.date), today) && e.status !== "cancelled" && e.status !== "completed"
    );
    const tomorrowEvents = events.filter(
      (e) =>
        isSameDay(new Date(e.date), new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) &&
        e.status !== "cancelled" &&
        e.status !== "completed"
    );

    for (const ev of todayEvents) {
      out.push({
        id: `event-today-${ev.id}`,
        title: `Today: ${ev.name}`,
        body: `${ev.client} · ${ev.startTime || ""} ${ev.venue ? "· " + ev.venue : ""}`,
        tone: "info",
        timestamp: today.toISOString(),
        href: "/events",
      });
    }
    for (const ev of tomorrowEvents) {
      out.push({
        id: `event-tomorrow-${ev.id}`,
        title: `Tomorrow: ${ev.name}`,
        body: `Prepare for ${ev.client}${ev.venue ? " at " + ev.venue : ""}`,
        tone: "info",
        timestamp: today.toISOString(),
        href: "/events",
      });
    }
  }

  return out;
}

/**
 * Run a notification sweep: collect active notifications and fire
 * native notifications for any that haven't been shown yet.
 * Returns the list of active notifications (for in-app display).
 */
export async function runNotificationSweep(): Promise<AppNotification[]> {
  const active = await collectNotifications();
  const shown = getShown();
  let addedNew = false;

  for (const n of active) {
    // Only fire native once per id per calendar day.
    const todayKey = new Date().toISOString().slice(0, 10);
    const dedupeKey = `${n.id}::${todayKey}`;
    if (!shown.has(dedupeKey)) {
      fireNative(n.title, n.body);
      shown.add(dedupeKey);
      addedNew = true;
    }
  }

  // Prune: drop keys older than 2 days
  const pruned = new Set<string>();
  for (const key of shown) {
    const parts = key.split("::");
    if (parts.length === 2) {
      const d = new Date(parts[1] + "T00:00:00");
      if (Math.abs(differenceInDays(new Date(), d)) <= 2) pruned.add(key);
    }
  }
  if (addedNew || pruned.size !== shown.size) saveShown(pruned);

  try {
    localStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
  } catch {}

  return active;
}

export function lastRunAt(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
}

export async function dismissNotification(id: string) {
  const shown = getShown();
  const todayKey = new Date().toISOString().slice(0, 10);
  shown.add(`${id}::${todayKey}`);
  // also suppress for 7 days by adding 7 day-keys? simple: just mark it today
  saveShown(shown);
}
