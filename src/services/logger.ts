import {
  trace,
  debug,
  info,
  warn,
  error,
  attachConsole,
} from "@tauri-apps/plugin-log";

// Detect whether we are running inside a real Tauri window.
// When `cargo tauri dev` runs, window.__TAURI_INTERNALS__ is injected by Tauri.
// When the Vite dev server is opened in a plain browser, it is undefined.
function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (window as any).__TAURI_INTERNALS__ !== "undefined"
  );
}

let consoleAttached = false;

/**
 * Initialize logger. In Tauri: attaches plugin-log so logs go to the log
 * file and to stdout. Outside Tauri: silently uses console only.
 */
export async function initLogger(): Promise<void> {
  if (!isTauri()) {
    console.info("[Logger] Not in Tauri — using console only.");
    return;
  }
  try {
    if (!consoleAttached) {
      await attachConsole();
      consoleAttached = true;
    }
    await info("[Logger] Logger initialized — console attached");
  } catch (err) {
    console.warn("[Logger] Could not attach Tauri logger:", err);
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function fmt(level: string, ctx: string, msg: string): string {
  return `[${timestamp()}] [${level.toUpperCase()}] [${ctx}] ${msg}`;
}

// Safe wrappers: call Tauri log plugin when inside Tauri, fall back to
// console everywhere else. Never throws.

async function tauriLog(
  fn: (msg: string) => Promise<void>,
  consoleFn: (...args: unknown[]) => void,
  line: string,
  data?: unknown
): Promise<void> {
  const full = data !== undefined ? `${line} | ${JSON.stringify(data)}` : line;
  if (isTauri()) {
    try {
      await fn(full);
    } catch {
      consoleFn(full);
    }
  } else {
    consoleFn(full);
  }
}

export const logger = {
  trace: (ctx: string, msg: string, data?: unknown) => {
    tauriLog(trace, console.trace.bind(console), fmt("trace", ctx, msg), data);
  },
  debug: (ctx: string, msg: string, data?: unknown) => {
    tauriLog(debug, console.debug.bind(console), fmt("debug", ctx, msg), data);
  },
  info: (ctx: string, msg: string, data?: unknown) => {
    tauriLog(info, console.info.bind(console), fmt("info", ctx, msg), data);
  },
  warn: (ctx: string, msg: string, data?: unknown) => {
    tauriLog(warn, console.warn.bind(console), fmt("warn", ctx, msg), data);
  },
  error: (ctx: string, msg: string, err?: unknown) => {
    const errStr =
      err instanceof Error
        ? `${err.message}\n${err.stack ?? ""}`
        : JSON.stringify(err);
    const line = fmt("error", ctx, `${msg} | ${errStr}`);
    tauriLog(error, console.error.bind(console), line);
  },
};
