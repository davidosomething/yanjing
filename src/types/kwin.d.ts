/**
 * KWin Scripting API type declarations for Plasma 6.
 *
 * These types describe the global objects injected by KWin's QJSEngine
 * when running KWin scripts. There is no module system — all of these
 * are ambient declarations.
 */

// ===========================================================================
// Geometry
// ===========================================================================

/**
 * A rectangle with position and size.
 * In KWin JS, frameGeometry returns a QRect-compatible object.
 * Assigning a plain {x, y, width, height} object to frameGeometry works
 * because QJSEngine marshals it to a QRect on the C++ side.
 */
interface QRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ===========================================================================
// Enums
// ===========================================================================

/**
 * ClientAreaOption enum — passed as the first argument to
 * workspace.clientArea() to select which area to return.
 */
declare const enum ClientAreaOption {
  PlacementArea = 0,
  MovementArea = 1,
  MaximizeArea = 2,
  MaximizeFullArea = 3,
  FullScreenArea = 4,
  WorkArea = 5,
  FullArea = 6,
  ScreenArea = 7,
}

/**
 * KWin namespace — holds enum values and utility functions
 * available as globals in KWin scripts.
 */
declare namespace KWin {
  /** There is no panel on this screen edge */
  const PlacementArea: ClientAreaOption;
  /** Work area: screen area minus panels/docks */
  const WorkArea: ClientAreaOption;
  /** Full screen area including panels */
  const FullScreenArea: ClientAreaOption;
  /** Movement area for windows */
  const MovementArea: ClientAreaOption;
  /** Maximize area */
  const MaximizeArea: ClientAreaOption;
  /** Full maximize area */
  const MaximizeFullArea: ClientAreaOption;
  /** Entire screen area */
  const FullArea: ClientAreaOption;
  /** Screen area */
  const ScreenArea: ClientAreaOption;
}

// ===========================================================================
// Screen (KWin::Output)
// ===========================================================================

/**
 * Represents a physical display/output.
 */
interface Screen {
  /** Full geometry of the screen including global offset */
  readonly geometry: QRect;
  /** Screen name (e.g. "DP-1") */
  readonly name: string;
  /** Manufacturer name */
  readonly manufacturer: string;
  /** Model name */
  readonly model: string;
  /** Physical DPI */
  readonly logicalDpi: number;
  /** Device pixel ratio */
  readonly devicePixelRatio: number;
}

// ===========================================================================
// Window (KWin::AbstractClient / Window)
// ===========================================================================

/**
 * A window managed by KWin.
 *
 * In KWin 6 scripting, the active window is accessed via
 * `workspace.activeWindow`. Properties use the KWin 6 spellings
 * (`resizable`, `movable` — not the KWin 5 `resizeable`, `moveable`).
 */
interface Window {
  /** Window frame geometry (position + size). Readable and writable. */
  frameGeometry: QRect;

  /** Whether the window can be resized by the user */
  readonly resizable: boolean;

  /** Whether the window can be moved by the user */
  readonly movable: boolean;

  /**
   * Maximize or unmaximize the window.
   * @param vertical - maximize vertically
   * @param horizontal - maximize horizontally
   */
  setMaximize(vertical: boolean, horizontal: boolean): void;

  /** Window caption/title */
  readonly caption: string;

  /** Whether the window is currently fullscreen */
  readonly fullScreen: boolean;

  /** Whether the window can be made fullscreen */
  readonly fullScreenable: boolean;

  /** Whether the window is a desktop (wallpaper) window */
  readonly desktopWindow: boolean;

  /** Whether the window is minimized */
  readonly minimized: boolean;

  /** Whether the window is currently active (focused) */
  readonly active: boolean;

  /** Internal window ID */
  readonly internalId: string;

  /** Window resource class (WM_CLASS) */
  readonly resourceClass: string;

  /** Window resource name */
  readonly resourceName: string;

  /** Whether the window is on all desktops */
  readonly onAllDesktops: boolean;

  /** Desktop numbers this window is on */
  readonly desktops: number[];

  /** Whether the window is kept above other windows */
  readonly keepAbove: boolean;

  /** Whether the window is kept below other windows */
  readonly keepBelow: boolean;

  /** Whether the window can be closed */
  readonly closeable: boolean;

  /** Whether the window can be minimized */
  readonly minimizable: boolean;

  /** Whether the window can be maximized */
  readonly maximizable: boolean;

  /** Whether the window is shaded (rolled up) */
  readonly shade: boolean;

  /** Whether the window can be shaded */
  readonly shadeable: boolean;

  /** Whether the window is a modal dialog */
  readonly modal: boolean;

  /** Whether this window sets its own transparency */
  readonly decorationHasAlpha: boolean;

  /** Whether the window has no server-side border */
  readonly noBorder: boolean;

  /** Whether the window should be hidden from the taskbar */
  readonly skipTaskbar: boolean;

  /** Whether the window should be hidden from the pager */
  readonly skipPager: boolean;

  /** Whether the window should be hidden from the window switcher */
  readonly skipSwitcher: boolean;

  /** Whether the window demands attention (flashes in taskbar) */
  readonly demandsAttention: boolean;

  /** The screen this window is on */
  readonly output: Screen;

  /** Window X position (shortcut for frameGeometry.x) */
  readonly x: number;

  /** Window Y position (shortcut for frameGeometry.y) */
  readonly y: number;

  /** Window width (shortcut for frameGeometry.width) */
  readonly width: number;

  /** Window height (shortcut for frameGeometry.height) */
  readonly height: number;

  /** Window opacity (0.0 to 1.0) */
  opacity: number;

  /** PID of the owning process */
  readonly pid: number;

  /** Stacking order (z-order) */
  readonly stackingOrder: number;

  /** Close the window */
  closeWindow(): void;

  /** Show window (if hidden) */
  setHidden(hidden: boolean): void;
}

// ===========================================================================
// Workspace (global `workspace` object)
// ===========================================================================

/**
 * The global workspace object injected by KWin.
 * Provides access to screens, windows, desktops, and geometry.
 */
interface Workspace {
  /** The currently active (focused) window, or null if none */
  readonly activeWindow: Window | null;

  /** The screen containing the active window */
  readonly activeScreen: Screen;

  /** All connected screens */
  readonly screens: Screen[];

  /** The current desktop number (0-indexed in KWin 6) */
  readonly currentDesktop: number;

  /** Total number of virtual desktops */
  readonly desktopCount: number;

  /** List of all managed windows in stacking order */
  readonly stackingOrder: Window[];

  /** Number of screens */
  readonly numScreens: number;

  /** Cursor position in global coordinates */
  readonly cursorPos: { x: number; y: number };

  /**
   * Get the client area for a given option, screen, and desktop.
   *
   * @param option - which area to return (e.g. KWin.PlacementArea)
   * @param screen - the screen to query
   * @param desktop - the virtual desktop number
   * @returns the client area rectangle in screen-relative coordinates
   */
  clientArea(
    option: ClientAreaOption,
    screen: Screen,
    desktop: number,
  ): QRect;

  /**
   * Get the client area for a given option and window.
   *
   * @param option - which area to return
   * @param window - the window to query area for
   * @returns the client area rectangle
   */
  clientArea(option: ClientAreaOption, window: Window): QRect;

  /**
   * Send a window to a specific screen.
   */
  sendClientToScreen(window: Window, screen: Screen): void;

  /**
   * Get a window by its internal ID.
   */
  getClient(id: number): Window | null;

  /**
   * Find the window at a given point.
   */
  windowAt(point: { x: number; y: number }): Window[];

  /**
   * Determine which screen contains a point.
   */
  screenAt(point: { x: number; y: number }): Screen;

  /**
   * Access the tiling manager for a screen (Plasma 6.6+).
   */
  tilingForScreen(screen: Screen): TileManager | null;
}

/**
 * Tiling manager interface (Plasma 6.6+).
 * Used to interact with KWin's built-in window tiling system.
 */
interface TileManager {
  readonly model: TileModel;
}

/**
 * Tiling model (Plasma 6.6+).
 */
interface TileModel {
  readonly rootIndex: number;
}

// ===========================================================================
// Global function declarations
// ===========================================================================

/**
 * Print a debug message to KWin's scripting log.
 * View with: journalctl -f QT_CATEGORY=js QT_CATEGORY=kwin_scripting
 */
declare function print(...args: unknown[]): void;

/**
 * Read a configuration value for this script.
 * Configuration values are stored in kwinrc under [Script-yanjing].
 *
 * @param key - the config key to read
 * @param defaultValue - value to return if key is not set (also determines return type)
 * @returns the config value, or defaultValue if not found
 */
declare function readConfig(key: string, defaultValue: string): string;
declare function readConfig(key: string, defaultValue: number): number;
declare function readConfig(key: string, defaultValue: boolean): boolean;
declare function readConfig(key: string, defaultValue: unknown): unknown;

/**
 * Register a global keyboard shortcut for this script.
 *
 * @param name - unique identifier for the shortcut (used for config)
 * @param description - human-readable description shown in System Settings
 * @param defaultKey - default key binding (e.g. "Meta+Num+7"), or "" for none
 * @param callback - function to call when the shortcut is triggered
 */
declare function registerShortcut(
  name: string,
  description: string,
  defaultKey: string,
  callback: () => void,
): void;

// ===========================================================================
// Ambient workspace global
// ===========================================================================

/** The global KWin workspace object — injected by KWin at script load time. */
declare const workspace: Workspace;
