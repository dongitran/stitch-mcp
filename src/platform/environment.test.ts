import { describe, test, expect, mock, afterEach } from 'bun:test';
import { detectEnvironment } from './environment';

describe('detectEnvironment', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  test('should return an EnvironmentInfo object', () => {
    const env = detectEnvironment();

    // Just verify the structure since actual values depend on runtime environment
    expect(typeof env.isWSL).toBe('boolean');
    expect(typeof env.isSSH).toBe('boolean');
    expect(typeof env.isDocker).toBe('boolean');
    expect(typeof env.isCloudShell).toBe('boolean');
    expect(typeof env.hasDisplay).toBe('boolean');
    expect(typeof env.needsNoBrowser).toBe('boolean');
  });

  test('should detect SSH session from SSH_CLIENT env var', () => {
    process.env.SSH_CLIENT = '192.168.1.1 12345 22';

    const env = detectEnvironment();

    expect(env.isSSH).toBe(true);
  });

  test('should detect SSH session from SSH_TTY env var', () => {
    delete process.env.SSH_CLIENT;
    process.env.SSH_TTY = '/dev/pts/0';

    const env = detectEnvironment();

    expect(env.isSSH).toBe(true);
  });

  test('should detect Cloud Shell from CLOUD_SHELL env var', () => {
    process.env.CLOUD_SHELL = 'true';

    const env = detectEnvironment();

    expect(env.isCloudShell).toBe(true);
    expect(env.needsNoBrowser).toBe(true);
  });

  test('should detect display from DISPLAY env var', () => {
    process.env.DISPLAY = ':0';

    const env = detectEnvironment();

    expect(env.hasDisplay).toBe(true);
  });

  test('should detect display from WAYLAND_DISPLAY env var', () => {
    delete process.env.DISPLAY;
    process.env.WAYLAND_DISPLAY = 'wayland-0';

    const env = detectEnvironment();

    expect(env.hasDisplay).toBe(true);
  });

  test('should set needsNoBrowser when Cloud Shell detected', () => {
    process.env.CLOUD_SHELL = 'true';

    const env = detectEnvironment();

    expect(env.needsNoBrowser).toBe(true);
    // Note: If running in WSL, WSL detection takes priority for the reason string
    if (!env.isWSL) {
      expect(env.reason).toContain('Cloud Shell');
    }
  });

  test('should set needsNoBrowser for SSH without display', () => {
    process.env.SSH_CLIENT = '192.168.1.1 12345 22';
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;

    const env = detectEnvironment();

    // Note: If running in WSL, WSL detection takes priority
    if (!env.isWSL) {
      expect(env.needsNoBrowser).toBe(true);
    }
  });
});
