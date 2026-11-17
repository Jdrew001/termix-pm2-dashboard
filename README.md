# PM2 Dashboard

Termix plugin with a dedicated PM2 sidebar menu for Faith Tabernacle and Abide Studios / Kingdom Flow.

- Automatic metrics every five seconds while visible.
- Click an app name for PM2 ID, PID, process owner/name/state, CPU, memory and restart count.
- Live log following, sampled roughly every two seconds, with regular output, errors or combined labeled streams.
- Search within the current buffer, pause/resume, auto-scroll, wrap lines and clear the local view.

Uses only three official read operations: process-manager.list-apps, process-manager.list-processes and process-manager.tail-logs. No new SSH or credential capabilities, workload controls, telemetry or external service. Details exclude arguments and environments. Logs stay in the open view, never in plugin storage.

Built for Termix 26.11.1 and SDK 1.1.4. Abide automatic monitoring remains gated until its PM2 helper repair; after verification turn on Automatically update Abide in native Settings > PM2 Dashboard.

See docs/index.md for boundaries and usage. Releases are signed by Abide Studios and distributed through our custom registry; this is not an official or community-reviewed plugin.

PM2 log styling (1.5.0): process ID/name and OUT/ERR prefixes, timestamp/context/level/duration colors, subtle stderr gutter, and a plain-output toggle. Styling uses text spans only; original sanitized message text is preserved. Existing ANSI/control sanitization stays in place; timestamps are only highlighted when present, never fabricated.

PM2 overview (1.6.0): compact grid cards and sortable table; view preference saved locally, search by app/state/PID. Server headers summarize online count and known process memory with sample time and stale status. Never imply scheduled Abide data is live. Process details and log controls remain unchanged.

1.6.1 makes active log search visible with counts and Clear filter. PM2 output is distinct from Nginx web access logs. Faith now uses a read-only server adapter combining giving/web PM2 homes, namespace-qualified IDs, no workload changes, safe-field metrics, bounded fixed-path logs.

## Automatic updates

Registry URL: https://raw.githubusercontent.com/Jdrew001/termix-pm2-dashboard/main/registry/index.json

Signing key ID: `db1b7fde86609f54`

Public key: `FU2kHPJSIOlVPlcFSjhC7Bil8nBhM3R0cgf7zUgSrMU=`

Add the registry in Termix, confirm that fingerprint, install PM2 Dashboard from it and turn on **Update on its own**. Linked desktops also need to trust this registry key once. New permissions always require approval. Termix 26.11.1 checks automatically two minutes after server startup, then every six hours while running; updates are not instant push notifications.

To release: update the version in manifest.json, package.json and package-lock.json, add release notes to CHANGELOG.md and push to main. GitHub Actions runs all checks, packs and signs the plugin, verifies its signature, publishes immutable release assets and updates the feed. No version is overwritten. Pull requests run checks without access to the signing secret. The private signing key is a GitHub Actions secret and must never be committed.
