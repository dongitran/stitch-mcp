import { describe, test, expect, mock } from 'bun:test';
import { verifyAllSteps, type ChecklistStep, type VerifyResult } from './checklist';

// Mock execCommand
mock.module('../platform/shell.js', () => ({
  execCommand: mock(async (cmd: string[]) => {
    // Simulate gcloud auth list returning an account
    if (cmd.includes('auth') && cmd.includes('list')) {
      return { success: true, stdout: 'test@example.com\n', stderr: '' };
    }
    return { success: false, stdout: '', stderr: 'Command not found' };
  }),
}));

describe('Checklist', () => {
  describe('verifyAllSteps', () => {
    test('should return success for step with passing verifyFn', async () => {
      const steps: ChecklistStep[] = [
        {
          id: 'test-step',
          title: 'Test Step',
          command: 'test command',
          verifyFn: async () => ({ success: true, message: 'Verified!' }),
        },
      ];

      const results = await verifyAllSteps(steps);

      expect(results.has('test-step')).toBe(true);
      expect(results.get('test-step')?.success).toBe(true);
      expect(results.get('test-step')?.message).toBe('Verified!');
    });

    test('should return failure for step with failing verifyFn', async () => {
      const steps: ChecklistStep[] = [
        {
          id: 'failing-step',
          title: 'Failing Step',
          command: 'test command',
          verifyFn: async () => ({ success: false, message: 'Not configured' }),
        },
      ];

      const results = await verifyAllSteps(steps);

      expect(results.has('failing-step')).toBe(true);
      expect(results.get('failing-step')?.success).toBe(false);
    });

    test('should not include steps without verification', async () => {
      const steps: ChecklistStep[] = [
        {
          id: 'no-verify-step',
          title: 'No Verify Step',
          command: 'test command',
          // No verifyFn or verifyCommand
        },
      ];

      const results = await verifyAllSteps(steps);

      expect(results.has('no-verify-step')).toBe(false);
    });

    test('should verify multiple steps', async () => {
      const steps: ChecklistStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          command: 'cmd1',
          verifyFn: async () => ({ success: true, message: 'Done' }),
        },
        {
          id: 'step2',
          title: 'Step 2',
          command: 'cmd2',
          verifyFn: async () => ({ success: false, message: 'Failed' }),
        },
      ];

      const results = await verifyAllSteps(steps);

      expect(results.size).toBe(2);
      expect(results.get('step1')?.success).toBe(true);
      expect(results.get('step2')?.success).toBe(false);
    });
  });
});
