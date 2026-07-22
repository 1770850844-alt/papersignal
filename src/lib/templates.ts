import type { TemplateId, WechatTemplateId, XhsTemplateId } from './types';

export interface WechatTemplate {
  id: WechatTemplateId;
  index: string;
  title: string;
  description: string;
  content: string;
}

export interface XhsTemplate {
  id: XhsTemplateId;
  index: string;
  title: string;
  description: string;
}

export const wechatTemplates: WechatTemplate[] = [
  { id: 'w-journal', index: '01', title: '叙事长文', description: '人物现场 · 沉浸阅读', content: '<h2>把重要的事，讲得安静一些</h2><p>适合有观点、有情绪，也愿意把话说完整的长文章。</p><blockquote>留白不是空白，而是让读者把自己的经验放进来。</blockquote><h3>从一个具体瞬间开始</h3><p>先把场景讲清楚，再慢慢给出你的观察与判断。</p>' },
  { id: 'w-blueprint', index: '02', title: '知识拆解', description: '方法路径 · 分层说明', content: '<h2>把复杂问题，拆成读得懂的路径</h2><p>适合教程、知识解释与工作方法。</p><h3>先定义问题</h3><p>告诉读者这篇文章要解决什么，再交代下一步。</p><blockquote>真正清晰的表达，会让行动自然发生。</blockquote>' },
  { id: 'w-brief', index: '03', title: '行业简报', description: '关键信息 · 结论优先', content: '<h2>一份值得读完的简报</h2><p>把本周最重要的信息留给真正需要的人。</p><h3>关键变化</h3><p>从细节、趋势和判断三个层次组织信息。</p><h3>下一步</h3><p>给出明确但不过度承诺的行动建议。</p>' },
  { id: 'w-letterpress', index: '04', title: '杂志专栏', description: '编辑笔记 · 文字质感', content: '<h2>那些值得被写下来的小发现</h2><p>适合品牌随笔、创作记录和具有个人视角的内容。</p><blockquote>把日常看得认真一点，灵感才会出现。</blockquote><p>用简洁段落留下思考，不必急着得出结论。</p>' },
  { id: 'w-review', index: '05', title: '复盘报告', description: '项目总结 · 表格信息', content: '<h2>一次复盘，把经验带到下一次</h2><p>适合项目复盘、业务总结与团队共识。</p><table><thead><tr><th>观察</th><th>判断</th><th>行动</th></tr></thead><tbody><tr><td>反馈集中</td><td>问题更具体</td><td>优先处理</td></tr></tbody></table><blockquote>复盘的价值，是让下一次少走一点弯路。</blockquote>' },
  { id: 'w-weekend', index: '06', title: '图文手记', description: '生活方式 · 图片叙事', content: '<h2>给周末留一点不被安排的时间</h2><p>适合生活观察、旅行片段和轻盈的品牌内容。</p><figure><img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85" alt="自然光下的日常" /><figcaption>记录那些不必赶路的时刻</figcaption></figure><p>有些感受，要慢一点才会变得具体。</p>' },
  { id: 'w-dialogue', index: '07', title: '问答指南', description: 'FAQ 结构 · 即看即用', content: '<h2>关于这件事，先回答三个问题</h2><h3>从哪里开始？</h3><p>从一个具体的问题开始，不必一次解释全部。</p><h3>怎样判断有效？</h3><p>看它是否减少了真实的阻力。</p><h3>接下来做什么？</h3><p>选择一个今天就能完成的动作。</p>' },
  { id: 'w-product', index: '08', title: '版本日志', description: '产品更新 · 清爽专业', content: '<h2>这次更新，让创作更少来回</h2><p>适合产品发布、功能说明和版本更新。</p><h3>更新了什么</h3><ul><li>把高频操作放回内容附近</li><li>让预览更接近真实阅读页</li><li>减少重复调整的时间</li></ul><p>工具应该让注意力回到表达本身。</p>' },
  { id: 'w-insight', index: '09', title: '观点特写', description: '一条判断 · 递进论述', content: '<h2>一个值得停下来想想的观点</h2><blockquote>好的判断，不是更快地给出答案，而是知道什么值得继续追问。</blockquote><p>适合短观点、演讲摘录和品牌主张。</p><h3>为什么重要</h3><p>把观点放回具体情境，读者才知道它如何影响自己的选择。</p>' },
  { id: 'w-brand', index: '10', title: '品牌年表', description: '真实节点 · 价值叙事', content: '<h2>把一件小事，做成长期的相信</h2><p>适合品牌起源、人物故事与价值表达。</p><h3>从哪里开始</h3><p>先讲一个真实的出发点，而不是一串口号。</p><blockquote>品牌感不是被设计出来的，是被一次次兑现出来的。</blockquote>' }
];

export const xhsTemplates: XhsTemplate[] = [
  { id: 'xhs-poster', index: '01', title: '强标题封面', description: '结论先行 · 适合首图' },
  { id: 'xhs-notebook', index: '02', title: '清单手账', description: '编号步骤 · 收藏干货' },
  { id: 'xhs-magazine', index: '03', title: '杂志内页', description: '编辑网格 · 专题表达' },
  { id: 'xhs-soda', index: '04', title: '多巴胺步骤', description: '轻快节奏 · 易读教程' },
  { id: 'xhs-ink', index: '05', title: '黑金观点', description: '一句判断 · 情绪张力' },
  { id: 'xhs-mist', index: '06', title: '日记留白', description: '生活片段 · 慢叙事' },
  { id: 'xhs-data', index: '07', title: '结论对比', description: '信息卡片 · 结构清楚' },
  { id: 'xhs-study', index: '08', title: '课程笔记', description: '重点标记 · 知识整理' },
  { id: 'xhs-collage', index: '09', title: '拼贴灵感', description: '收集感 · 创作记录' },
  { id: 'xhs-chat', index: '10', title: '对话共鸣', description: '聊天节奏 · 观点互动' },
  { id: 'xhs-minimal', index: '11', title: '极简专业', description: '留白构图 · 商务内容' },
  { id: 'xhs-warm', index: '12', title: '暖调日签', description: '日签卡面 · 情绪收束' }
];

export const getWechatTemplate = (id: TemplateId): WechatTemplate => wechatTemplates.find((template) => template.id === id) ?? wechatTemplates[0];
