"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Modal, Badge } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function triggerPWAInstallModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("open-pwa-install-modal"));
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect iframe
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }

    // Detect platform
    const ua = navigator.userAgent || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    // Detect standalone installed mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setIsInstalled(true);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onModeChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener("change", onModeChange);

    // Register Service Worker immediately (do NOT wait for window 'load' which already fired!)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          setSwReady(true);
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("SW registration warning:", err);
        });

      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => {});
    }

    // Check if global script in <head> already captured beforeinstallprompt
    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEv = e as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = promptEv;
      setDeferredPrompt(promptEv);
    };

    const onCustomReady = () => {
      if (window.__deferredInstallPrompt) {
        setDeferredPrompt(window.__deferredInstallPrompt);
      }
    };

    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("pwa-install-available", onCustomReady);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      mediaQuery.removeEventListener("change", onModeChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("pwa-install-available", onCustomReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "manual"> => {
    const promptEvent = deferredPrompt || window.__deferredInstallPrompt;
    if (!promptEvent) {
      return "manual";
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        window.__deferredInstallPrompt = null;
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
      return choice.outcome;
    } catch {
      return "manual";
    }
  }, [deferredPrompt]);

  return {
    canNativePrompt: !!(deferredPrompt || (typeof window !== "undefined" && window.__deferredInstallPrompt)),
    isInstalled,
    swReady,
    inIframe,
    platform,
    promptInstall,
  };
}

export function PWAInstall() {
  const { canNativePrompt, isInstalled, swReady, inIframe, platform, promptInstall } = usePWAInstall();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const openHandler = () => setModalOpen(true);
    window.addEventListener("open-pwa-install-modal", openHandler);
    return () => window.removeEventListener("open-pwa-install-modal", openHandler);
  }, []);

  async function handlePrimaryInstallClick() {
    if (canNativePrompt) {
      const res = await promptInstall();
      if (res === "manual") {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  }

  function copyAppUrl() {
    if (typeof window === "undefined") return;
    const url = window.location.origin + "/dashboard";
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <>
      {/* Floating bottom install bar on mobile & desktop when not yet installed */}
      {!isInstalled && !bannerDismissed && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 px-3 pb-1">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-indigo-300 bg-gradient-to-r from-indigo-600 to-violet-600 p-3 text-white shadow-xl dark:border-indigo-700">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/icon-192.png"
                alt="EventOps"
                className="h-10 w-10 shrink-0 rounded-xl border border-white/20 bg-white/10 shadow"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">Install EventOps Mobile App</div>
                <div className="truncate text-[11px] text-indigo-100">
                  {canNativePrompt
                    ? "Ready for 1-tap offline installation"
                    : platform === "ios"
                      ? "Tap for iPhone / iPad home screen install"
                      : "Install directly to your phone for 100% offline use"}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={handlePrimaryInstallClick}
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow hover:bg-indigo-50 active:scale-95"
              >
                Install App
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-indigo-100 hover:bg-white/15"
                aria-label="Dismiss install banner"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Mobile Installation Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Install EventOps on Your Mobile Device"
        footer={
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-sm">
          {/* App Card Header */}
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <img src="/icon-192.png" alt="EventOps icon" className="h-14 w-14 rounded-2xl shadow" />
            <div className="flex-1">
              <div className="font-bold text-slate-900 dark:text-slate-50">EventOps Offline Manager</div>
              <div className="text-xs text-slate-500">Grazing Table · Photobooth · Mobile Wine Bar</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={swReady ? "green" : "amber"}>
                  {swReady ? "✓ Offline Worker Ready" : "Initializing Worker"}
                </Badge>
                <Badge tone="indigo">✓ 100% Local DB</Badge>
              </div>
            </div>
          </div>

          {/* 1. Native 1-Tap Install if supported */}
          {canNativePrompt && (
            <div className="rounded-2xl border-2 border-indigo-500 bg-indigo-50/70 p-4 dark:bg-indigo-950/40">
              <div className="mb-1 font-bold text-indigo-950 dark:text-indigo-200">
                One-Tap Native Installation Ready
              </div>
              <p className="mb-3 text-xs text-indigo-800 dark:text-indigo-300">
                Your browser supports direct mobile app installation. Tap the button below to install EventOps onto your phone.
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={async () => {
                  const res = await promptInstall();
                  if (res === "accepted") setModalOpen(false);
                }}
              >
                📲 Install EventOps Now
              </Button>
            </div>
          )}

          {/* 2. Important Warning if opened inside an embedded preview iframe */}
          {inIframe && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                <span>⚠️</span>
                <span>You are viewing inside an embedded preview window</span>
              </div>
              <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
                Mobile browsers block app installation inside embedded frames. Tap below to open the app directly in your browser tab, then tap <strong>Install App</strong>.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href="/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-amber-600 px-4 text-xs font-bold text-white shadow hover:bg-amber-700"
                >
                  Open Directly in Browser Tab ↗
                </a>
                <button
                  onClick={copyAppUrl}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400 bg-white px-4 text-xs font-semibold text-amber-900 dark:bg-slate-900 dark:text-amber-200"
                >
                  {copied ? "✓ Link Copied!" : "Copy App URL"}
                </button>
              </div>
            </div>
          )}

          {/* 3. Step-by-step instructions for Android */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-slate-50">
                🤖 Android (Chrome / Samsung Internet / Edge)
              </div>
              {platform === "android" && <Badge tone="green">Your Device</Badge>}
            </div>
            <ol className="list-inside list-decimal space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li>
                Open this URL directly in <strong>Google Chrome</strong> on your Android phone.
              </li>
              <li>
                Tap the <strong>Install App</strong> banner at the bottom, <em>or</em> tap the browser menu{" "}
                <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 font-mono font-bold dark:bg-slate-700">
                  ⋮
                </span>{" "}
                in the top-right corner.
              </li>
              <li>
                Select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>, then confirm <strong>Install</strong>.
              </li>
              <li>
                EventOps will appear in your app drawer & home screen and work <strong>100% offline</strong>.
              </li>
            </ol>
          </div>

          {/* 4. Step-by-step instructions for iPhone / iPad (iOS) */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-slate-50">
                🍎 iPhone & iPad (Safari)
              </div>
              {platform === "ios" && <Badge tone="green">Your Device</Badge>}
            </div>
            <ol className="list-inside list-decimal space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li>
                Open this page in <strong>Safari</strong> on your iPhone or iPad.
              </li>
              <li>
                Tap the <strong>Share</strong> button{" "}
                <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 font-mono font-bold dark:bg-slate-700">
                  ⬆️
                </span>{" "}
                at the bottom of the screen.
              </li>
              <li>
                Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top-right corner. EventOps will launch fullscreen with full offline persistence.
              </li>
            </ol>
          </div>

          {/* Copy Link Helper */}
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <div className="truncate text-xs text-slate-600 dark:text-slate-300">
              Need to open this link on your phone?
            </div>
            <Button size="sm" variant="secondary" onClick={copyAppUrl}>
              {copied ? "✓ Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
