export type TemplateId = 'editorial' | 'postcard' | 'film' | 'quote' | 'checklist' | 'contrast' | 'reading';
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
