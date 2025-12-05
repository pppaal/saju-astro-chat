// Log rotation utility to prevent disk full

import fs from 'fs';
import path from 'path';

interface LogRotationConfig {
  logDir: string;
  maxFiles?: number; // Max number of log files to keep
  maxAge?: number; // Max age in days
  maxSize?: number; // Max size in bytes (per file)
}

const DEFAULT_CONFIG: Required<Omit<LogRotationConfig, 'logDir'>> = {
  maxFiles: 10,
  maxAge: 7, // 7 days
  maxSize: 10 * 1024 * 1024, // 10 MB
};

/**
 * Rotate logs: delete old files based on count, age, and size
 */
export function rotateLogs(config: LogRotationConfig): void {
  const { logDir, maxFiles = DEFAULT_CONFIG.maxFiles, maxAge = DEFAULT_CONFIG.maxAge } = config;

  if (!fs.existsSync(logDir)) {
    console.log(`[LogRotation] Log directory doesn't exist: ${logDir}`);
    return;
  }

  try {
    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.json') || f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(logDir, f),
        stats: fs.statSync(path.join(logDir, f)),
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // Newest first

    let deleted = 0;
    const now = Date.now();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const age = now - file.stats.mtime.getTime();

      // Delete if:
      // 1. Beyond max count
      // 2. Too old
      const shouldDelete = i >= maxFiles || age > maxAgeMs;

      if (shouldDelete) {
        fs.unlinkSync(file.path);
        deleted++;
        console.log(`[LogRotation] Deleted: ${file.name} (age: ${Math.round(age / (24 * 60 * 60 * 1000))}days)`);
      }
    }

    if (deleted > 0) {
      console.log(`[LogRotation] ✅ Rotated ${deleted} log files from ${logDir}`);
    } else {
      console.log(`[LogRotation] No logs to rotate in ${logDir}`);
    }
  } catch (error) {
    console.error(`[LogRotation] ❌ Error rotating logs:`, error);
  }
}

/**
 * Check if log rotation is needed and perform it
 */
export function checkAndRotateLogs(logDir: string): void {
  try {
    if (!fs.existsSync(logDir)) {
      return;
    }

    const files = fs.readdirSync(logDir);
    const logFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.log'));

    // Rotate if more than 20 files
    if (logFiles.length > 20) {
      console.log(`[LogRotation] Found ${logFiles.length} logs, rotating...`);
      rotateLogs({ logDir, maxFiles: 10, maxAge: 7 });
    }
  } catch (error) {
    console.error(`[LogRotation] Error checking logs:`, error);
  }
}

/**
 * Schedule periodic log rotation
 */
export function scheduleLogRotation(logDir: string, intervalHours = 24): NodeJS.Timeout {
  console.log(`[LogRotation] Scheduling rotation every ${intervalHours} hours for ${logDir}`);

  // Run immediately
  checkAndRotateLogs(logDir);

  // Then schedule
  return setInterval(() => {
    checkAndRotateLogs(logDir);
  }, intervalHours * 60 * 60 * 1000);
}
