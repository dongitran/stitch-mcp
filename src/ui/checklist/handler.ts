import type {
  ChecklistUI,
  ChecklistConfig,
  ChecklistItem,
  UpdateItemInput,
  UpdateResult,
  RenderResult,
  ChecklistItemStateType
} from './spec.js';
import { theme } from '../theme.js';

// State icons
const STATE_ICONS: Record<ChecklistItemStateType, string> = {
  PENDING: '○',
  IN_PROGRESS: '▸',
  COMPLETE: '✓',
  SKIPPED: '−',
  FAILED: '✗',
};

interface ItemState {
  state: ChecklistItemStateType;
  detail?: string;
  reason?: string;
}

export class ChecklistUIHandler implements ChecklistUI {
  private config!: ChecklistConfig;
  private states: Map<string, ItemState> = new Map();
  private lastOutputLines = 0;

  initialize(config: ChecklistConfig): void {
    this.config = config;
    this.states.clear();

    // Initialize all items as PENDING
    const initItem = (item: ChecklistItem) => {
      this.states.set(item.id, { state: 'PENDING' });
      item.children?.forEach(initItem);
    };
    config.items.forEach(initItem);
  }

  updateItem(input: UpdateItemInput): UpdateResult {
    const current = this.states.get(input.itemId);

    if (!current) {
      return {
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: `Item "${input.itemId}" not found`,
          recoverable: false,
        },
      };
    }

    const previousState = current.state;
    this.states.set(input.itemId, {
      state: input.state,
      detail: input.detail,
      reason: input.reason,
    });

    return {
      success: true,
      data: {
        itemId: input.itemId,
        previousState,
        newState: input.state,
      },
    };
  }

  render(): RenderResult {
    try {
      const lines: string[] = [];
      const { completed, total, percent } = this.getProgress();

      // Header
      lines.push(`🧵 ${this.config.title}`);
      lines.push('');

      // Items
      this.config.items.forEach((item, idx) => {
        const state = this.states.get(item.id)!;
        const icon = STATE_ICONS[state.state];
        const color = this.getStateColor(state.state);

        let line = `  ${color(icon)}  ${idx + 1}. ${item.label}`;
        if (state.detail) {
          line += ` ${theme.gray('·')} ${state.detail}`;
        }
        lines.push(line);

        if (state.reason) {
          lines.push(`     └─ ${theme.gray(state.reason)}`);
        }
      });

      // Progress bar
      if (this.config.showProgress) {
        lines.push('');
        const barWidth = 40;
        const filled = Math.round((percent / 100) * barWidth);
        const bar = '━'.repeat(filled) + '─'.repeat(barWidth - filled);
        lines.push(`  ${bar} ${percent}%`);
      }

      return {
        success: true,
        data: {
          output: lines.join('\n'),
          completedCount: completed,
          totalCount: total,
          percentComplete: percent,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RENDER_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: false,
        },
      };
    }
  }

  print(options?: { clearPrevious?: boolean }): void {
    if (options?.clearPrevious && this.lastOutputLines > 0) {
      // Move cursor up and clear lines
      process.stdout.write(`\x1b[${this.lastOutputLines}A\x1b[0J`);
    }

    const result = this.render();
    if (result.success) {
      console.log(result.data.output);
      this.lastOutputLines = result.data.output.split('\n').length;
    }
  }

  getProgress(): { completed: number; total: number; percent: number } {
    const total = this.states.size;
    let completed = 0;

    this.states.forEach(state => {
      if (state.state === 'COMPLETE' || state.state === 'SKIPPED') {
        completed++;
      }
    });

    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }

  isComplete(): boolean {
    for (const state of this.states.values()) {
      if (state.state === 'PENDING' || state.state === 'IN_PROGRESS') {
        return false;
      }
    }
    return true;
  }

  private getStateColor(state: ChecklistItemStateType) {
    switch (state) {
      case 'COMPLETE': return theme.green;
      case 'SKIPPED': return theme.gray;
      case 'FAILED': return theme.red;
      case 'IN_PROGRESS': return theme.yellow;
      default: return theme.gray;
    }
  }
}

/**
 * Create a new ChecklistUI instance
 */
export function createChecklistUI(): ChecklistUI {
  return new ChecklistUIHandler();
}
