# Changelog

## 1.7.0

### Added

- Live CPU and memory history charts in process details, with 1/5/10-minute views and pointer/keyboard inspection.
- Bounded session history collected from existing five-second samples; visible gaps on restarts, missing metrics and disconnects. No persistent monitoring database or additional server permissions.

## 1.6.3

### Changed

- Inherit the selected Termix accent for dashboard identity, active view/log controls, CPU meters, log contexts/prefixes and floating Copy.
- Use theme surface, text and error tokens so Appearance changes apply live; retain distinct semantic warnings and successes.

## 1.6.2

### Added

- Signed releases and an Abide Studios update feed published automatically after release checks.
- Document the signing fingerprint and automatic update setup.

## 1.6.1

### Fixed

- Make active log filters obvious with visible/total counts and a Clear filter button.
- Clarify that this is application output; web page visits appear in access logs.

## 1.6.0

### Changed

- Redesigned PM2 overview with compact process cards and a saved Grid/Table view toggle.
- Search apps by name, status or PID; sort table columns by name, CPU, memory and restarts.
- Compact server headers show live/stale status, online counts, application memory and sample time.
- Preserve process detail navigation, live sampling and Abide maintenance gating.

## 1.5.0

### Added

- PM2-style process ID/name prefixes with compact OUT/ERR labels.
- Colorized timestamps, structured log levels, contexts and durations; errors receive a subtle gutter.
- PM2 styling toggle for plain output. Original message text and selection are preserved.

## 1.4.0

### Changed

- Compact app toolbar and metric strip, with secondary fields under More details.
- Remove the duplicate PM2 introduction from app details and let logs fill the remaining height.
- Tighten log controls and buffer summary while retaining selection Copy and floating follow controls.

## 1.3.0

### Added

- A floating Copy button for selected single-line or multiline log text, with success/failure feedback.

### Changed

- Put paused-following controls in a compact overlay inside the logs to prevent page jumps.
- Hold automatic scrolling while log text is selected.

## 1.2.2

### Fixed

- Scrolling up holds your reading position while logs continue arriving.
- Following resumes at the bottom, with a Jump to latest shortcut.

## 1.2.1

### Fixed

- Keep PM2 sample timestamps and stale-metric notices visible inside app details.

## 1.2.0

### Added

- Click app names to open process details and live log following.
- Regular, error and combined streams, text filtering, pause/resume, auto-scroll and wrapping.
- Source-aware tail overlap handling, rotation notices, bounded history, reconnection and subscription cleanup.

## 1.1.0

### Added

- Automatic five-second updates, stale-connection notices and polling cleanup.
- Keep Abide automatic reads paused until the server helper repair.

## 1.0.0

### Added

- PM2 menu and per-host monitoring cards using the existing read operation.
