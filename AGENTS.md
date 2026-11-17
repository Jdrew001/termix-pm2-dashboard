# AGENTS.md

This repo is a [Termix](https://github.com/Termix-SSH/Termix) plugin. These notes are for AI coding tools.

## Read first

Before changing anything, read `node_modules/@termix-ssh/plugin-sdk/PLUGIN-GUIDE.md`. It covers the
manifest, backend, database, frontend, UI, testing, releasing and submitting to the community registry,
and it matches the SDK version installed here. If it is missing, run `npm install`. If it is still missing,
the SDK is older than 1.0.6: run `npm install -D @termix-ssh/plugin-sdk@latest` or read
https://docs.termix.site/develop instead.

If the guide and the SDK's TypeScript types disagree, the types are right.

## First time setup

If `manifest.json` still has the id `hello-world`, this plugin was just made from the template. Ask the
user for the plugin's id, name and description, then:

1. In `manifest.json`, set `id`, `name`, `description`, `author`, `repository`, `docs`, `category`,
   `icon` and `features`. The id is lowercase with dashes and can't change after the first release.
2. Rename every `hello-world`, `hello_world` and `Hello World` to match: `package.json`,
   `locales/en.json`, the index name in `src/backend/tables.ts`, the API paths in `src/backend/routes.ts`,
   the tab id in `src/frontend/index.tsx`, the tests, `docs/index.md`, `CONTRIBUTING.md` and `README.md`.
3. Delete `migrations/` and run `npm run migrations` so the tables use the new id.
4. Replace the example notes feature with the real one, and fill in "About this plugin" below.

## Commands

```bash
npm run build        # bundle into dist/
npm test             # run the tests
npm run typecheck    # type check
npm run validate     # check manifest.json, migrations, changelog and docs
npm run migrations   # write migrations after changing src/backend/tables.ts
npm run pack         # write <id>-<version>.tmxplug
npm run format       # format with Prettier
```

`npx termix-plugin dev --server <url> --key <tmx_...>` installs the plugin on a Termix server with
developer mode on and reinstalls it on every save. Don't start it unless the user asks.

## The plugin process

The backend runs in its own Node process (plugin API 2). It reaches Termix only through `ctx`, can read only
its own folder and opens no sockets or child processes unless a capability grants it. List every
`ctx.schedule.every` id, `ctx.events.on` topic and `ctx.registry.provide` key in the manifest's `sandbox`
block, await `services.get` and `registry.consume`, and pass only plain data to `ctx`. The tests run with
`createMockCtx({ sandbox: true })`, which applies the same rules. The guide's "The plugin process" section
has the details.

The frontend runs in a sandboxed frame that reaches only its own routes. `tests/frontend/frame.test.ts`
(`checkFrameApp`) and `frame-views.test.ts` (`checkFrameViews`) fail when the plugin registers or reads
something a frame can't. Keep both; the guide's "Frames" section has the rules.

## Actions

Declare what the plugin can do in `contributes.operations` and register each handler with `ctx.operations.register` (see `src/backend/operations.ts`). Every surface then finds it on its own: Operations Center, Automations, the CLI, the phone app and the command palette. Read the Operations section of PLUGIN-GUIDE.md before adding one.

## Layouts and themes

A plugin can also be a layout (`contributes.layouts`, capability `ui:layout`, `app.registerLayout` in the
frontend, shell state from `useShell()`) or add themes (`contributes.themes`, capability `ui:theme`, one CSS
file per theme scoped under `.<id>`). A theme only plugin has no `src/`: just `manifest.json`, `themes/*.css`,
`locales/` and a test that runs `validateThemeCss()`. The guide's "Layouts and themes" section has the rules.

## Done means

- `npm test`, `npm run typecheck`, `npm run validate`, `npm run build` and `npm run format:check` pass
- `npx termix-plugin migrations --check` passes
- New UI text is in `locales/en.json`, new routes have an `@openapi` block and a test
- New routes and sockets have an entry in `authz.json` (the guide's "Authorization table" section)
- `docs/` and the section below still match what the plugin does
- User facing changes are in `CHANGELOG.md` under the version they ship in

## About this plugin

Keep this section current when the plugin changes: what it does, how it is put together, decisions that
aren't obvious from the code, and anything that has bitten you before.

- What it does: Dedicated PM2 menu, automatic metrics, clickable process details and live regular/error/combined log tails. SDK 1.1.4 / plugin API 1.17 matches installed Termix 26.11.1. No database or workload mutations. The only operations invoked are Process Manager list-apps, list-processes and tail-logs. Abide automatic reads remain gated by the existing preference until its helper repair.
- Live logs: authenticated SSE around serial two-second tail reads, source-header parsing, overlap delta handling, bounded client history, reconnect and disposal. Combined initial history is grouped by source; this is not a durable lossless collector. Never pass raw process arguments/environments to UI or persist log content.
- SDK 2 frame tests in the latest template do not apply to this SDK 1 plugin. Preserve permission, sanitization, SSE cleanup, parsing and UI-control tests.

- Log scrolling: keep stream subscription separate from viewport following. Scrolling up suspends following immediately; incoming samples must not move the reader. Resume only at the bottom or via Jump to latest. Manual Auto-scroll off overrides automatic resume.

- Selection UX: floating Copy is limited to selections wholly inside the log viewport and preserves the selection on click. Do not move the viewport during an active selection. Follow-paused controls are positioned overlays inside a fixed-height log frame, never header content that shifts the log viewport.

- Detail layout: keep the toolbar and key metrics compact; secondary fields are collapsed by default. The log section flexes into the remaining panel height. Avoid duplicate overview introductions in app details.

PM2 log styling (1.5.0): process ID/name and OUT/ERR prefixes, timestamp/context/level/duration colors, subtle stderr gutter, and a plain-output toggle. Styling uses text spans only; original sanitized message text is preserved. Existing ANSI/control sanitization stays in place; timestamps are only highlighted when present, never fabricated.

PM2 overview (1.6.0): compact grid cards and sortable table; view preference saved locally, search by app/state/PID. Server headers summarize online count and known process memory with sample time and stale status. Never imply scheduled Abide data is live. Process details and log controls remain unchanged.
