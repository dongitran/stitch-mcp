import { describe, test, expect, beforeEach } from 'bun:test';
import { ChecklistUIHandler } from './handler';

describe('ChecklistUIHandler', () => {
  let handler: ChecklistUIHandler;

  beforeEach(() => {
    handler = new ChecklistUIHandler();
    handler.initialize({
      title: 'Test Checklist',
      items: [
        { id: 'step-1', label: 'First step' },
        { id: 'step-2', label: 'Second step' },
        { id: 'step-3', label: 'Third step' },
      ],
      showProgress: true,
      animationDelayMs: 0,
    });
  });

  describe('updateItem', () => {
    test('returns ITEM_NOT_FOUND for unknown id', () => {
      const result = handler.updateItem({
        itemId: 'unknown',
        state: 'COMPLETE',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ITEM_NOT_FOUND');
      }
    });

    test('tracks state transitions', () => {
      const result = handler.updateItem({
        itemId: 'step-1',
        state: 'COMPLETE',
        detail: 'Done!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.previousState).toBe('PENDING');
        expect(result.data.newState).toBe('COMPLETE');
      }
    });

    test('stores detail and reason', () => {
      handler.updateItem({
        itemId: 'step-1',
        state: 'SKIPPED',
        detail: 'Already configured',
        reason: 'Set via --client flag',
      });

      const renderResult = handler.render();
      expect(renderResult.success).toBe(true);
      if (renderResult.success) {
        expect(renderResult.data.output).toContain('Already configured');
        expect(renderResult.data.output).toContain('--client flag');
      }
    });

    test('updates existing item state', () => {
      handler.updateItem({ itemId: 'step-1', state: 'IN_PROGRESS' });
      const result = handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.previousState).toBe('IN_PROGRESS');
        expect(result.data.newState).toBe('COMPLETE');
      }
    });
  });

  describe('getProgress', () => {
    test('starts at 0%', () => {
      const progress = handler.getProgress();
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(3);
      expect(progress.percent).toBe(0);
    });

    test('counts COMPLETE items', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });

      const progress = handler.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.percent).toBe(33);
    });

    test('counts SKIPPED items as complete', () => {
      handler.updateItem({ itemId: 'step-1', state: 'SKIPPED' });
      handler.updateItem({ itemId: 'step-2', state: 'COMPLETE' });

      const progress = handler.getProgress();
      expect(progress.completed).toBe(2);
      expect(progress.percent).toBe(67);
    });

    test('does not count IN_PROGRESS as complete', () => {
      handler.updateItem({ itemId: 'step-1', state: 'IN_PROGRESS' });

      const progress = handler.getProgress();
      expect(progress.completed).toBe(0);
      expect(progress.percent).toBe(0);
    });

    test('does not count FAILED as complete', () => {
      handler.updateItem({ itemId: 'step-1', state: 'FAILED' });

      const progress = handler.getProgress();
      expect(progress.completed).toBe(0);
    });

    test('reaches 100% when all items complete', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });
      handler.updateItem({ itemId: 'step-2', state: 'COMPLETE' });
      handler.updateItem({ itemId: 'step-3', state: 'COMPLETE' });

      const progress = handler.getProgress();
      expect(progress.percent).toBe(100);
    });
  });

  describe('isComplete', () => {
    test('returns false when items are pending', () => {
      expect(handler.isComplete()).toBe(false);
    });

    test('returns false when any item is in progress', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });
      handler.updateItem({ itemId: 'step-2', state: 'IN_PROGRESS' });
      handler.updateItem({ itemId: 'step-3', state: 'COMPLETE' });

      expect(handler.isComplete()).toBe(false);
    });

    test('returns true when all items are complete or skipped', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });
      handler.updateItem({ itemId: 'step-2', state: 'SKIPPED' });
      handler.updateItem({ itemId: 'step-3', state: 'COMPLETE' });

      expect(handler.isComplete()).toBe(true);
    });

    test('returns true when all items failed (edge case)', () => {
      handler.updateItem({ itemId: 'step-1', state: 'FAILED' });
      handler.updateItem({ itemId: 'step-2', state: 'FAILED' });
      handler.updateItem({ itemId: 'step-3', state: 'FAILED' });

      // FAILED is a terminal state, not pending or in-progress
      expect(handler.isComplete()).toBe(true);
    });
  });

  describe('render', () => {
    test('includes title', () => {
      const result = handler.render();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toContain('Test Checklist');
      }
    });

    test('includes numbered items', () => {
      const result = handler.render();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toContain('1. First step');
        expect(result.data.output).toContain('2. Second step');
        expect(result.data.output).toContain('3. Third step');
      }
    });

    test('shows progress bar when enabled', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });

      const result = handler.render();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toContain('33%');
      }
    });

    test('includes state icons', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });
      handler.updateItem({ itemId: 'step-2', state: 'IN_PROGRESS' });

      const result = handler.render();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toContain('✓');
        expect(result.data.output).toContain('▸');
        expect(result.data.output).toContain('○');
      }
    });

    test('returns correct counts', () => {
      handler.updateItem({ itemId: 'step-1', state: 'COMPLETE' });
      handler.updateItem({ itemId: 'step-2', state: 'SKIPPED' });

      const result = handler.render();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completedCount).toBe(2);
        expect(result.data.totalCount).toBe(3);
        expect(result.data.percentComplete).toBe(67);
      }
    });
  });
});

describe('Auto-skip scenarios', () => {
  test('handles rapid auto-completion for --yes flag', () => {
    const handler = new ChecklistUIHandler();
    handler.initialize({
      title: 'Auto Mode',
      items: [
        { id: 's1', label: 'MCP client' },
        { id: 's2', label: 'gcloud CLI' },
        { id: 's3', label: 'Authentication' },
      ],
      showProgress: true,
      animationDelayMs: 0,
    });

    // Simulate auto-skip
    handler.updateItem({
      itemId: 's1',
      state: 'SKIPPED',
      detail: 'Antigravity',
      reason: 'Set via --client flag'
    });
    handler.updateItem({
      itemId: 's2',
      state: 'SKIPPED',
      detail: 'v552.0.0',
      reason: 'Already installed'
    });
    handler.updateItem({
      itemId: 's3',
      state: 'COMPLETE',
      detail: 'deast@google.com'
    });

    expect(handler.isComplete()).toBe(true);
    expect(handler.getProgress().percent).toBe(100);
  });

  test('renders flags and reasons in output', () => {
    const handler = new ChecklistUIHandler();
    handler.initialize({
      title: 'Flag Mode',
      items: [{ id: 's1', label: 'MCP client' }],
      showProgress: false,
      animationDelayMs: 0,
    });

    handler.updateItem({
      itemId: 's1',
      state: 'SKIPPED',
      detail: 'Antigravity',
      reason: 'Set via --client flag',
    });

    const result = handler.render();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.output).toContain('Antigravity');
      expect(result.data.output).toContain('--client flag');
      expect(result.data.output).toContain('└─');
    }
  });
});

describe('Nested children', () => {
  test('initializes all nested items as PENDING', () => {
    const handler = new ChecklistUIHandler();
    handler.initialize({
      title: 'Nested',
      items: [{
        id: 'parent',
        label: 'Parent',
        children: [
          { id: 'child-1', label: 'Child 1' },
          { id: 'child-2', label: 'Child 2' },
        ],
      }],
      showProgress: true,
      animationDelayMs: 0,
    });

    // All 3 items should be in the state map
    expect(handler.getProgress().total).toBe(3);
    expect(handler.getProgress().completed).toBe(0);
  });

  test('can update nested child items', () => {
    const handler = new ChecklistUIHandler();
    handler.initialize({
      title: 'Nested',
      items: [{
        id: 'parent',
        label: 'Parent',
        children: [
          { id: 'child-1', label: 'Child 1' },
        ],
      }],
      showProgress: true,
      animationDelayMs: 0,
    });

    const result = handler.updateItem({ itemId: 'child-1', state: 'COMPLETE' });
    expect(result.success).toBe(true);
    expect(handler.getProgress().completed).toBe(1);
  });
});
