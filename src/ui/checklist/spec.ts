import { z } from 'zod';

// ============================================================================
// CHECKLIST ITEM STATES
// ============================================================================

export const ChecklistItemState = z.enum([
  'PENDING',      // ○ Not started
  'IN_PROGRESS',  // ▸ Currently working
  'COMPLETE',     // ✓ Done
  'SKIPPED',      // − Pre-verified / skipped
  'FAILED',       // ✗ Error
]);

export type ChecklistItemStateType = z.infer<typeof ChecklistItemState>;

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const ChecklistItemSchema: z.ZodType<ChecklistItem> = z.object({
  id: z.string(),
  label: z.string(),
  children: z.lazy(() => z.array(ChecklistItemSchema)).optional(),
});
export type ChecklistItem = {
  id: string;
  label: string;
  children?: ChecklistItem[];
};

export const ChecklistConfigSchema = z.object({
  title: z.string().default('Setup Checklist'),
  items: z.array(ChecklistItemSchema).min(1),
  showProgress: z.boolean().default(true),
  animationDelayMs: z.number().default(100),
});
export type ChecklistConfig = z.infer<typeof ChecklistConfigSchema>;

export const UpdateItemInputSchema = z.object({
  itemId: z.string(),
  state: ChecklistItemState,
  detail: z.string().optional(),  // e.g., "deast@google.com"
  reason: z.string().optional(),  // e.g., "Set via --client flag"
});
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ChecklistErrorCode = z.enum([
  'ITEM_NOT_FOUND',
  'INVALID_STATE_TRANSITION',
  'RENDER_FAILED',
  'UNKNOWN_ERROR',
]);

// ============================================================================
// RESULT TYPES
// ============================================================================

export const RenderSuccess = z.object({
  success: z.literal(true),
  data: z.object({
    output: z.string(),
    completedCount: z.number(),
    totalCount: z.number(),
    percentComplete: z.number(),
  }),
});

export const RenderFailure = z.object({
  success: z.literal(false),
  error: z.object({
    code: ChecklistErrorCode,
    message: z.string(),
    recoverable: z.boolean(),
  }),
});

export type RenderResult = z.infer<typeof RenderSuccess> | z.infer<typeof RenderFailure>;

export const UpdateSuccess = z.object({
  success: z.literal(true),
  data: z.object({
    itemId: z.string(),
    previousState: ChecklistItemState,
    newState: ChecklistItemState,
  }),
});

export const UpdateFailure = z.object({
  success: z.literal(false),
  error: z.object({
    code: ChecklistErrorCode,
    message: z.string(),
    recoverable: z.boolean(),
  }),
});

export type UpdateResult = z.infer<typeof UpdateSuccess> | z.infer<typeof UpdateFailure>;

// ============================================================================
// INTERFACE
// ============================================================================

export interface ChecklistUI {
  /** Initialize the checklist with items */
  initialize(config: ChecklistConfig): void;

  /** Update an item's state */
  updateItem(input: UpdateItemInput): UpdateResult;

  /** Render the current checklist state to a string */
  render(): RenderResult;

  /** Print the checklist to stdout (with optional in-place update) */
  print(options?: { clearPrevious?: boolean }): void;

  /** Get current progress as percentage */
  getProgress(): { completed: number; total: number; percent: number };

  /** Check if all items are complete or skipped */
  isComplete(): boolean;
}
