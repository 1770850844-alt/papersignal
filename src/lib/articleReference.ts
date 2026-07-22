import { invokeDesktop, isDesktop } from './desktop';
import type { ArticleReference } from './types';

export async function inspectWechatArticles(urls: string[]): Promise<ArticleReference[]> {
  if (!isDesktop()) throw new Error('文章链接参考仅支持 LayoutGo 桌面版。');
  return invokeDesktop<ArticleReference[]>('inspect_wechat_articles', { urls });
}
