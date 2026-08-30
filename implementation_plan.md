# Minimalist Always-on-Top Widget Mode

We will implement a "Widget Mode" that seamlessly transforms the main Enclave application window into a sleek, draggable, always-on-top capsule, and restores the full window when deactivated.

## User Review Required

- **Transparency on Windows**: By default, Windows does not support rounded corners on borderless (decoration-free) windows without losing native window rendering. The widget will function perfectly, but it will have sharp corners rather than physically transparent rounded corners, unless we rebuild the entire app's title bar from scratch. Is a solid capsule acceptable?
- **Widget Content**: What specifically should be visible in the widget? For now, I will include:
  1. A Quick Search button (Ctrl+K)
  2. The name of the active module
  3. A Quick-Lock button
  4. An Expand/Restore button to go back to full-screen mode

## Proposed Changes

### 1. `src-tauri/capabilities/default.json`
- Add permissions to allow the frontend to manipulate the native OS window dynamically:
  - `core:window:allow-set-decorations`
  - `core:window:allow-set-always-on-top`
  - `core:window:allow-set-size`
  - `core:window:allow-set-position`
  - `core:window:allow-outer-position`
  - `core:window:allow-outer-size`
  - `core:window:allow-start-dragging`

### 2. `src/App.tsx`
- Introduce `isWidgetMode` state.
- Create `enterWidgetMode()` and `exitWidgetMode()` functions.
- `enterWidgetMode`:
  - Saves the current window size and position.
  - Calls `setDecorations(false)` to hide the Windows titlebar and borders.
  - Calls `setAlwaysOnTop(true)`.
  - Resizes the window to `(400, 70)` and moves it to the top-center of the monitor.
- Render `<WidgetModeOverlay />` instead of the main layout when active.

### 3. `src/components/WidgetMode.tsx` [NEW]
- A new component serving as the UI for the widget.
- Uses `data-tauri-drag-region` so you can click and drag the widget around the screen.
- Contains the buttons and mini-dashboard elements.

### 4. `src/components/AppLayout.tsx`
- Add a new "Widget Mode" toggle button to the sidebar navigation to trigger the transformation.

## Verification Plan
1. Click the "Widget Mode" button in the sidebar.
2. Verify the window smoothly shrinks, snaps to the top-middle, and stays above other applications.
3. Verify dragging the widget works.
4. Click "Expand" on the widget to verify the window returns to its exact previous size, position, and restores the native OS title bar.
