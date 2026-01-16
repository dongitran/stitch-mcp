import { z } from 'zod';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const StartProxyInputSchema = z.object({
  transport: z.enum(['stdio', 'sse']).default('stdio'),
  port: z.number().optional().describe('Port for SSE transport only'),
  debug: z.boolean().optional().describe('Enable debug logging to file'),
});
export type StartProxyInput = z.infer<typeof StartProxyInputSchema>;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ProxyErrorCode = z.enum([
  'START_FAILED',
  'TRANSPORT_ERROR',
  'AUTH_REFRESH_FAILED',
  'UNKNOWN_ERROR',
]);
export type ProxyErrorCodeType = z.infer<typeof ProxyErrorCode>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export const ProxySuccess = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.enum(['running', 'stopped']),
  }),
});

export const ProxyFailure = z.object({
  success: z.literal(false),
  error: z.object({
    code: ProxyErrorCode,
    message: z.string(),
    suggestion: z.string().optional(),
    recoverable: z.boolean(),
  }),
});

export type ProxyResult = z.infer<typeof ProxySuccess> | z.infer<typeof ProxyFailure>;

// ============================================================================
// INTERFACE
// ============================================================================

export interface ProxyService {
  /**
   * Start the MCP proxy server
   *
   * @remarks
   * This is a long-running operation. The promise settles only when the server stops
   * or if initial startup fails.
   */
  start(input: StartProxyInput): Promise<ProxyResult>;
}
