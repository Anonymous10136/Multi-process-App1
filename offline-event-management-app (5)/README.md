# EventOps

Offline-first inventory, package costing, equipment, event, and profit management for Grazing Table, Photobooth, and Mobile Wine Bar businesses.

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS
- IndexedDB via Dexie for offline business data
- Progressive Web App (manifest + service worker)

No cloud database or account is required for normal use. Business data stays in the browser's IndexedDB on each device.

## Required project root

The folder imported into Vercel, Netlify, or another host must contain these files directly at its top level:

```text
package.json
next.config.ts
vercel.json
tsconfig.json
postcss.config.mjs
public/
src/
```

Do not upload only `src/`, `public/`, or `.next/`. If the files are inside another folder such as `eventops/`, select `eventops/` as the host's **Root Directory**.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production test:

```bash
npm run build
npm run start
```

## Permanent Vercel deployment

### Method 1: GitHub import

1. Create a new empty GitHub repository.
2. Upload the complete project root. Confirm `package.json` is visible on the repository's first page.
3. Open [vercel.com/new](https://vercel.com/new) and import the repository.
4. Under **Root Directory**, choose the folder containing `package.json`. Usually this is `./`.
5. Vercel should show **Framework Preset: Next.js** automatically. If it says Other, the selected Root Directory is wrong.
6. Leave Build Command as `npm run build` and Output Directory as `.next`.
7. No `DATABASE_URL` is required. EventOps uses local IndexedDB.
8. Click **Deploy**.
9. Open the permanent `https://your-project.vercel.app` URL directly in Chrome or Safari and install the PWA.

### Method 2: Vercel CLI

Run these commands from the same folder as `package.json`:

```bash
npm install
npx vercel
npx vercel --prod
```

When asked for the directory containing the code, enter `./`.

## Mobile installation

### Android

1. Open the permanent HTTPS URL directly in Chrome.
2. Tap **Install App** in EventOps, or Chrome menu `⋮` → **Install app**.
3. Confirm installation.

### iPhone/iPad

1. Open the permanent HTTPS URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

## Important local-data behavior

Each browser/device has its own EventOps database. Deploying a new version does not move data between devices. Use **More → Backup & Restore → Export Backup** before clearing browser storage, changing phones, or uninstalling the application.
