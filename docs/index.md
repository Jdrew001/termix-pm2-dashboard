# PM2 Dashboard

Open PM2 in the desktop sidebar. Faith updates automatically; Abide is held until the scheduled helper repair. Choose an app name to open its detail view. Metrics and process information continue updating while the view is visible. An exited PID is reported explicitly and the next PM2 sample follows a replacement PID.

## Logs

The detail page opens a live log view automatically. Select Combined, Regular output or Errors. Classification follows the PM2 log-file headers, not whether a message contains the word "error". Custom/unrecognized filenames are marked Unclassified in Combined. Search filters locally. Pause stops the subscription; Resume reconnects at the latest tail. Clear view affects only the local buffer, never server files. Scrolling up suspends following while new logs continue arriving. Scroll to within eight pixels of the bottom to follow again, or use Jump to latest. Turning Auto-scroll off explicitly keeps following disabled until re-enabled or Jump to latest is used. Line wrapping is independent. Paused-following controls float inside the log area without changing its position or height. Select log text to reveal Copy next to the selection; it copies exactly that selection, including line breaks. Automatic scrolling waits while a selection is active. Copy feedback reports clipboard failures rather than claiming success.

The backend sends authenticated SSE updates from a serial, roughly two-second tail sample. Each read uses the existing Process Manager operation under the current user, preserving its host access checks. No long-running remote tail process is created. The viewer stops requests when hidden, paused or closed, retries failed connections with bounded backoff, and marks stale data. Backend shutdown closes every stream. At most four streams per actor are allowed, with bounded response buffering.

Starts with up to 200 lines per source and retains at most 2,000 lines in this view. Combined history is grouped by source file; additions are in observed order, not guaranteed global chronological order. This is a live tail viewer, not a durable log collector: rapid bursts, repeated identical full tails, or rotation can exceed the sampled window. No-overlap changes show a rotation/history notice. PM2 files on the host remain authoritative. Secret or customer data already present in app logs can appear in the viewer; no additional command arguments or environment values are read for details, and no logs are saved by this plugin.

## Abide

Automatically update Abide must stay off until kingdom-runtime-pm2 no longer starts a manager for read commands, including logs. The midnight task must test read-only inactive behavior, enable the preference and verify metrics plus live regular/error/combined logs in the native app.

## Compact detail layout

The app detail screen uses a compact toolbar and a single metric strip. Expand More details for host address, PM2 ID, process name/state and host memory percentage. The log viewport fills the remaining panel height instead of starting below a large introduction or fixed-size detail card.

PM2 log styling (1.5.0): process ID/name and OUT/ERR prefixes, timestamp/context/level/duration colors, subtle stderr gutter, and a plain-output toggle. Styling uses text spans only; original sanitized message text is preserved. Existing ANSI/control sanitization stays in place; timestamps are only highlighted when present, never fabricated.

PM2 overview (1.6.0): compact grid cards and sortable table; view preference saved locally, search by app/state/PID. Server headers summarize online count and known process memory with sample time and stale status. Never imply scheduled Abide data is live. Process details and log controls remain unchanged.

1.6.1 makes active log search visible with counts and Clear filter. PM2 output is distinct from Nginx web access logs. Faith now uses a read-only server adapter combining giving/web PM2 homes, namespace-qualified IDs, no workload changes, safe-field metrics, bounded fixed-path logs.

Theme integration (1.6.3): normal emphasis uses core --accent-brand, surfaces/text use core tokens, and log errors use --destructive. Read CSS variables directly; never cache an accent in React state. Appearance changes should apply immediately. Keep meaningful warning/success colors distinct from navigation and selection.
