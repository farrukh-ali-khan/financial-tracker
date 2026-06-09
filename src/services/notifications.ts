import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { logger } from "./logger";

const CTX = "notifications";

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (window as any).__TAURI_INTERNALS__ !== "undefined"
  );
}

let permissionGranted = false;

// Track which goals have already been notified this session so we don't spam.
// Key = `${goalId}:${Math.floor(progressPercent/25)}` — fires at 25%, 50%, 75%, 100%.
const _notifiedKeys = new Set<string>();

export async function initNotifications(): Promise<void> {
  if (!isTauri()) return;
  try {
    permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }
    logger.info(CTX, "Notification permission", { granted: permissionGranted });
  } catch (err) {
    logger.warn(CTX, "Notifications not available on this platform", err);
    permissionGranted = false;
  }
}

export function notify(title: string, body: string): void {
  if (!isTauri() || !permissionGranted) return;
  try {
    sendNotification({ title, body });
    logger.info(CTX, "Notification sent", { title });
  } catch (err) {
    logger.warn(CTX, "Failed to send notification", err);
  }
}

/**
 * Notify about goal progress — fires only ONCE per milestone per session.
 * Milestones: 25%, 50%, 75%, 100%, and "behind" (only once per session).
 */
export function notifyGoalProgress(
  goalId: number,
  goalName: string,
  progressPercent: number,
  isOnTrack: boolean
): void {
  if (!isTauri() || !permissionGranted) return;

  // Completed milestone — fire once
  if (progressPercent >= 100) {
    const key = `${goalId}:complete`;
    if (!_notifiedKeys.has(key)) {
      _notifiedKeys.add(key);
      notify("🎉 Goal Completed!", `Congratulations! You reached your "${goalName}" goal!`);
    }
    return;
  }

  // Progress milestones: 75%, 50%, 25%
  const milestones = [75, 50, 25];
  for (const milestone of milestones) {
    if (progressPercent >= milestone) {
      const key = `${goalId}:${milestone}`;
      if (!_notifiedKeys.has(key)) {
        _notifiedKeys.add(key);
        notify(
          `💪 ${goalName} — ${milestone}% reached!`,
          `Keep saving! You're ${(100 - progressPercent).toFixed(0)}% away from your goal.`
        );
      }
      break;
    }
  }

  // Behind target — fire only once per session
  if (!isOnTrack) {
    const key = `${goalId}:behind`;
    if (!_notifiedKeys.has(key)) {
      _notifiedKeys.add(key);
      notify(
        `⚠️ Goal Behind: ${goalName}`,
        `You're behind your monthly savings target. Check the Goals page.`
      );
    }
  }
}
