import { invokeDesktop, isDesktop } from './desktop';
import type { AiService } from './types';

export type AiConfig = AiService;

export async function saveApiKey(serviceId: string, apiKey: string): Promise<void> {
  if (!isDesktop()) throw new Error('AI Key 仅支持在桌面版中保存。');
  await invokeDesktop('save_api_key', { serviceId, apiKey });
}

export async function deleteApiKey(serviceId: string): Promise<void> {
  if (!isDesktop()) return;
  await invokeDesktop('delete_api_key', { serviceId });
}

export async function hasApiKey(serviceId: string): Promise<boolean> {
  if (!isDesktop()) return false;
  return invokeDesktop<boolean>('has_api_key', { serviceId });
}

export async function testAiConnection(service: AiService, apiKey?: string): Promise<string> {
  if (!isDesktop()) throw new Error('AI 服务测试仅支持在桌面版中运行。');
  return invokeDesktop<string>('test_ai_connection', { serviceId: service.id, baseUrl: service.baseUrl, model: service.model, apiKey: apiKey?.trim() || null });
}

export async function generateWithAi(config: AiConfig, prompt: string): Promise<string> {
  if (!isDesktop()) throw new Error('请在 LayoutGo 桌面版配置自己的 API Key 后使用 AI。');
  return invokeDesktop<string>('generate_content', { serviceId: config.id, baseUrl: config.baseUrl, model: config.model, prompt });
}
