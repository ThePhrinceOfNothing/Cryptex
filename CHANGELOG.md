# Changelog

All notable changes to Tectoryx are documented in this file.

## [1.6.0] - 2026-11-18

### Added
- **Binary Storage Engine:** Low-level pipeline optimizations for binary asset handling and storage.
- **Memory Buffer Lifecycle:** Enhanced in-memory blob lifecycle management and automatic resource disposal.
- **System Stability:** Refined global shortcut dispatching and window focus routines.

## [1.5.5] - 2026-11-16

### Added
- **Modular Workspace Architecture:** Complete user control over active modules. Toggle off Tasks, Calendar, Income, Ambience, or Steganography in Settings to keep the sidebar minimal and distraction-free.
- **Configurable Default Landing Screen:** Choose which view opens immediately upon unlocking the vault (`My Vault`, `Notes`, `Dashboard`, or `Tasks`), defaulting directly to `My Vault`.
- **Distraction-Free Quiet Defaults:** Virtual pet companion, speech bubbles, and gamification XP cards are now disabled by default, transforming Tectoryx into a silent, calm, and focused cryptographic safehouse.
- **Cleaned Dashboard:** Mood logging and achievement badge sections now only show if companion gamification is explicitly enabled, keeping the dashboard focused on vault security and quick actions.

## [1.5.4] - 2026-11-16

### Added
- **Multi-Tier Vault Preservation System:** Complete protection against data loss caused by crashes, power loss, updates, or accidental corruption.
- **Atomic File Writes & Fsync:** Saves are staged in temporary files with byte-level disk synchronization (`sync_all`) before atomic replacement, completely preventing half-written or corrupted files on crash.
- **Automatic Encrypted Rolling Snapshots:** Every vault save automatically creates a local, AES-256-GCM encrypted snapshot in a rolling backup history (retaining up to 30 recent snapshots).
- **Pre-Update & Pre-Destructive Snapshots:** The app automatically takes an immutable snapshot of the active vault prior to applying any application update, restoring a backup, or erasing data.
- **Transparent Self-Healing Fallback:** If `data.vault` is ever missing, zero-bytes, or corrupted, the application automatically recovers from `data.vault.prev` or the latest valid local snapshot.
- **In-App Snapshot Recovery UI:** Added "Local Vault Restore Points" management to Settings, Onboarding, and the Lock Screen ("Trouble unlocking?"), allowing instant 1-click restoration to any historical snapshot.

## [1.5.3] - 2026-11-16

### Fixed
- **Lock Vault Modal Flash:** Eliminated the race condition where `UpdateLogsModal` detected `vaultData` becoming `null` on lock and briefly opened during the 0.4s fade-out animation.
- **Strict Decoy Vault Isolation:** Enforced hard isolation for the Duress/Decoy vault mode. Decoy mode is strictly prohibited from mutating or saving to the physical `data.vault` file or modifying unencrypted profile metadata on disk.
- **Lock Screen Identity:** Restored clear workspace identity labeling on the lock screen under the Tectoryx brand emblem.

## [1.5.2] - 2026-11-15

### Added
- **Custom Native Title Bar:** Frameless window with native borderless drop shadow, draggable title bar, double-click maximize/restore, and custom minimize, maximize, and close controls.
- **Desktop Window Hygiene:** Blocked accidental F5/Ctrl+R browser reloads to protect decrypted vault state in RAM; suppressed default Chromium context menus on non-input chrome; prevented accidental file-drop navigation.
- **Global Selection Protection:** Added desktop UI text-selection prevention across cards, toolbars, and buttons while preserving selectable text in notes and inputs.
- **Focus Ambience Generator:** Procedural Web Audio API synthesizer with presets for Heavy Rain, Campfire crackle, Clock tick, and White noise.
- **PNG Steganography Tool:** Encrypt and embed confidential messages into lossless PNG carrier images with LSB decoding.
- **Global Scratchpad:** Quick-capture scratchpad overlay for fleeting thoughts with one-click conversion to tasks or encrypted notes.
- **Note Constellation Graph:** Interactive knowledge constellation connecting linked notes with tag filters and direct editor access.

### Changed
- **Unconstrained Desktop Panels:** Removed artificial 768px web constraints (`max-w-3xl`) across Calendar, Notes Editor, My Vault Detail, and Settings to leverage widescreen monitors.
- **Lock Screen De-Slop:** Removed filler status badges, horizontal dividing lines, workspace name redundancy, and technical buzzwords in favor of a clean, centered desktop unlock hub.
- **Dashboard Cleanup:** Removed redundant digital clock header widget; renamed achievement categories to clean Milestones.

### Fixed
- **Terminal Hacker Mode Persistence:** Resolved React state closure race condition that caused CRT phosphor themes to flash and revert immediately upon selection.
- **Atomic Settings Updates:** Unified setting changes with gamification badge unlocks in a single atomic update.
