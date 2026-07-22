export type WechatTemplateId = 'w-journal' | 'w-blueprint' | 'w-brief' | 'w-letterpress' | 'w-review' | 'w-weekend' | 'w-dialogue' | 'w-product' | 'w-insight' | 'w-brand';
export type XhsTemplateId = 'xhs-poster' | 'xhs-notebook' | 'xhs-magazine' | 'xhs-soda' | 'xhs-ink' | 'xhs-mist' | 'xhs-data' | 'xhs-study' | 'xhs-collage' | 'xhs-chat' | 'xhs-minimal' | 'xhs-warm';
export type TemplateId = WechatTemplateId | `custom:${string}`;
export type Platform = 'wechat' | 'xiaohongshu';
export type PreviewMode = 'article' | 'cards';

export interface Brand {
  name: string;
  accent: string;
  font: 'serif' | 'sans' | 'hand';
}

export interface Draft {
  id: string;
  title: string;
  template: TemplateId;
  content: string;
  updatedAt: string;
}

export interface CustomTemplate {
  id: TemplateId;
  title: string;
  description: string;
  content: string;
  createdAt: string;
}

export interface AppSettings {
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}

export type AiTestStatus = 'untested' | 'success' | 'failed';

export interface AiService {
  id: string;
  providerId: string;
  name: string;
  baseUrl: string;
  model: string;
  createdAt: string;
  lastTestedAt?: string;
  lastTestStatus: AiTestStatus;
  lastTestMessage?: string;
}

export interface AiServiceState {
  services: AiService[];
  activeServiceId: string | null;
}

export interface Card {
  id: string;
  index: number;
  title: string;
  body: string;
  theme: 'cover' | 'quote' | 'list' | 'memo';
}

export interface XhsDraft {
  id: string;
  title: string;
  template: XhsTemplateId;
  content: string;
  cards: Card[];
  caption: string;
  updatedAt: string;
}

export interface ArticleReference {
  url: string;
  title?: string;
  description?: string;
  coverUrl?: string;
  textExcerpt?: string;
  colorHints: string[];
  imageCount: number;
  paragraphCount: number;
  error?: string;
}
