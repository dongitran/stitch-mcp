import fs from 'node:fs';

export interface EnvironmentInfo {
  isWSL: boolean;
  isSSH: boolean;
  isDocker: boolean;
  isCloudShell: boolean;
  hasDisplay: boolean;
  needsNoBrowser: boolean;
  reason?: string;
}

/**
 * Detect if running in WSL (Windows Subsystem for Linux)
 */
function detectWSL(): boolean {
  try {
    const procVersion = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    return procVersion.includes('microsoft') || procVersion.includes('wsl');
  } catch {
    return false;
  }
}

/**
 * Detect if running in an SSH session
 */
function detectSSH(): boolean {
  return Boolean(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION);
}

/**
 * Detect if running inside Docker
 */
function detectDocker(): boolean {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

/**
 * Detect if running in Google Cloud Shell
 */
function detectCloudShell(): boolean {
  return Boolean(process.env.CLOUD_SHELL);
}

/**
 * Detect if a display is available (X11/Wayland)
 */
function detectDisplay(): boolean {
  return Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

/**
 * Detect environment characteristics that affect browser auth
 */
export function detectEnvironment(): EnvironmentInfo {
  const isWSL = detectWSL();
  const isSSH = detectSSH();
  const isDocker = detectDocker();
  const isCloudShell = detectCloudShell();
  const hasDisplay = detectDisplay();

  // Determine if --no-browser is needed
  let needsNoBrowser = false;
  let reason: string | undefined;

  if (isWSL) {
    needsNoBrowser = true;
    reason = 'WSL detected - browser redirect to localhost may not work';
  } else if (isSSH && !hasDisplay) {
    needsNoBrowser = true;
    reason = 'SSH session without display forwarding';
  } else if (isDocker) {
    needsNoBrowser = true;
    reason = 'Docker container detected';
  } else if (isCloudShell) {
    needsNoBrowser = true;
    reason = 'Cloud Shell detected';
  } else if (!hasDisplay) {
    needsNoBrowser = true;
    reason = 'No display detected (headless environment)';
  }

  return {
    isWSL,
    isSSH,
    isDocker,
    isCloudShell,
    hasDisplay,
    needsNoBrowser,
    reason,
  };
}
