import { ChevronLeft, Forward, Heart, Image, MessageCircle, MoreHorizontal, Music2, PencilLine, Send, Smile, Star, ThumbsUp, VolumeX } from 'lucide-react';
import { useState } from 'react';
import type { Brand, Card, Platform, PreviewMode, TemplateId, XhsTemplateId } from '../lib/types';

interface Props { mode: PreviewMode; platform: Platform; template: TemplateId; cardTemplate: XhsTemplateId; html: string; cards: Card[]; brand: Brand; title: string; caption: string; onCard: (card: Card) => void; }

const getPreviewTitle = (html: string, fallback: string) => {
  const heading = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] ?? '';
  const text = heading.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text || (fallback === '未命名文档' ? '未命名文章' : fallback);
};

const formatPreviewDate = () => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

const cardLines = (value: string, count = 3) => {
  const units = value.split(/[，。；、！？\n]/).map((item) => item.trim()).filter(Boolean);
  if (units.length) return units.slice(0, count);
  return value.match(/.{1,15}/g)?.slice(0, count) ?? [value];
};

function XhsCardArtwork({ card, template, brand }: { card: Card; template: XhsTemplateId; brand: Brand }) {
  const lines = cardLines(card.body);
  const titleLines = cardLines(card.title, 2);
  const label = brand.name.toUpperCase();
  switch (template) {
    case 'xhs-notebook': return <div className="card-art notebook-art"><div className="art-sticky">SAVE THIS</div><small>{label} / CHECKLIST</small><h3>{card.title}</h3><ol>{lines.map((line, index) => <li key={line}><b>{String(index + 1).padStart(2, '0')}</b><span>{line}</span></li>)}</ol><em>勾选完，再往下走</em></div>;
    case 'xhs-magazine': return <div className="card-art magazine-art"><header><b>LAYOUT</b><span>ISSUE 0{card.index} / 2026</span></header><div className="magazine-rule" /><p>EDITORIAL NOTE</p><h3>{titleLines.map((line) => <span key={line}>{line}</span>)}</h3><aside>{lines[0]}</aside><footer>{brand.name} / READ SLOWLY</footer></div>;
    case 'xhs-soda': return <div className="card-art soda-art"><i>!</i><i>TIP</i><small>{label} / EASY NOTE</small><h3>{card.title}</h3><div className="soda-steps">{lines.map((line, index) => <p key={line}><b>{index + 1}</b>{line}</p>)}</div><em>把复杂事讲简单</em></div>;
    case 'xhs-ink': return <div className="card-art ink-art"><small>{label} / ONE THOUGHT</small><div className="ink-mark">“</div><h3>{card.title}</h3><p>{lines[0]}</p><footer>NO. 0{card.index} <span>+</span> {brand.name}</footer></div>;
    case 'xhs-mist': return <div className="card-art mist-art"><header><b>07 / 22</b><span>晴 · 适合慢一点</span></header><div className="mist-paper"><small>DAILY NOTE</small><h3>{card.title}</h3><p>{lines.join('，')}。</p></div><em>{brand.name} 的片刻记录</em></div>;
    case 'xhs-data': return <div className="card-art data-art"><header><small>{label} / INSIGHT</small><b>KEY<br />POINTS</b></header><h3>{card.title}</h3><div className="data-rows">{lines.map((line, index) => <p key={line}><b>0{index + 1}</b><span>{line}</span></p>)}</div><footer>结论比信息更重要</footer></div>;
    case 'xhs-study': return <div className="card-art study-art"><small>{label} / CLASS NOTE</small><h3>{card.title}</h3><div className="study-note">{lines.map((line, index) => <p key={line}><b>{index + 1}</b><span>{line}</span></p>)}</div><em>划下来，之后复习</em></div>;
    case 'xhs-collage': return <div className="card-art collage-art"><div className="collage-tape">COLLECT</div><div className="collage-paper"><small>{label} / IDEA</small><h3>{card.title}</h3><p>{lines[0]}</p></div><div className="collage-caption">{lines.slice(1).join(' / ')}</div><footer>made for keeping</footer></div>;
    case 'xhs-chat': return <div className="card-art chat-art"><small>{label} / CHAT NOTE</small><h3>{card.title}</h3><div>{lines.map((line, index) => <p className={index % 2 ? 'reply' : ''} key={line}>{line}</p>)}</div><em>你也有同样的感受吗？</em></div>;
    case 'xhs-minimal': return <div className="card-art minimal-art"><small>NOTE / 0{card.index}</small><div className="minimal-rule" /><h3>{card.title}</h3><p>{lines.join('，')}。</p><footer>{brand.name}</footer></div>;
    case 'xhs-warm': return <div className="card-art warm-art"><header><b>日 常 小 签</b><span>JULY / 22</span></header><div className="warm-card"><i>✦</i><h3>{card.title}</h3><p>{lines.join('，')}。</p></div><footer>把今天收好</footer></div>;
    case 'xhs-poster':
    default: return <div className="card-art poster-art"><header><small>{label} / KNOWLEDGE</small><b>0{card.index}</b></header><h3>{titleLines.map((line) => <span key={line}>{line}</span>)}</h3><p>{lines[0]}</p><div className="poster-bottom"><b>READ<br />THIS</b><span>{brand.name}</span></div></div>;
  }
}

export function PhonePreview({ mode, platform, template, cardTemplate, html, cards, brand, title, caption, onCard }: Props) {
  const articleTitle = getPreviewTitle(html, title);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [following, setFollowing] = useState(false);
  const selectedCard = cards[Math.min(activeCardIndex, Math.max(cards.length - 1, 0))];
  const noteCopy = caption.trim() || (selectedCard ? `${selectedCard.title}\n${selectedCard.body}` : '在这里预览你生成的小红书图文内容。');
  return <div className={`phone ${platform}`}>
    <div className="phone-status"><span>9:41</span><span className="phone-status-icons"><i className="phone-signal" /><i className="phone-wifi" /><i className="phone-battery">95</i></span></div>
    {mode === 'article' ? <>
      <div className="phone-nav wechat-nav"><ChevronLeft size={21} strokeWidth={2.1} /><span className="wechat-nav-title">公众号文章</span><MoreHorizontal size={20} strokeWidth={2.4} /></div>
      <section className="wechat-reader" aria-label="公众号文章预览">
        <header className="wechat-article-head">
          <h1>{articleTitle}</h1>
          <div className="wechat-article-meta"><span className="wechat-original">原创</span><span>{brand.name}</span><time>{formatPreviewDate()}</time></div>
          <p>公众号文章预览 · 阅读 0</p>
        </header>
        <article className={`article-preview ${template}`} dangerouslySetInnerHTML={{ __html: html }} />
        <footer className="wechat-article-footer"><p>本文由 {brand.name} 创作，仅作排版预览。</p><p>作者提示：内容发布前请核对事实与版权信息</p></footer>
        <section className="wechat-comments"><b>留言</b><div><span>写留言</span><span><Smile size={17} /><Image size={17} /></span></div></section>
      </section>
      <footer className="wechat-actionbar"><div className="wechat-author"><i>{brand.name.slice(0, 1)}</i><b>{brand.name}</b></div><div className="wechat-actions"><span><ThumbsUp size={18} /><small>0</small></span><span><Forward size={18} /><small>0</small></span><span><Heart size={18} /><small>0</small></span><span><MessageCircle size={18} /><small>0</small></span></div></footer>
    </> : <section className="xhs-reader" aria-label="小红书笔记预览">
      <header className="xhs-post-head"><ChevronLeft size={21} strokeWidth={2.1} /><div className="xhs-author"><i>{brand.name.slice(0, 1)}</i><span><b>{brand.name}</b><small><Music2 size={11} /> {brand.name} 的原创内容</small></span></div><button className={following ? 'following' : ''} type="button" onClick={() => setFollowing((value) => !value)}>{following ? '已关注' : '关注'}</button><Send size={19} strokeWidth={2.1} /></header>
      <div className="xhs-post-scroll">
        <section className="xhs-media-carousel" aria-label={`第 ${selectedCard?.index ?? 1} 张卡片，共 ${cards.length || 1} 张`}>
          {selectedCard ? <button className={`xhs-media-card ${cardTemplate}`} type="button" onClick={() => onCard(selectedCard)}><XhsCardArtwork card={selectedCard} template={cardTemplate} brand={brand} /></button> : <div className={`xhs-media-card cover ${cardTemplate}`}><XhsCardArtwork card={{ id: 'empty', index: 1, title: '等待内容', body: '粘贴文章或使用 AI 生成卡片后，将在这里显示预览。', theme: 'cover' }} template={cardTemplate} brand={brand} /></div>}
          <span className="xhs-slide-count">{Math.min(activeCardIndex + 1, Math.max(cards.length, 1))}/{Math.max(cards.length, 1)}</span><span className="xhs-mute"><VolumeX size={14} /></span>
          {cards.length > 1 && <div className="xhs-dots">{cards.map((card, index) => <button aria-label={`查看第 ${index + 1} 张卡片`} className={index === activeCardIndex ? 'active' : ''} key={card.id} type="button" onClick={() => setActiveCardIndex(index)} />)}</div>}
        </section>
        <section className="xhs-note-copy"><h1>{selectedCard?.title ?? '小红书图文笔记'}</h1><p>{noteCopy}</p><small>编辑于 {formatPreviewDate()} · {brand.name}</small></section>
      </div>
      <footer className="xhs-actionbar"><div><PencilLine size={18} /><span>说点什么...</span></div><span><Heart size={22} /><b>88</b></span><span><Star size={22} /><b>42</b></span><span><MessageCircle size={22} /><b>1</b></span></footer>
    </section>}
  </div>;
}
