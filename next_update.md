# Next Update (v1.1.9) Tracker

This document tracks all planned bug fixes, new features, and additions to existing features for the upcoming release, ordered by priority.

---
# 🔴 HIGH PRIORITY (Critical Bugs & Core UX)

## [x] 1. Module Transition Ghosting (State/Render Bug)
**Description:** 
When switching between modules (e.g., from My Vault to Tasks, or Income to Calendar), the previously loaded module gets "glued" to the screen and persists across other tabs. 
**Symptom:** The sidebar highlights the correct active tab, and the `middlePane` updates correctly. However, the right-side main `{content}` pane completely freezes and continues to display the old module's content (e.g., the "Add New Account" form from My Vault bleeds into the Notes module).
**Workaround:** The user has to click through the modules repeatedly to force React to finally load and render the correct components.
**Likely Cause:** A desync between how `middlePane` and `children` are wrapped in `App.tsx`. Because the right-side content is wrapped in a `Suspense` and `AnimatePresence` boundary, it is failing to unmount the old chunk while loading the new one, resulting in a fractured "split-brain" UI.

## [x] 2. Active Module State Persists Across Locks (Privacy/State Bug)
**Description:** 
When locking the vault without fully closing the application, and then logging back in, the user is automatically sent back to the exact module they were last viewing (e.g., Income). 
**Expected Behavior:** The active tab state should reset to a secure default (like 'Dashboard' or 'My Vault') upon lock/unlock to prevent accidental exposure of sensitive modules to shoulder surfers.
**Likely Cause:** The `activeTab` state variable in `App.tsx` (or `AppLayout`) is not being wiped or reset to a default value during the `lockVault` sequence.

## [x] 3. UI/UX: Custom Native Dialogs & Auto-Lock Notices (Design Enhancement)
**Description:** 
Replace all default browser `window.confirm()` and `window.alert()` pop-ups (e.g., the "tauri.localhost says: Are you sure you want to permanently erase this vault?") with custom-designed, aesthetic React modals.
**Details:** 
- Destructive actions (like erasing the vault) should use a custom modal with a dangerous/red glowing aesthetic that matches the Enclave theme.
- The "Auto-Lock" notice timer should be redesigned to integrate seamlessly into the app's cyberpunk/glassmorphism UI.

## [x] 4. Remove "Secure Docs" Module from Codebase (Cleanup)
**Description:** 
Officially deprecate and completely remove the Secure Docs module from the live application.
**Action Items:**
- Remove the "Secure Docs" tab from the sidebar navigation in `AppLayout.tsx`.
- Delete the `SecureDocs.tsx` (or related) React components.
- Remove it from the `activeTab` switch statement in `App.tsx`.
- Strip out any underlying Rust backend logic, file-handling payloads, or state variables related to document storage to save bundle size and complexity.

---
# 🟡 MEDIUM PRIORITY (Core Feature Overhauls)

## [x] 5. "My Vault" Credentials Overhaul (Security Expansion)
**Planned Features:**
- **Custom Fields & Recovery Codes:** Ability to add limitless custom key-value pairs (e.g., PINs, Security Questions, backup codes).
- **Built-in 2FA Authenticator (TOTP):** Generate the rotating 6-digit 2FA codes directly inside the app.
- **Smart Favicon Fetching:** Automatically pull the official logo/icon of the website based on the URL.
- **Advanced Password Generator UI:** Slide-out panel for the generator with a dynamic Password Strength Meter.
- **Secure Auto-Clear Clipboard:** A one-click copy button that automatically erases the password from the clipboard after 30 seconds.
- *(Note: Folders deferred to future UX pass if requested)*

## [x] 6. Dashboard Overhaul (Aesthetic & Functionality Upgrade)
**Planned Features:**
- **Dynamic Greetings & Motivational Quotes:** Time-aware greetings accompanied by rotating productivity motivations.
- **Customizable Widget Grid:** Modular widget system allowing users to pin mini-views (e.g., *Today's Tasks, Recent Transactions*).
- **Security Health Score:** A visual gauge evaluating the vault's overall health (weak passwords, backup reminders).
- **Quick Action Bar:** A floating row of buttons to instantly log an expense, add a task, or save a password.
- **Activity Heatmap:** A sleek, GitHub-style contribution heatmap showing vault activity over the last year.
- **Aesthetic Cyber-Clock:** A minimalist digital clock widget.

## [x] 7. Notes Module (Knowledge Graph Upgrade)
**Planned Features:**
- **Block-Based Rich Editor:** Notion-style WYSIWYG editor supporting slash commands (`/header`, `/code`), inline images, and syntax highlighting.
- **Note Linking (Backlinks):** Obsidian-style `[[linking]]` to connect notes together.
- **Infinite Nesting & Folders:** Robust sidebar folder system for deep hierarchies.
- **Export to PDF/Markdown:** One-click export button.

## [x] 8. Tasks Module (Productivity Expansion)
**Planned Features:**
- **Kanban Board View:** Trello-style board (*To Do, In Progress, Done*) with drag-and-drop.
- **Sub-tasks & Checklists:** Break massive tasks down into smaller checkable items.
- **Priority Flags:** Tag tasks as *Low, Medium, High, or Urgent*.
- **Pomodoro / Time Tracker:** Built-in focus timer attached to specific tasks.

---
# 🟢 LOW PRIORITY (Auxiliary Modules)

## [x] 9. Income/Financial Module Overhaul
**Planned Features:**
- **Entry Editing & Deletion:** Ability to permanently delete or edit existing entries.
- **Categorization & Tags:** Assign transactions to categories (*Salary, Subscriptions, Groceries*) with color coding.
- **Data Visualization (Charts):** Interactive charts showing balance trends and pie chart breakdowns.
- **Recurring Transactions:** Automate monthly expenses.
- **Monthly Budgets & Goals:** Spending limits per category with a visual progress bar.
- **Export to CSV:** Export the financial ledger to a spreadsheet.
- **Retroactive/Backdated Entries:** Custom date selector for past logging.
- **Multi-Wallet / Account Support:** Separate funds into virtual "wallets" (*Cash, Checking, Credit Card*).
- **Advanced Filtering & Search:** Search bar and filters by keyword, date, or category.
- **Split Transactions:** Split a single receipt into multiple categories.
- **Notes & Memos Field:** Text area for additional context.

## [x] 10. Calendar Module Overhaul
**Planned Features:**
- **Interactive Drag-and-Drop:** Grab an event block and drag it to reschedule.
- **Task Module Integration:** Seamless integration where due Tasks appear as pills on the calendar.
- **Recurring Events:** Set up automatically repeating events.
- **Color-Coded Event Tags:** Assign types (*Academic, Personal, Urgent*) to colorize blocks.
- **Agenda / Schedule View:** Toggle a vertical chronological list of upcoming events.
- **Native OS Desktop Notifications:** Tauri push notifications 15 minutes before an event.
