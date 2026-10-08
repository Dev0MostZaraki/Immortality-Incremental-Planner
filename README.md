# Immortality Incremental Planner

An independent, unofficial fan-made planning toolkit for Immortality Incremental. Not affiliated with the game's creators.

## Tools
- **Endurance Planner:** live time-to-target, Increase comparisons, unit conversions, quick targets, reverse calculations and projections.
- **Progression Planner:** upgrade ROI, sequential upgrade paths, milestones, reset comparisons and what-if planning based only on entered gains and costs.
- **Law Synthesis:** nine laws, material inventory, Mark-based farming routes, source/measured rates, optional Beast Core farming and a goal checklist.
- Complete **German / English** interface with localized numbers, dates, durations and clipboard summaries.

## Privacy and data
Calculations run locally in the browser. No app server APIs, accounts, ads or analytics. Calculator work and the language preference use versioned localStorage records; clearing browser storage removes saved work. Clipboard access requires browser permission.

Law costs and base drop estimates are an embedded Astral3nt Immortality Incremental Hub snapshot from October 2026. Fan-maintained data may change with game updates. Farm times are expected averages, not RNG guarantees. Core time is included only when a rate is supplied.

## Development
React 19, TypeScript, TanStack Start and Tailwind CSS. A lightweight local dictionary provides translations; no translation service is used.

```sh
bun install
bun run dev
bun run test
bun run build
node dist/server/index.mjs
```

The independent Nitro production build writes client assets to `dist/client` and the server to `dist/server`. npm equivalents work as well (`npm install`, `npm run dev`, `npm test`, `npm run build`).

Version 1.3.0 retains imports of validated v1.1.0 and v1.2.0 backups. Data controls and repository links are in the header's action menu.

Math and language tests live beside their modules; browser checks cover both tools, language persistence and mobile layouts. Required build/editor configuration is retained, separate from the app's independent public identity.