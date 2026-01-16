import { ProxyHandler } from '../../services/proxy/handler.js';
import type { StartProxyInput, ProxyResult } from '../../services/proxy/spec.js';

export class ProxyCommandHandler {
  async execute(input: StartProxyInput): Promise<ProxyResult> {
    const handler = new ProxyHandler();
    return handler.start(input);
  }
}
