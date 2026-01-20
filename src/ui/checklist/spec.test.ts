import { describe, test, expect } from 'bun:test';
import {
  ChecklistConfigSchema,
  UpdateItemInputSchema,
  ChecklistItemState
} from './spec';

describe('ChecklistConfigSchema', () => {
  test('requires at least one item', () => {
    const result = ChecklistConfigSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  test('provides defaults for optional fields', () => {
    const result = ChecklistConfigSchema.safeParse({
      items: [{ id: 'step-1', label: 'First step' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Setup Checklist');
      expect(result.data.showProgress).toBe(true);
      expect(result.data.animationDelayMs).toBe(100);
    }
  });

  test('accepts nested children', () => {
    const result = ChecklistConfigSchema.safeParse({
      items: [{
        id: 'auth',
        label: 'Authentication',
        children: [
          { id: 'auth-login', label: 'Login' },
          { id: 'auth-adc', label: 'ADC' },
        ],
      }],
    });
    expect(result.success).toBe(true);
  });

  test('accepts custom title', () => {
    const result = ChecklistConfigSchema.safeParse({
      title: 'Stitch MCP Setup',
      items: [{ id: 'step-1', label: 'First step' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Stitch MCP Setup');
    }
  });
});

describe('UpdateItemInputSchema', () => {
  test('validates state enum values', () => {
    const validStates = ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'SKIPPED', 'FAILED'];

    validStates.forEach(state => {
      const result = UpdateItemInputSchema.safeParse({
        itemId: 'test',
        state,
      });
      expect(result.success).toBe(true);
    });
  });

  test('rejects invalid state', () => {
    const result = UpdateItemInputSchema.safeParse({
      itemId: 'test',
      state: 'INVALID_STATE',
    });
    expect(result.success).toBe(false);
  });

  test('accepts optional detail and reason', () => {
    const result = UpdateItemInputSchema.safeParse({
      itemId: 'test',
      state: 'COMPLETE',
      detail: 'deast@google.com',
      reason: 'Already logged in',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.detail).toBe('deast@google.com');
      expect(result.data.reason).toBe('Already logged in');
    }
  });
});

describe('ChecklistItemState', () => {
  test('includes all expected states', () => {
    const states = ChecklistItemState.options;
    expect(states).toContain('PENDING');
    expect(states).toContain('IN_PROGRESS');
    expect(states).toContain('COMPLETE');
    expect(states).toContain('SKIPPED');
    expect(states).toContain('FAILED');
  });

  test('has exactly 5 states', () => {
    expect(ChecklistItemState.options.length).toBe(5);
  });
});
