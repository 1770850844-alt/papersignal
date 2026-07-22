import type { TemplateId } from './types';

export interface Template {
  id: TemplateId;
  index: string;
  title: string;
  description: string;
  content: string;
}

export const templates: Template[] = [
  {
    id: 'editorial', index: '01', title: '编辑室长文', description: '沉浸阅读 · 深度文章',
    content: '<p class="editor-kicker">ISSUE 08 · SLOW LIVING</p><h2>留一点空白<br />给真正重要的事</h2><p class="editor-lead">在速度被不断催促的日子里，慢下来不是退后。它更像一扇被推开的窗，让我们重新听见生活的底噪。</p><figure><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85" alt="光线穿过安静的室内" /><figcaption>光线会记得每一次停留。</figcaption></figure><p>我们习惯把一天塞得很满，仿佛清单上的勾选越多，时间就越有价值。但有些东西，偏偏要从缝隙里长出来。</p><blockquote>“留白不是空无，而是让感受有地方抵达。”</blockquote><p>于是今天，试着为自己关掉几条提醒。把注意力交还给窗外、杯中的热气，和正在慢慢发生的你。</p>'
  },
  {
    id: 'postcard', index: '02', title: '城市明信片', description: '图文笔记 · 生活方式',
    content: '<p class="editor-kicker">POSTCARD FROM · XIAMEN</p><h2>把傍晚<br />寄回给自己</h2><p class="editor-lead">沿着海堤慢慢走，风把城市的声音吹成很远的背景。</p><figure><img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85" alt="城市的黄昏" /><figcaption>THURSDAY / 18:47</figcaption></figure><p>我喜欢旅行里那些没有被安排的片刻。一杯冰饮、一家陌生的小店，或者只是停下来看看路口的人群。</p><blockquote>“生活不必总是抵达，也可以绕一点路。”</blockquote><p>把今天的风装进口袋，等下一个忙碌的日子再打开。</p>'
  },
  {
    id: 'film', index: '03', title: '胶片日记', description: '旅行记录 · 叙事留白',
    content: '<p class="editor-kicker">ROLL 36 · 2026</p><h2>一卷没拍完的<br />海边胶片</h2><p class="editor-lead">海浪把傍晚推向岸边，天空的蓝色正在显影。</p><figure><img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85" alt="傍晚的海岸" /><figcaption>FRAME 18 / LIGHT LEAK</figcaption></figure><p>我们没有说很多话。脚印被潮水轻轻擦掉，像是替这一天留住了一个无人知晓的结尾。</p><blockquote>“有些风景，适合不带滤镜地记住。”</blockquote><p>后来冲洗照片时才发现，那天的光比记忆里更亮一点。</p>'
  },
  {
    id: 'quote', index: '04', title: '琥珀金句', description: '一句观点 · 分享引言',
    content: '<p class="editor-kicker">ONE THOUGHT / 04</p><h2>真正的效率，<br />是给重要的事<br />留出完整时间。</h2><blockquote>“专注不是做更多，而是愿意放下不重要的。”</blockquote><p class="card-signoff">LAYOUTGO / KEEP THIS</p>'
  },
  {
    id: 'checklist', index: '05', title: '微小清单', description: '实用方法 · 收藏笔记',
    content: '<p class="editor-kicker">A SMALL RESET</p><h2>今天，只做<br />三件小事</h2><ul class="check-list"><li><strong>01</strong> 留十分钟给不带目的的散步</li><li><strong>02</strong> 把一个消息延后半小时回复</li><li><strong>03</strong> 写下一件刚刚发生的好事</li></ul><p>不需要把生活变成项目管理。只要从一件很小的事开始，重新把自己接回来。</p>'
  },
  {
    id: 'contrast', index: '06', title: '观点对照', description: '反差表达 · 知识拆解',
    content: '<p class="editor-kicker">SHIFT THE FRAME</p><h2>你以为的自律，<br />和真正的自律</h2><div class="compare-grid"><p><b>NOT THIS</b>把每一分钟都排满</p><p><b>BUT THIS</b>把精力用在真正重要的地方</p></div><blockquote>“稳定不是一直用力，而是知道何时收回力气。”</blockquote><p class="card-signoff">A BETTER WAY TO WORK</p>'
  },
  {
    id: 'reading', index: '07', title: '阅读摘录', description: '书单分享 · 灵感记录',
    content: '<p class="editor-kicker">READING NOTE · 18</p><h2>那些让我慢下来读的句子</h2><figure><img src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=85" alt="书架" /><figcaption>READ SLOWLY / KEEP THE PAGE OPEN</figcaption></figure><blockquote>“阅读并不急着给出结论，它只是把世界放在你手里。”</blockquote><p>有些书不需要一口气读完。停在一句话旁边，等它和你的生活发生一点联系。</p><p class="card-signoff">本周正在读：关于时间与注意力</p>'
  }
];

export const getTemplate = (id: TemplateId) => templates.find((template) => template.id === id) ?? templates[0];
