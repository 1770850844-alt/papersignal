import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Check, CheckCircle2, CircleAlert, CircleDashed, Clipboard, Download, FileCode2, FilePlus2, FileText, FolderClock, KeyRound, LoaderCircle, Palette, PanelsTopLeft, Plus, PlugZap, Save, Search, ServerCog, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { RichEditor } from './components/RichEditor';
import { PhonePreview } from './components/PhonePreview';
import { inspectWechatArticles } from './lib/articleReference';
import { deleteApiKey, generateWithAi, hasApiKey, saveApiKey, testAiConnection } from './lib/ai';
import { cardSvg, makeCards } from './lib/card';
import { getProvider, providers } from './lib/providers';
import { deleteDraft, deleteXhsDraft, loadAiServices, loadBrand, loadCustomTemplates, loadDrafts, loadXhsDrafts, saveAiServices, saveBrand, saveCustomTemplates, saveDraft, saveXhsDraft } from './lib/storage';
import { getWechatTemplate, wechatTemplates, xhsTemplates } from './lib/templates';
import type { AiService, ArticleReference, Brand, Card, CustomTemplate, Draft, Platform, PreviewMode, TemplateId, XhsDraft, XhsTemplateId } from './lib/types';
import './styles.css';

type View = 'wechat' | 'cards' | 'convert' | 'aiSettings' | 'drafts';

const initialTemplate = getWechatTemplate('w-journal');
const blankDocument = '<p><br /></p>';
const newDraft = (): Draft => ({ id: crypto.randomUUID(), title: '未命名文档', template: initialTemplate.id, content: blankDocument, updatedAt: new Date().toISOString() });
const getText = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
const isBlankDocument = (html: string) => !getText(html) && !/<(?:img|table|figure)\b/i.test(html);
const toEditorHtml = (text: string) => text.trim().split(/\n{2,}/).filter(Boolean).map((paragraph) => `<p>${paragraph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('') || blankDocument;
const newAiService = (providerId = 'openai'): AiService => {
  const provider = getProvider(providerId);
  return { id: crypto.randomUUID(), providerId, name: provider.name, baseUrl: provider.baseUrl, model: provider.model, createdAt: new Date().toISOString(), lastTestStatus: 'untested' };
};
const referenceTemplate = (references: ArticleReference[]): TemplateId => {
  const colors = references.flatMap((item) => item.colorHints).join(' ').toLowerCase();
  if (/(#0[0-5]|#1[0-9a-f]|#2[0-9a-f]|#3[0-9a-f])/.test(colors)) return 'w-blueprint';
  if (/(#5[0-9a-f]|#6[0-9a-f]|#7[0-9a-f]|#8[0-9a-f])/.test(colors)) return 'w-weekend';
  return 'w-brief';
};
const sanitizeImportedTemplate = (source: string) => {
  const document = new DOMParser().parseFromString(source, 'text/html');
  document.querySelectorAll('script, iframe, object, embed, form, link, style').forEach((node) => node.remove());
  document.querySelectorAll('*').forEach((node) => [...node.attributes].forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    if (name.startsWith('on') || (['href', 'src'].includes(name) && /^\s*javascript:/i.test(attribute.value))) node.removeAttribute(attribute.name);
  }));
  return document.body.innerHTML.trim();
};
const templatePalette = (template: TemplateId) => {
  if (['w-blueprint', 'w-review', 'w-product'].includes(template)) return { accent: '#356c9c', tint: '#edf5fb', text: '#253f56' };
  if (['w-weekend', 'w-brand'].includes(template)) return { accent: '#a66e58', tint: '#fbf0e9', text: '#513d35' };
  if (['w-brief', 'w-insight'].includes(template)) return { accent: '#48667b', tint: '#f0f4f5', text: '#30404a' };
  if (['w-letterpress'].includes(template)) return { accent: '#a07a42', tint: '#faf3e5', text: '#493a25' };
  if (['w-dialogue'].includes(template)) return { accent: '#71856a', tint: '#f1f5ed', text: '#354734' };
  return { accent: '#3152a2', tint: '#f2f4ff', text: '#27322e' };
};
const wechatFormat = (template: TemplateId) => {
  if (template === 'w-journal') return { title: 'font-family:serif;font-size:29px;', paragraph: 'letter-spacing:.25px;font-family:serif;', section: 'border-left:0;border-bottom:1px solid #26312c;padding:0 0 .35em;', quote: 'border-left:0;border-top:1px solid #26312c;border-bottom:1px solid #26312c;background:transparent;' };
  if (template === 'w-blueprint') return { title: 'font-size:27px;', paragraph: 'letter-spacing:.05px;', section: 'background:#edf5fb;border-left:4px solid #356c9c;padding:.45em .65em;', quote: 'border-left:4px solid #356c9c;background:#edf5fb;' };
  if (template === 'w-brief') return { title: 'font-size:26px;', paragraph: 'font-family:system-ui,sans-serif;', section: 'border-left:0;border-bottom:2px solid #48667b;padding-bottom:.4em;', quote: 'border-left:0;background:#f0f4f5;' };
  if (template === 'w-letterpress') return { title: 'font-family:serif;font-size:30px;', paragraph: 'font-family:serif;letter-spacing:.32px;', section: 'border-left:3px solid #a07a42;', quote: 'border-left:0;background:#faf3e5;' };
  if (template === 'w-review') return { title: 'font-size:27px;', paragraph: 'font-family:system-ui,sans-serif;', section: 'border-left:4px solid #356c9c;background:#edf5fb;padding:.35em .6em;', quote: 'border-left:4px solid #356c9c;background:#edf5fb;' };
  if (template === 'w-weekend') return { title: 'font-family:serif;font-size:29px;', paragraph: 'font-family:serif;letter-spacing:.2px;', section: 'border-left:0;border-bottom:1px solid #dcb9a8;', quote: 'border-left:0;background:#fbf0e9;' };
  if (template === 'w-dialogue') return { title: 'font-size:27px;', paragraph: 'font-family:system-ui,sans-serif;', section: 'border-left:4px solid #71856a;background:#f1f5ed;padding:.4em .65em;', quote: 'border-left:4px solid #71856a;background:#f1f5ed;' };
  if (template === 'w-product') return { title: 'font-size:27px;', paragraph: 'font-family:system-ui,sans-serif;', section: 'border-left:4px solid #356c9c;border-bottom:0;background:#edf5fb;padding:.4em .65em;', quote: 'border-left:4px solid #356c9c;background:#edf5fb;' };
  if (template === 'w-insight') return { title: 'font-family:serif;font-size:30px;', paragraph: 'font-family:serif;', section: 'border-left:0;border-bottom:2px solid #48667b;padding-bottom:.35em;', quote: 'border-left:0;border-top:2px solid #48667b;border-bottom:2px solid #48667b;background:#f0f4f5;' };
  if (template === 'w-brand') return { title: 'font-family:serif;font-size:29px;', paragraph: 'font-family:serif;letter-spacing:.2px;', section: 'border-left:3px solid #a66e58;', quote: 'border-left:0;background:#fbf0e9;' };
  return { title: '', paragraph: '', section: '', quote: '' };
};
const appendStyle = (element: HTMLElement, value: string) => { element.style.cssText = `${element.style.cssText}${element.style.cssText ? ';' : ''}${value}`; };
const sourceStyle = (templateHtml: string | undefined, selector: string) => {
  if (!templateHtml) return '';
  return new DOMParser().parseFromString(templateHtml, 'text/html').body.querySelector(selector)?.getAttribute('style') ?? '';
};
const applyTemplateToContent = (html: string, template: TemplateId, templateHtml?: string) => {
  if (isBlankDocument(html)) return html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.body.querySelectorAll('[data-layoutgo-injected="true"]').forEach((node) => node.remove());
  const palette = templatePalette(template);
  const format = wechatFormat(template);
  const titleReference = sourceStyle(templateHtml, 'h1, h2, h3, p');
  const paragraphReference = sourceStyle(templateHtml, 'p');
  const quoteReference = sourceStyle(templateHtml, 'blockquote');
  const blocks = [...document.body.children].filter((node): node is HTMLElement => node instanceof HTMLElement);
  const first = blocks.find((node) => !['FIGURE', 'TABLE', 'UL', 'OL'].includes(node.tagName));
  let mainTitle: HTMLElement | null = null;
  if (first) {
    let title = first;
    if (title.tagName === 'P') {
      const heading = document.createElement('h2');
      heading.innerHTML = title.innerHTML;
      title.replaceWith(heading);
      title = heading;
    }
    appendStyle(title, `margin:0 0 18px;color:${palette.text};font-size:26px;font-weight:700;line-height:1.42;letter-spacing:0;${format.title}${titleReference}`);
    mainTitle = title;
  }
  const paragraphs = [...document.body.querySelectorAll('p')];
  paragraphs.forEach((paragraph, index) => appendStyle(paragraph, `margin:0 0 1.25em;color:${index === 0 ? palette.text : '#445148'};font-size:${index === 0 ? '16px' : '15px'};line-height:1.9;${format.paragraph}${paragraphReference}`));
  document.body.querySelectorAll('h3').forEach((heading) => appendStyle(heading, `margin:1.8em 0 .8em;padding-left:.65em;color:${palette.text};border-left:3px solid ${palette.accent};font-size:19px;line-height:1.45;${format.section}`));
  document.body.querySelectorAll('blockquote').forEach((quote) => appendStyle(quote, `margin:1.7em 0;padding:14px 16px;color:${palette.text};border-left:3px solid ${palette.accent};background:${palette.tint};font-size:16px;line-height:1.8;${format.quote}${quoteReference}`));
  document.body.querySelectorAll('figure').forEach((figure) => appendStyle(figure, 'margin:1.8em 0;'));
  document.body.querySelectorAll('img').forEach((image) => appendStyle(image, 'display:block;width:100%;height:auto;'));
  document.body.querySelectorAll('figcaption').forEach((caption) => appendStyle(caption, 'margin-top:6px;color:#999;font-size:12px;text-align:center;'));
  document.body.querySelectorAll<HTMLElement>('ul, ol').forEach((list) => appendStyle(list, 'margin:1.4em 0;padding-left:1.45em;line-height:1.9;'));
  document.body.querySelectorAll('li').forEach((item) => appendStyle(item, 'margin:.35em 0;'));
  document.body.querySelectorAll('table').forEach((table) => appendStyle(table, 'width:100%;margin:1.6em 0;border-collapse:collapse;'));
  document.body.querySelectorAll<HTMLElement>('th, td').forEach((cell) => appendStyle(cell, 'padding:8px;border:1px solid #d9d3ca;text-align:left;'));
  const intro = paragraphs[0];
  const headings = [...document.body.querySelectorAll<HTMLElement>('h3')];
  const lists = [...document.body.querySelectorAll<HTMLElement>('ul, ol')];
  const tables = [...document.body.querySelectorAll<HTMLElement>('table')];
  if (template === 'w-journal' && intro) appendStyle(intro, `padding:0 0 1.25em;border-bottom:1px solid ${palette.accent};font-size:17px;font-family:serif;`);
  if (template === 'w-blueprint') {
    if (intro) appendStyle(intro, `padding:14px 16px;border:1px solid #b7d0e4;background:#f6fbff;color:${palette.text};`);
    headings.forEach((heading, index) => appendStyle(heading, `counter-increment:blueprint;${index === 0 ? 'counter-reset:blueprint;' : ''}`));
    headings.forEach((heading, index) => heading.setAttribute('data-step', String(index + 1).padStart(2, '0')));
  }
  if (template === 'w-brief' && intro) appendStyle(intro, `padding:13px 15px;color:${palette.text};border-top:2px solid ${palette.accent};border-bottom:1px solid #bdcbd2;background:#f8fafb;font-weight:600;`);
  if (template === 'w-letterpress') {
    if (intro) appendStyle(intro, 'max-width:92%;font-size:17px;font-family:serif;');
    headings.forEach((heading) => appendStyle(heading, `margin-top:2.15em;padding-left:0;border-left:0;color:${palette.accent};font-family:serif;`));
  }
  if (template === 'w-review') {
    if (intro) appendStyle(intro, `padding:11px 14px;border-left:5px solid ${palette.accent};background:#f5f9fc;font-weight:600;`);
    tables.forEach((table) => appendStyle(table, `border-top:3px solid ${palette.accent};font-size:14px;`));
    document.body.querySelectorAll<HTMLElement>('th').forEach((cell) => appendStyle(cell, `color:#fff;border-color:${palette.accent};background:${palette.accent};font-weight:600;`));
  }
  if (template === 'w-weekend') {
    if (intro) appendStyle(intro, 'color:#765a4e;font-size:17px;font-family:serif;');
    document.body.querySelectorAll<HTMLElement>('figure img').forEach((image) => appendStyle(image, 'border-radius:2px;'));
    document.body.querySelectorAll<HTMLElement>('figcaption').forEach((caption) => appendStyle(caption, `color:${palette.accent};letter-spacing:.08em;`));
  }
  if (template === 'w-dialogue') {
    if (intro) appendStyle(intro, `padding:12px 14px;background:#f7faf5;border:1px solid #d6e1d1;`);
    headings.forEach((heading, index) => appendStyle(heading, `display:inline-block;margin:1.75em 0 .65em;padding:.35em .7em;border:0;border-radius:0;background:${index % 2 ? '#f1f5ed' : '#e5efe0'};color:${palette.text};`));
  }
  if (template === 'w-product') {
    if (intro) appendStyle(intro, `padding:11px 14px;color:${palette.text};border:1px solid #b7d0e4;background:#f7fbff;`);
    lists.forEach((list) => appendStyle(list, `padding:12px 16px 12px 32px;border:1px solid #c9dcea;background:#f8fbfe;`));
    document.body.querySelectorAll<HTMLElement>('li').forEach((item) => appendStyle(item, `padding-left:3px;color:${palette.text};`));
  }
  if (template === 'w-insight') {
    if (intro) appendStyle(intro, 'max-width:90%;margin-left:auto;margin-right:auto;color:#5d6f7b;text-align:center;font-family:serif;font-size:17px;');
    document.body.querySelectorAll<HTMLElement>('blockquote').forEach((quote) => appendStyle(quote, `padding:23px 20px;color:${palette.text};font-family:serif;font-size:18px;text-align:center;`));
  }
  if (template === 'w-brand') {
    if (intro) appendStyle(intro, `padding-left:14px;border-left:2px solid ${palette.accent};font-family:serif;font-size:17px;`);
    headings.forEach((heading) => appendStyle(heading, `margin-top:2.25em;padding-left:14px;border-left:2px solid ${palette.accent};font-family:serif;`));
  }

  const injected = (tag: string, text: string, style: string) => {
    const node = document.createElement(tag);
    node.textContent = text;
    node.setAttribute('data-layoutgo-injected', 'true');
    node.setAttribute('style', style);
    return node;
  };
  const addBefore = (target: HTMLElement | null, node: HTMLElement) => target?.parentElement?.insertBefore(node, target);
  const addToHeading = (heading: HTMLElement, text: string, style: string) => heading.insertBefore(injected('span', text, style), heading.firstChild);
  const paragraphAfter = (heading: HTMLElement) => {
    let node = heading.nextElementSibling;
    while (node && node.tagName !== 'P') node = node.nextElementSibling;
    return node instanceof HTMLElement ? node : null;
  };

  // The following structures are intentionally different reading systems, not palette variants.
  if (template === 'w-journal') {
    addBefore(mainTitle, injected('p', 'FIELD NOTE  /  慢读长文', `margin:0 0 14px;color:${palette.accent};font:600 11px/1.2 serif;letter-spacing:.16em;`));
    if (intro) appendStyle(intro, `max-width:92%;padding:0 0 21px;border-bottom:1px solid ${palette.accent};font-size:17px;line-height:2.05;`);
    headings.forEach((heading) => { appendStyle(heading, `margin-top:2.6em;border:0;border-bottom:1px solid ${palette.accent};padding:0 0 8px;font-family:serif;`); });
  }
  if (template === 'w-blueprint') {
    addBefore(mainTitle, injected('p', 'KNOWLEDGE PATH  /  由浅入深', `margin:0 0 11px;color:#356c9c;font:700 10px/1.2 system-ui,sans-serif;letter-spacing:.12em;`));
    if (intro) { addBefore(intro, injected('p', '这篇文章会带你完成', 'margin:0 0 6px;color:#356c9c;font-size:12px;font-weight:700;')); appendStyle(intro, 'padding:16px 17px;border:1px solid #b7d0e4;background:#f6fbff;'); }
    headings.forEach((heading, index) => {
      addToHeading(heading, `${String(index + 1).padStart(2, '0')}  `, 'display:inline-block;margin-right:8px;color:#356c9c;font:700 12px/1 DM Mono,monospace;vertical-align:middle;');
      appendStyle(heading, 'display:block;margin-top:2.2em;padding:11px 13px;border:0;border-left:5px solid #356c9c;background:#edf5fb;');
      const answer = paragraphAfter(heading);
      if (answer) appendStyle(answer, 'padding-left:18px;border-left:1px solid #c8ddeb;');
    });
  }
  if (template === 'w-brief') {
    addBefore(mainTitle, injected('p', 'WEEKLY BRIEF  /  关键变化', 'margin:0 0 13px;color:#48667b;font:700 10px/1 DM Mono,monospace;letter-spacing:.16em;'));
    if (intro) { addBefore(intro, injected('p', '本期摘要', 'margin:21px 0 7px;color:#48667b;font-size:12px;font-weight:700;letter-spacing:.08em;')); appendStyle(intro, 'padding:15px 16px;border-top:2px solid #48667b;border-bottom:1px solid #bdcbd2;background:#f8fafb;font-size:16px;'); }
    headings.forEach((heading, index) => { addToHeading(heading, `0${index + 1}  `, 'color:#48667b;font:700 11px/1 DM Mono,monospace;'); appendStyle(heading, 'margin-top:2.15em;padding:0 0 7px;border:0;border-bottom:2px solid #48667b;background:transparent;'); });
  }
  if (template === 'w-letterpress') {
    addBefore(mainTitle, injected('p', 'THE EDITOR\'S COLUMN', 'margin:0 0 26px;color:#a07a42;font:600 10px/1 Georgia,serif;letter-spacing:.18em;text-align:center;'));
    if (mainTitle) appendStyle(mainTitle, 'max-width:88%;margin-left:auto;margin-right:auto;color:#493a25;font-size:31px;text-align:center;');
    if (intro) appendStyle(intro, 'max-width:88%;margin-left:auto;margin-right:auto;color:#725f46;font-size:17px;font-family:serif;text-align:center;');
    headings.forEach((heading) => { addBefore(heading, injected('p', '—', 'margin:38px 0 9px;color:#a07a42;font:18px/1 Georgia,serif;text-align:center;')); appendStyle(heading, 'margin:0 0 13px;padding:0;border:0;background:transparent;color:#493a25;font-family:serif;text-align:center;'); });
  }
  if (template === 'w-review') {
    addBefore(mainTitle, injected('p', 'PROJECT RETROSPECTIVE', 'margin:0 0 12px;color:#356c9c;font:700 10px/1 DM Mono,monospace;letter-spacing:.12em;'));
    if (intro) { addBefore(intro, injected('p', '结论先行', 'margin:0 0 6px;color:#fff;background:#356c9c;font-size:11px;font-weight:700;text-align:center;')); appendStyle(intro, 'padding:16px;border:1px solid #b7d0e4;background:#f5f9fc;font-weight:600;'); }
    const labels = ['观察', '判断', '行动'];
    headings.forEach((heading, index) => { addToHeading(heading, `${labels[index % labels.length]}  `, 'display:inline-block;margin-right:7px;padding:3px 6px;color:#fff;background:#356c9c;font:700 9px/1 system-ui,sans-serif;vertical-align:middle;'); appendStyle(heading, 'margin-top:2em;padding:0;border:0;background:transparent;'); });
    tables.forEach((table) => appendStyle(table, 'border-top:4px solid #356c9c;box-shadow:0 0 0 1px #c7d8e6;'));
  }
  if (template === 'w-weekend') {
    addBefore(mainTitle, injected('p', 'WEEKEND LETTER  /  给生活的留白', 'margin:0 0 15px;color:#a66e58;font:600 10px/1 serif;letter-spacing:.14em;text-align:center;'));
    if (mainTitle) appendStyle(mainTitle, 'text-align:center;color:#513d35;font-size:30px;font-family:serif;');
    if (intro) appendStyle(intro, 'max-width:88%;margin-left:auto;margin-right:auto;color:#765a4e;font-size:17px;font-family:serif;text-align:center;');
    document.body.querySelectorAll<HTMLElement>('figure').forEach((figure) => { addBefore(figure, injected('p', '✦  PHOTO NOTE', 'margin:26px 0 9px;color:#a66e58;font-size:10px;letter-spacing:.12em;text-align:center;')); appendStyle(figure, 'margin-top:0;margin-bottom:2em;'); });
  }
  if (template === 'w-dialogue') {
    addBefore(mainTitle, injected('p', 'QUESTIONS & ANSWERS', 'margin:0 0 14px;color:#71856a;font:700 10px/1 system-ui,sans-serif;letter-spacing:.12em;'));
    if (intro) appendStyle(intro, 'padding:15px 16px;border:1px solid #d6e1d1;background:#f7faf5;');
    headings.forEach((heading, index) => {
      addToHeading(heading, `Q${index + 1}  `, 'display:inline-block;margin-right:7px;color:#fff;background:#71856a;font:700 10px/1 DM Mono,monospace;');
      appendStyle(heading, 'display:inline-block;margin-top:2.1em;padding:8px 11px;border:0;background:#e5efe0;');
      const answer = paragraphAfter(heading);
      if (answer) { addBefore(answer, injected('p', 'A  回答', 'margin:11px 0 5px;color:#71856a;font:700 10px/1 DM Mono,monospace;')); appendStyle(answer, 'padding:0 0 0 14px;border-left:2px solid #b8c9b2;'); }
    });
  }
  if (template === 'w-product') {
    addBefore(mainTitle, injected('p', 'PRODUCT UPDATE  /  VERSION NOTES', 'margin:0 0 13px;color:#356c9c;font:700 10px/1 DM Mono,monospace;letter-spacing:.1em;'));
    if (intro) appendStyle(intro, 'padding:14px 16px;border:1px solid #b7d0e4;background:#f7fbff;');
    headings.forEach((heading, index) => { addToHeading(heading, `v0.${index + 1}  `, 'color:#356c9c;font:700 11px/1 DM Mono,monospace;'); appendStyle(heading, 'margin-top:2.25em;padding:9px 12px;border:0;border-left:5px solid #356c9c;background:#edf5fb;'); });
    document.body.querySelectorAll<HTMLElement>('li').forEach((item) => { item.insertBefore(injected('span', '✓  ', 'color:#356c9c;font-weight:700;'), item.firstChild); appendStyle(item, 'list-style:none;padding-left:0;'); });
  }
  if (template === 'w-insight') {
    addBefore(mainTitle, injected('p', 'A POINT OF VIEW', 'margin:0 0 22px;color:#48667b;font:700 10px/1 serif;letter-spacing:.18em;text-align:center;'));
    if (mainTitle) appendStyle(mainTitle, 'max-width:90%;margin-left:auto;margin-right:auto;color:#30404a;font-size:31px;font-family:serif;text-align:center;');
    const pull = document.body.querySelector<HTMLElement>('blockquote') ?? intro;
    if (pull) { addBefore(pull, injected('p', '“', 'margin:30px 0 -4px;color:#48667b;font:54px/.8 Georgia,serif;text-align:center;')); appendStyle(pull, 'padding:23px 20px;border:0;border-top:2px solid #48667b;border-bottom:2px solid #48667b;background:#f0f4f5;color:#30404a;font-family:serif;font-size:18px;text-align:center;'); }
    headings.forEach((heading) => appendStyle(heading, 'margin-top:2.7em;padding:0;border:0;border-bottom:1px solid #aab8bf;background:transparent;text-align:center;'));
  }
  if (template === 'w-brand') {
    addBefore(mainTitle, injected('p', 'OUR STORY  /  真实发生的节点', 'margin:0 0 14px;color:#a66e58;font:700 10px/1 serif;letter-spacing:.14em;'));
    if (intro) appendStyle(intro, 'padding:0 0 0 17px;border-left:3px solid #a66e58;font-size:17px;font-family:serif;');
    headings.forEach((heading, index) => {
      addToHeading(heading, `${String(index + 1).padStart(2, '0')}  `, 'display:inline-block;width:31px;color:#a66e58;font:700 11px/1 DM Mono,monospace;');
      appendStyle(heading, 'margin-top:2.4em;padding:0 0 0 16px;border-left:2px solid #a66e58;background:transparent;font-family:serif;');
      const detail = paragraphAfter(heading);
      if (detail) appendStyle(detail, 'margin-left:16px;padding-left:15px;border-left:1px solid #e1c8bd;');
    });
  }
  return document.body.innerHTML;
};

const xhsPrompt = `你是小红书知识内容主编。将输入长文改写成可直接发布的小红书知识图文。
必须遵守：1. 只输出合法 JSON，不能有 Markdown、代码围栏或解释；2. JSON 格式严格为 {"caption":"...","cards":[{"title":"...","body":"..."}]}；3. 生成 4 到 6 张 3:4 知识卡片，首张用强标题制造阅读动机，后续依次给出问题、观点、步骤和行动收束；4. 每个标题不超过 16 个汉字，每张正文 45 到 78 个汉字，短句、留白、信息密度高；5. caption 使用自然 Emoji、开头钩子、分段说明、结尾行动建议和 4 到 6 个相关话题标签；6. 语气真诚、具体、像有经验的创作者分享，不夸张营销、不编造事实、不使用虚假数据。`;
const wechatPrompt = `你是微信公众号深度文章编辑。把输入的小红书笔记扩写成结构完整、可直接排版的中文公众号文章。
必须遵守：1. 只输出安全 HTML 片段，禁止 Markdown、script、style、iframe；2. 只使用 h2、p、blockquote、ul、li、strong；3. 有明确标题、引言、3 到 5 个有信息量的小节、一个引用金句和可执行的结语；4. 文章 900 到 1500 个汉字，保持原笔记真实观点，不虚构数据、案例或经历；5. 语言克制、温暖、适合沉浸阅读，段落不超过 110 字。`;
const wechatTypesetPrompt = `你是资深微信公众号排版编辑。请把输入的文章整理为可直接粘贴到公众号后台的优雅 HTML 排版，而不是重写一篇新文章。
必须遵守：1. 只输出 HTML 片段，不得包含 Markdown、代码围栏、script、style、iframe 或任何解释；2. 只使用 h2、h3、p、blockquote、ul、ol、li、strong、em、a、figure、img、figcaption、table、thead、tbody、tr、th、td；3. 保留原文的事实、观点、专有名词、数据、链接、图片和表格内容，不杜撰、不删减关键信息；4. 第一段必须是 h2 标题，随后为 1 段不超过 90 字的引言；5. 按内容自然拆为 3 到 6 个 h3 小节，正文段落不超过 110 字，避免连续大段文字；6. 仅在原文确有可总结观点时提炼 1 个 blockquote，不编造金句；7. 语言克制、清晰、有人文温度，符合公众号沉浸阅读习惯。`;
const referenceRewritePrompt = `你是微信公众号主编。请根据“参考文章的非表达性风格摘要”，改写当前文章，使其在标题层级、段落节奏、图文留白建议和叙事语气上相近。
必须遵守：1. 只输出安全 HTML 片段，禁止 Markdown、script、style、iframe；2. 只可使用 h2、h3、p、blockquote、ul、ol、li、strong、em、figure、figcaption、table、tbody、tr、th、td；3. 保留当前文章的事实、观点、专有名词与核心信息，不编造内容；4. 绝不复制、改写或复用参考文章的标题、正文、金句、隐喻、专有表达、配图或图片说明；5. 文章结构完整，段落不超过 110 字，适合手机阅读；6. 输出只包含最终 HTML。`;
const unwrapAiOutput = (output: string) => output.trim().replace(/^```(?:html|json)?\s*/i, '').replace(/\s*```$/i, '').trim();
const parseCardOutput = (output: string): { caption: string; cards: Array<{ title: string; body: string }> } => {
  const cleaned = unwrapAiOutput(output);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as { caption?: string; cards?: Array<{ title: string; body: string }> };
  if (!parsed.cards?.length) throw new Error('返回内容不完整，请重试');
  return { caption: parsed.caption ?? '', cards: parsed.cards };
};

export default function App() {
  const [view, setView] = useState<View>('wechat');
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [brand, setBrand] = useState<Brand>({ name: 'LayoutGo', accent: '#3152A2', font: 'serif' });
  const [mode, setMode] = useState<PreviewMode>('article');
  const [platform, setPlatform] = useState<Platform>('wechat');
  const [xhsTemplate, setXhsTemplate] = useState<XhsTemplateId>('xhs-poster');
  const [xhsDraftId, setXhsDraftId] = useState<string>(() => crypto.randomUUID());
  const [xhsDrafts, setXhsDrafts] = useState<XhsDraft[]>([]);
  const [xhsContent, setXhsContent] = useState(blankDocument);
  const [xhsTitle, setXhsTitle] = useState('未命名卡片');
  const [cards, setCards] = useState<Card[]>(() => makeCards('未命名卡片', blankDocument));
  const [caption, setCaption] = useState('');
  const [articleSource, setArticleSource] = useState('');
  const [noteSource, setNoteSource] = useState('');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceLinks, setReferenceLinks] = useState('');
  const [references, setReferences] = useState<ArticleReference[]>([]);
  const [isInspectingReferences, setIsInspectingReferences] = useState(false);
  const [isRestylingFromReference, setIsRestylingFromReference] = useState(false);
  const [templateImportOpen, setTemplateImportOpen] = useState(false);
  const [templateImportName, setTemplateImportName] = useState('');
  const [templateImportDescription, setTemplateImportDescription] = useState('我的导入样式');
  const [templateImportHtml, setTemplateImportHtml] = useState('');
  const templateFileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [aiServices, setAiServices] = useState<AiService[]>([]);
  const [activeAiServiceId, setActiveAiServiceId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AiService>(newAiService);
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const saveTimer = useRef<number>();

  const wordCount = useMemo(() => getText(view === 'cards' ? xhsContent : draft.content).length, [draft.content, view, xhsContent]);
  const availableTemplates = useMemo(() => [...wechatTemplates, ...customTemplates.map((template, index) => ({ ...template, index: `C${index + 1}` }))], [customTemplates]);
  const templateTitle = (templateId: TemplateId) => availableTemplates.find((template) => template.id === templateId)?.title ?? getWechatTemplate(templateId).title;
  const activeAiService = aiServices.find((service) => service.id === activeAiServiceId) ?? null;
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    Promise.all([loadDrafts(), loadXhsDrafts(), loadBrand(), loadAiServices(), loadCustomTemplates()]).then(([savedDrafts, savedXhsDrafts, savedBrand, savedAi, savedTemplates]) => {
      setDrafts(savedDrafts); setBrand(savedBrand);
      setXhsDrafts(savedXhsDrafts);
      setCustomTemplates(savedTemplates);
      if (savedDrafts[0]) setDraft(savedDrafts[0]);
      setAiServices(savedAi.services); setActiveAiServiceId(savedAi.activeServiceId);
      const active = savedAi.services.find((service) => service.id === savedAi.activeServiceId) ?? savedAi.services[0];
      if (active) setAiConfig(active);
    }).catch(() => notify('本地数据库初始化失败，已切换临时存储。'));
  }, []);
  useEffect(() => { if (view !== 'aiSettings') return; hasApiKey(aiConfig.id).then(setHasKey).catch(() => setHasKey(false)); }, [view, aiConfig.id]);
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const next = { ...draft, updatedAt: new Date().toISOString() };
      saveDraft(next).then(() => setDrafts((items) => [next, ...items.filter((item) => item.id !== next.id)]));
    }, 650);
    return () => window.clearTimeout(saveTimer.current);
  }, [draft.id, draft.title, draft.template, draft.content]);

  const openView = (next: View) => {
    setView(next);
    if (next === 'wechat') { setMode('article'); setPlatform('wechat'); }
    if (next === 'cards') { setMode('cards'); setPlatform('xiaohongshu'); }
  };
  const chooseTemplate = (template: TemplateId) => {
    const item = availableTemplates.find((candidate) => candidate.id === template) ?? getWechatTemplate(template);
    const content = applyTemplateToContent(draft.content, template, item.content);
    const title = draft.title === '未命名文档' ? getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || draft.title : draft.title;
    setDraft((current) => ({ ...current, title, template, content }));
    notify(isBlankDocument(content) ? `已选择“${item.title}”，粘贴内容后即可套用` : `已将“${item.title}”套用到当前内容`);
  };
  const chooseXhsTemplate = (template: XhsTemplateId) => {
    setXhsTemplate(template);
    const item = xhsTemplates.find((candidate) => candidate.id === template);
    notify(`已切换为“${item?.title ?? '小红书卡片'}”模板`);
  };
  const openTemplateImport = (fromCurrent = false) => {
    setTemplateImportName(fromCurrent ? `${draft.title}样式` : '');
    setTemplateImportDescription(fromCurrent ? '从当前文章保存' : '我的导入样式');
    setTemplateImportHtml(fromCurrent ? draft.content : '');
    setTemplateImportOpen(true);
  };
  const loadTemplateFile = (file?: File) => {
    if (!file) return;
    if (file.size > 1_500_000) { notify('模板文件请控制在 1.5MB 以内'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setTemplateImportName(file.name.replace(/\.(html?|txt)$/i, '') || '我的导入模板');
      setTemplateImportHtml(reader.result);
      notify('已读取模板文件，请确认名称后导入');
    };
    reader.readAsText(file);
  };
  const persistCustomTemplate = async () => {
    const content = sanitizeImportedTemplate(templateImportHtml);
    const title = templateImportName.trim().slice(0, 24);
    if (!title) { notify('请填写模板名称'); return; }
    if (getText(content).length < 8) { notify('模板内容过少，请导入有效的文章 HTML'); return; }
    const template: CustomTemplate = { id: `custom:${crypto.randomUUID()}`, title, description: templateImportDescription.trim().slice(0, 34) || '我的导入样式', content, createdAt: new Date().toISOString() };
    try {
      const next = [template, ...customTemplates];
      await saveCustomTemplates(next);
      setCustomTemplates(next);
      setTemplateImportOpen(false);
      const content = applyTemplateToContent(draft.content, template.id, template.content);
      const title = draft.title === '未命名文档' ? getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || draft.title : draft.title;
      setDraft((current) => ({ ...current, title, template: template.id, content }));
      notify('已导入到“我的导入模板”');
    } catch (error) { notify(error instanceof Error ? error.message : '模板保存失败'); }
  };
  const removeCustomTemplate = async (template: CustomTemplate) => {
    if (!window.confirm(`删除导入模板“${template.title}”？`)) return;
    try {
      const next = customTemplates.filter((item) => item.id !== template.id);
      await saveCustomTemplates(next);
      setCustomTemplates(next);
      if (draft.template === template.id) setDraft((current) => ({ ...current, template: 'w-journal' }));
      notify('已删除导入模板');
    } catch (error) { notify(error instanceof Error ? error.message : '模板删除失败'); }
  };
  const changeContent = (content: string) => {
    if (view === 'cards') {
      const title = getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || xhsTitle;
      setXhsContent(content);
      setXhsTitle(title);
      setCards(makeCards(title, content));
      return;
    }
    setDraft((current) => ({ ...current, content, title: getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || current.title }));
  };
  const newBlankDraft = () => {
    if (view === 'cards') {
      setXhsDraftId(crypto.randomUUID());
      setXhsContent(blankDocument);
      setXhsTitle('未命名卡片');
      setCards(makeCards('未命名卡片', blankDocument));
      setCaption('');
      notify('已新建一组小红书制卡内容');
      return;
    }
    const next = newDraft(); setDraft(next); notify('已新建一篇草稿');
  };
  const saveCurrentDraft = async () => {
    window.clearTimeout(saveTimer.current);
    const next = { ...draft, updatedAt: new Date().toISOString() };
    try {
      await saveDraft(next);
      setDraft(next);
      setDrafts((items) => [next, ...items.filter((item) => item.id !== next.id)]);
      notify('已保存到本地草稿');
    } catch (error) { notify(error instanceof Error ? error.message : '本地草稿保存失败'); }
  };
  const saveCurrentXhsDraft = async () => {
    const next: XhsDraft = { id: xhsDraftId, title: xhsTitle, template: xhsTemplate, content: xhsContent, cards, caption, updatedAt: new Date().toISOString() };
    try {
      await saveXhsDraft(next);
      setXhsDrafts((items) => [next, ...items.filter((item) => item.id !== next.id)]);
      notify('小红书制卡草稿已保存');
    } catch (error) { notify(error instanceof Error ? error.message : '小红书草稿保存失败'); }
  };
  const openDraft = (item: Draft) => { setDraft(item); openView('wechat'); notify(`已打开“${item.title}”`); };
  const openXhsDraft = (item: XhsDraft) => {
    setXhsDraftId(item.id);
    setXhsTitle(item.title);
    setXhsTemplate(item.template);
    setXhsContent(item.content);
    setCards(item.cards);
    setCaption(item.caption);
    openView('cards');
    notify(`已打开“小红书制卡：${item.title}”`);
  };
  const removeDraft = async (item: Draft) => {
    if (!window.confirm(`删除草稿“${item.title}”？此操作无法恢复。`)) return;
    try {
      await deleteDraft(item.id);
      const remaining = drafts.filter((draftItem) => draftItem.id !== item.id);
      setDrafts(remaining);
      if (draft.id === item.id) { const next = remaining[0] ?? newDraft(); setDraft(next); }
      notify('草稿已删除');
    } catch (error) { notify(error instanceof Error ? error.message : '删除草稿失败'); }
  };
  const removeXhsDraft = async (item: XhsDraft) => {
    if (!window.confirm(`删除小红书制卡草稿“${item.title}”？此操作无法恢复。`)) return;
    try {
      await deleteXhsDraft(item.id);
      const remaining = xhsDrafts.filter((draftItem) => draftItem.id !== item.id);
      setXhsDrafts(remaining);
      if (xhsDraftId === item.id) {
        setXhsDraftId(crypto.randomUUID());
        setXhsTitle('未命名卡片');
        setXhsContent(blankDocument);
        setCards(makeCards('未命名卡片', blankDocument));
        setCaption('');
      }
      notify('小红书制卡草稿已删除');
    } catch (error) { notify(error instanceof Error ? error.message : '删除小红书草稿失败'); }
  };
  const copyHtml = async () => {
    try {
      const styled = `<section style="font-family:serif;color:#27322e;line-height:1.9">${draft.content}</section>`;
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([styled], { type: 'text/html' }), 'text/plain': new Blob([getText(draft.content)], { type: 'text/plain' }) })]);
      notify('已复制兼容公众号的富文本');
    } catch { notify('无法写入剪贴板，请检查系统剪贴板权限'); }
  };
  const exportHtml = () => { const title = view === 'cards' ? xhsTitle : draft.title; const content = view === 'cards' ? xhsContent : draft.content; const file = new Blob([`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><article>${content}</article></html>`], { type: 'text/html' }); download(file, `${safeName(title)}.html`); };
  const exportCards = async () => { const zip = new JSZip(); cards.forEach((card) => zip.file(`${String(card.index).padStart(2, '0')}-${safeName(card.title)}.svg`, cardSvg(card, brand.name, brand.accent, xhsTemplate))); download(await zip.generateAsync({ type: 'blob' }), `${safeName(xhsTitle)}-小红书图集.zip`); notify('图集已打包下载'); };
  const requireAi = () => {
    if (activeAiService?.lastTestStatus === 'success') return true;
    openView('aiSettings'); notify('请先测试并保存一个可用的 AI 服务'); return false;
  };
  const inspectReferenceLinks = async () => {
    const urls = [...new Set(referenceLinks.split(/\s+/).map((item) => item.trim()).filter(Boolean))];
    if (!urls.length) { notify('请粘贴至少一篇公众号文章链接'); return; }
    if (urls.length > 5) { notify('一次最多分析 5 篇文章'); return; }
    setIsInspectingReferences(true);
    try {
      const result = await inspectWechatArticles(urls);
      setReferences(result);
      const success = result.filter((item) => !item.error).length;
      notify(success ? `已分析 ${success} 篇文章的视觉与结构特征` : '未能读取文章，请检查链接是否公开');
    } catch (error) {
      notify(error instanceof Error ? error.message : '文章链接分析失败');
    } finally { setIsInspectingReferences(false); }
  };
  const restyleFromReferences = async () => {
    const usable = references.filter((item) => !item.error);
    if (!usable.length) { notify('请先分析至少一篇可访问的文章'); return; }
    if (!requireAi()) return;
    setIsRestylingFromReference(true);
    try {
      const guide = usable.map((item, index) => `${index + 1}. 标题：${item.title ?? '未读取'}；摘要：${item.description ?? '无'}；图片数：${item.imageCount}；段落数：${item.paragraphCount}；色彩：${item.colorHints.join(', ') || '未识别'}；内容节奏摘要：${item.textExcerpt ?? '无'}`).join('\n');
      const output = await generateWithAi(activeAiService!, `${referenceRewritePrompt}\n\n参考文章风格摘要（仅供抽象风格参考，不能复用其中表达）：\n${guide}\n\n当前待修改文章：\n${draft.content}`);
      const html = output.replace(/^```html\s*|\s*```$/g, '').trim();
      if (!html) throw new Error('AI 未返回可用文章');
      const template = referenceTemplate(usable);
      setDraft((current) => ({ ...current, template, content: html, title: getText(html).split(/[。！？\n]/)[0]?.slice(0, 30) || current.title }));
      setReferenceOpen(false);
      notify('已按参考文章的结构与视觉节奏改写当前文章');
    } catch (error) {
      notify(error instanceof Error ? `风格改写失败：${error.message}` : '风格改写失败');
    } finally { setIsRestylingFromReference(false); }
  };
  const generateCards = async () => {
    if (!requireAi()) return;
    setIsGenerating(true);
    try {
      const source = articleSource.trim() || getText(draft.content);
      const output = await generateWithAi(activeAiService!, `${xhsPrompt}\n\n输入长文：\n${source}`);
      const parsed = parseCardOutput(output);
      setCards(parsed.cards.slice(0, 6).map((card, index) => ({ id: crypto.randomUUID(), index: index + 1, title: card.title, body: card.body, theme: (['cover', 'quote', 'list', 'memo'] as const)[index % 4] })));
      const content = articleSource.trim() ? toEditorHtml(articleSource) : draft.content;
      setXhsDraftId(crypto.randomUUID());
      setXhsContent(content);
      setXhsTitle(getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || '未命名卡片');
      setCaption(parsed.caption ?? ''); openView('cards'); notify('已生成小红书图文初稿');
    } catch (error) { notify(error instanceof Error ? `AI 生成失败：${error.message}` : 'AI 生成失败'); } finally { setIsGenerating(false); }
  };
  const aiTypesetArticle = async () => {
    if (isBlankDocument(draft.content)) { notify('请先粘贴或输入需要排版的文章'); return; }
    if (!requireAi()) return;
    setIsGenerating(true);
    try {
      const output = await generateWithAi(activeAiService!, `${wechatTypesetPrompt}\n\n待排版文章 HTML：\n${draft.content}`);
      const html = sanitizeImportedTemplate(unwrapAiOutput(output));
      if (!getText(html)) throw new Error('AI 未返回可用文章');
      const currentTemplate = availableTemplates.find((item) => item.id === draft.template);
      const content = applyTemplateToContent(html, draft.template, currentTemplate?.content);
      const title = getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || draft.title;
      setDraft((current) => ({ ...current, title, content }));
      notify('AI 已完成公众号排版');
    } catch (error) { notify(error instanceof Error ? `AI 排版失败：${error.message}` : 'AI 排版失败'); } finally { setIsGenerating(false); }
  };
  const aiCreateCards = async () => {
    const source = getText(xhsContent);
    if (!source) { notify('请先粘贴或输入用于制卡的内容'); return; }
    if (!requireAi()) return;
    setIsGenerating(true);
    try {
      const output = await generateWithAi(activeAiService!, `${xhsPrompt}\n\n输入长文：\n${source}`);
      const parsed = parseCardOutput(output);
      setCards(parsed.cards.slice(0, 6).map((card, index) => ({ id: crypto.randomUUID(), index: index + 1, title: card.title, body: card.body, theme: (['cover', 'quote', 'list', 'memo'] as const)[index % 4] })));
      setCaption(parsed.caption ?? '');
      notify('AI 已生成小红书图文');
    } catch (error) { notify(error instanceof Error ? `AI 制卡失败：${error.message}` : 'AI 制卡失败'); } finally { setIsGenerating(false); }
  };
  const expandArticle = async () => {
    if (!requireAi()) return;
    setIsGenerating(true);
    try {
      const source = noteSource.trim() || caption || getText(xhsContent);
      const output = await generateWithAi(activeAiService!, `${wechatPrompt}\n\n输入小红书笔记：\n${source}`);
      changeContent(unwrapAiOutput(output)); openView('wechat'); notify('已生成公众号文章初稿');
    } catch (error) { notify(error instanceof Error ? `AI 扩写失败：${error.message}` : 'AI 扩写失败'); } finally { setIsGenerating(false); }
  };
  const selectProvider = (providerId: string) => { const provider = getProvider(providerId); setAiConfig((current) => ({ ...current, providerId, baseUrl: provider.baseUrl, model: provider.model, name: current.name === getProvider(current.providerId).name ? provider.name : current.name, lastTestStatus: 'untested', lastTestedAt: undefined, lastTestMessage: undefined })); };
  const activateAiService = async (service: AiService) => { setAiConfig(service); setActiveAiServiceId(service.id); setApiKey(''); await saveAiServices({ services: aiServices, activeServiceId: service.id }); };
  const testCurrentService = async () => {
    if (!aiConfig.name.trim() || !aiConfig.baseUrl.trim() || !aiConfig.model.trim()) { notify('请填写服务名称、Base URL 和模型名'); return null; }
    setIsTestingAi(true);
    try { const message = await testAiConnection(aiConfig, apiKey); const tested = { ...aiConfig, lastTestStatus: 'success' as const, lastTestMessage: message, lastTestedAt: new Date().toISOString() }; setAiConfig(tested); notify('AI 服务通路测试成功'); return tested; }
    catch (error) { const message = error instanceof Error ? error.message : '通路测试失败'; setAiConfig((current) => ({ ...current, lastTestStatus: 'failed', lastTestMessage: message, lastTestedAt: new Date().toISOString() })); notify(`通路测试失败：${message}`); return null; }
    finally { setIsTestingAi(false); }
  };
  const persistAi = async () => {
    if (!apiKey.trim() && !hasKey) { notify('请先填写 API Key，再测试连接'); return; }
    setIsSavingAi(true);
    try {
      const tested = await testCurrentService(); if (!tested) return;
      if (apiKey.trim()) await saveApiKey(tested.id, apiKey.trim());
      const exists = aiServices.some((service) => service.id === tested.id);
      const services = exists ? aiServices.map((service) => service.id === tested.id ? tested : service) : [tested, ...aiServices];
      await saveAiServices({ services, activeServiceId: tested.id });
      setAiServices(services); setActiveAiServiceId(tested.id); setAiConfig(tested); setApiKey(''); setHasKey(true); notify(`“${tested.name}” 已测试并保存`);
    } catch (error) { notify(error instanceof Error ? error.message : '保存 AI 服务失败'); } finally { setIsSavingAi(false); }
  };
  const removeAiService = async (service: AiService) => {
    if (!window.confirm(`删除“${service.name}”及其本机 API Key？`)) return;
    try { await deleteApiKey(service.id); const services = aiServices.filter((item) => item.id !== service.id); const nextActive = activeAiServiceId === service.id ? services[0]?.id ?? null : activeAiServiceId; await saveAiServices({ services, activeServiceId: nextActive }); setAiServices(services); setActiveAiServiceId(nextActive); setAiConfig(services.find((item) => item.id === nextActive) ?? newAiService()); setApiKey(''); setHasKey(false); notify('AI 服务已删除'); } catch (error) { notify(error instanceof Error ? error.message : '删除失败'); }
  };

  const navItems: Array<{ id: View; label: string; icon: typeof FileText }> = [
    { id: 'wechat', label: '公众号排版', icon: FileText }, { id: 'cards', label: '小红书制卡', icon: PanelsTopLeft }, { id: 'convert', label: 'AI 内容转换', icon: Wand2 }, { id: 'aiSettings', label: 'AI 服务配置', icon: ServerCog }, { id: 'drafts', label: '本地草稿', icon: FolderClock }
  ];
  const isComposer = view === 'wechat' || view === 'cards';

  return <main className="layoutgo-app" style={{ '--brand-accent': brand.accent } as React.CSSProperties}>
    <aside className="global-nav"><a className="side-brand" href="#top"><img src="/layoutgo-logo-transparent.png" alt="LayoutGo" /></a><nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => openView(id)}><Icon size={17} /><span>{label}</span></button>)}</nav><div className="nav-bottom"><span><Check size={13} />本地保存</span><button title="品牌 VI" onClick={() => setBrandOpen(true)}><Palette size={16} /></button></div></aside>
    <section className="app-content">
      <header className="workspace-topbar"><div><p>{view === 'convert' ? 'AI CONTENT STUDIO' : view === 'aiSettings' ? 'AI SERVICE DIRECTORY' : view === 'drafts' ? 'LOCAL ARCHIVE' : 'CONTENT CANVAS'}</p><h1>{view === 'wechat' ? '公众号排版' : view === 'cards' ? '小红书制卡' : view === 'convert' ? 'AI 内容转换' : view === 'aiSettings' ? 'AI 服务配置' : '本地草稿'}</h1></div><div className="workspace-actions">{isComposer && <><span>{wordCount} 字</span><button className="quiet-button" onClick={exportHtml}><FileCode2 size={15} />导出 HTML</button><button className="solid-button" onClick={view === 'wechat' ? copyHtml : exportCards}>{view === 'wechat' ? <Clipboard size={15} /> : <Download size={15} />}{view === 'wechat' ? '复制公众号正文' : '下载图集'}</button></>}</div></header>
      {isComposer && <section className="composer-grid">
        <aside className="template-rail">
          <div className="rail-heading"><span>{view === 'wechat' ? '公众号模板' : '小红书模板'}</span>{view === 'wechat' && <div className="rail-actions"><button title="参考公众号文章风格" onClick={() => setReferenceOpen(true)}><Search size={16} /></button><button title="导入自定义模板" onClick={() => openTemplateImport()}><Plus size={16} /></button></div>}</div>
          <div className="template-stack">
            {view === 'wechat' ? <>{wechatTemplates.map((template) => <button key={template.id} className={`template-choice wechat-template-choice ${template.id} ${draft.template === template.id ? 'selected' : ''}`} onClick={() => chooseTemplate(template.id)}><i>{template.index}</i><span><b>{template.title}</b><small>{template.description}</small></span></button>)}
              {customTemplates.length > 0 && <p className="template-divider">我的导入模板</p>}
              {customTemplates.map((template, index) => <div className={`custom-template-item ${draft.template === template.id ? 'selected' : ''}`} key={template.id}><button className="template-choice" onClick={() => chooseTemplate(template.id)}><i>C{index + 1}</i><span><b>{template.title}</b><small>{template.description}</small></span></button><button className="template-delete" title={`删除 ${template.title}`} onClick={() => void removeCustomTemplate(template)}><Trash2 size={14} /></button></div>)}</> : xhsTemplates.map((template) => <button key={template.id} className={`template-choice xhs-template-choice ${template.id} ${xhsTemplate === template.id ? 'selected' : ''}`} onClick={() => chooseXhsTemplate(template.id)}><i>{template.index}</i><span><b>{template.title}</b><small>{template.description}</small></span></button>)}
          </div>
        </aside>
        <section className="compose-editor">
          <header><span>内容编辑</span><div className="editor-header-actions"><button className="quiet-button" onClick={newBlankDraft}><FilePlus2 size={14} />{view === 'wechat' ? '新建文档' : '新建制卡内容'}</button><button className="ai-editor-button" disabled={isGenerating} onClick={() => void (view === 'wechat' ? aiTypesetArticle() : aiCreateCards())}>{isGenerating ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}{view === 'wechat' ? 'AI 排版' : 'AI 制卡'}</button><button className="outline-button" onClick={() => void (view === 'wechat' ? saveCurrentDraft() : saveCurrentXhsDraft())}><Save size={14} />保存草稿</button><small>{view === 'cards' ? '独立保存为小红书制卡草稿，不会改动公众号文章' : '编辑后可直接复制到公众号后台'}</small></div></header>
          <RichEditor html={view === 'cards' ? xhsContent : draft.content} onChange={changeContent} />
        </section>
        <aside className="compose-preview"><header><div><span>发布预览</span><small>{view === 'wechat' ? '公众号文章' : '小红书 3:4 卡片'}</small></div></header><div className="preview-canvas"><PhonePreview mode={mode} platform={platform} template={draft.template} cardTemplate={xhsTemplate} html={view === 'cards' ? xhsContent : draft.content} cards={cards} brand={brand} title={view === 'cards' ? xhsTitle : draft.title} caption={caption} onCard={() => notify('卡片已选中，可下载整组图集')} /></div></aside>
      </section>}
      {view === 'convert' && <section className="conversion-view"><div className="conversion-intro"><span><Sparkles size={16} />已连接的服务：{activeAiService?.name ?? '未配置'}</span><h2>把一种内容，变成<br />另一种更适合发布的表达。</h2></div><div className="conversion-grid"><article><header><PanelsTopLeft size={20} /><div><h3>长文变小红书卡片</h3><p>生成 4-6 张知识卡片、Emoji 正文与标签</p></div></header><textarea value={articleSource} onChange={(event) => setArticleSource(event.target.value)} placeholder="粘贴一篇长文；留空则使用当前编辑中的文章。" /><footer><span>固定 JSON 输出 · 标题、步骤、行动收束</span><button className="solid-button" disabled={isGenerating} onClick={generateCards}>{isGenerating ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}生成卡片</button></footer></article><article><header><FileText size={20} /><div><h3>小红书笔记扩写公众号</h3><p>生成具有节奏与层级的完整文章 HTML</p></div></header><textarea value={noteSource} onChange={(event) => setNoteSource(event.target.value)} placeholder="粘贴小红书笔记；留空则使用小红书正文或当前文章。" /><footer><span>固定 HTML 输出 · 引言、分节、金句、结语</span><button className="outline-button" disabled={isGenerating} onClick={expandArticle}>{isGenerating ? <LoaderCircle className="spin" size={15} /> : <Wand2 size={15} />}扩写文章</button></footer></article></div><div className="prompt-note"><KeyRound size={15} /><span>提示词已由 LayoutGo 固化为发布规范，服务商仅负责生成，不会读取或上传你的草稿之外的数据。</span></div></section>}
      {view === 'aiSettings' && <section className="settings-view"><section className="service-directory"><header><div><span>已保存服务</span><small>{aiServices.length} 个</small></div><button className="outline-button" onClick={() => { setAiConfig(newAiService()); setApiKey(''); setHasKey(false); }}><Plus size={14} />新建服务</button></header>{aiServices.length ? <div className="service-cards">{aiServices.map((service) => <div className={`service-card ${service.id === activeAiServiceId ? 'active' : ''}`} key={service.id}><button onClick={() => void activateAiService(service)}><span className={`status-dot ${service.lastTestStatus}`}>{service.lastTestStatus === 'success' ? <CheckCircle2 size={15} /> : service.lastTestStatus === 'failed' ? <CircleAlert size={15} /> : <CircleDashed size={15} />}</span><span><b>{service.name}</b><small>{service.model}{service.id === activeAiServiceId ? ' · 当前使用' : ''}</small></span></button><button className="delete-icon" title={`删除 ${service.name}`} onClick={() => void removeAiService(service)}><Trash2 size={15} /></button></div>)}</div> : <p className="empty-state">尚未保存 AI 服务。完成右侧测试后，服务会显示在这里。</p>}</section><section className="service-form"><header><div><p>CONNECTION SETUP</p><h2>{aiServices.some((service) => service.id === aiConfig.id) ? '编辑 AI 服务' : '新建 AI 服务'}</h2></div>{aiConfig.lastTestStatus === 'success' && <span className="verified"><CheckCircle2 size={14} />已验证可用</span>}</header><div className="field-grid"><label>服务名称<input value={aiConfig.name} onChange={(event) => setAiConfig({ ...aiConfig, name: event.target.value, lastTestStatus: 'untested' })} placeholder="例如：团队 DeepSeek" /></label><label>服务商<select value={aiConfig.providerId} onChange={(event) => selectProvider(event.target.value)}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label>Base URL<input value={aiConfig.baseUrl} onChange={(event) => setAiConfig({ ...aiConfig, baseUrl: event.target.value.replace(/\/$/, ''), lastTestStatus: 'untested' })} placeholder="https://api.example.com/v1" /></label><label>模型名<input value={aiConfig.model} onChange={(event) => setAiConfig({ ...aiConfig, model: event.target.value, lastTestStatus: 'untested' })} placeholder="模型名称" /></label><label className="full-field">API Key<input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey ? '已保存在系统钥匙串，输入可替换' : '粘贴你的 API Key'} /></label></div>{aiConfig.lastTestMessage && <p className={`connection-message ${aiConfig.lastTestStatus}`}>{aiConfig.lastTestStatus === 'success' ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}{aiConfig.lastTestMessage}</p>}<p className="key-note">保存前会真实请求模型。API Key 仅保存在当前设备的系统钥匙串，不会写入草稿或配置数据库。</p><footer><button className="outline-button" disabled={isTestingAi || isSavingAi} onClick={() => void testCurrentService()}>{isTestingAi ? <LoaderCircle className="spin" size={15} /> : <PlugZap size={15} />}测试通路</button><button className="solid-button" disabled={isTestingAi || isSavingAi} onClick={() => void persistAi()}>{isSavingAi ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}测试并保存</button></footer></section></section>}
      {view === 'drafts' && <section className="drafts-view"><header><div><p>LOCAL ARCHIVE</p><h2>本地草稿</h2><span>草稿仅保存在当前设备，可随时继续编辑。</span></div><button className="solid-button" onClick={() => { openView('wechat'); newBlankDraft(); }}><Plus size={15} />新建公众号草稿</button></header><section className="draft-group"><h3>公众号排版</h3><div className="draft-board">{drafts.length ? drafts.map((item) => <article className={item.id === draft.id ? 'current' : ''} key={item.id}><button className="draft-card-open" onClick={() => openDraft(item)}><small>{templateTitle(item.template)} · {new Date(item.updatedAt).toLocaleDateString('zh-CN')}</small><h3>{item.title}</h3><p>{getText(item.content).slice(0, 88) || '空白草稿'}</p><span>打开继续编辑 →</span></button><button className="delete-icon" title={`删除 ${item.title}`} onClick={() => void removeDraft(item)}><Trash2 size={15} /></button></article>) : <p className="empty-state">还没有公众号草稿。</p>}</div></section><section className="draft-group"><h3>小红书制卡</h3><div className="draft-board">{xhsDrafts.length ? xhsDrafts.map((item) => <article className={item.id === xhsDraftId ? 'current' : ''} key={item.id}><button className="draft-card-open" onClick={() => openXhsDraft(item)}><small>{xhsTemplates.find((template) => template.id === item.template)?.title ?? '小红书模板'} · {new Date(item.updatedAt).toLocaleDateString('zh-CN')}</small><h3>{item.title}</h3><p>{item.cards.length ? `${item.cards.length} 张卡片 · ${getText(item.content).slice(0, 62)}` : getText(item.content).slice(0, 88) || '空白制卡草稿'}</p><span>打开继续制卡 →</span></button><button className="delete-icon" title={`删除 ${item.title}`} onClick={() => void removeXhsDraft(item)}><Trash2 size={15} /></button></article>) : <p className="empty-state">还没有小红书制卡草稿。</p>}</div></section></section>}
    </section>
    {referenceOpen && <aside className="reference-dialog" role="dialog" aria-modal="true" aria-label="公众号文章风格参考">
      <header><div><p>ARTICLE STYLE REFERENCE</p><h2>参考公众号文章风格</h2></div><button title="关闭" onClick={() => setReferenceOpen(false)}><X size={18} /></button></header>
      <p className="reference-intro">粘贴最多 5 篇公开公众号文章链接。LayoutGo 仅提取标题层级、段落节奏、配图密度和色彩倾向，不保存或复制原文、标题与图片。</p>
      <label className="reference-input">文章链接<textarea value={referenceLinks} onChange={(event) => setReferenceLinks(event.target.value)} placeholder={'每行一篇，例如：\nhttps://mp.weixin.qq.com/s/…'} /></label>
      <div className="reference-actions"><button className="outline-button" disabled={isInspectingReferences} onClick={() => void inspectReferenceLinks()}>{isInspectingReferences ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}分析链接</button><span>仅支持 mp.weixin.qq.com</span></div>
      {references.length > 0 && <section className="reference-results"><header><span>已读取 {references.filter((item) => !item.error).length} 篇参考文章</span></header><div>{references.map((item) => <article key={item.url} className={item.error ? 'failed' : ''}><div><b>{item.title ?? '未读取到标题'}</b><small>{item.error ?? `${item.imageCount} 张图片 · ${item.paragraphCount} 个内容区块`}</small></div>{!item.error && <span className="color-hints">{item.colorHints.slice(0, 3).map((color) => <i key={color} style={{ backgroundColor: color }} title={color} />)}</span>}</article>)}</div><p>按此风格改写会保留当前文章的事实与观点，只借鉴阅读节奏和视觉结构。</p><button className="solid-button full" disabled={isRestylingFromReference} onClick={() => void restyleFromReferences()}>{isRestylingFromReference ? <LoaderCircle className="spin" size={15} /> : <Wand2 size={15} />}按参考风格改写当前文章</button></section>}
    </aside>}
    {templateImportOpen && <aside className="template-import-dialog" role="dialog" aria-modal="true" aria-label="导入自定义模板">
      <header><div><p>MY TEMPLATE LIBRARY</p><h2>导入自定义模板</h2></div><button title="关闭" onClick={() => setTemplateImportOpen(false)}><X size={18} /></button></header>
      <p>可导入包含内联样式的 HTML 模板，或把当前文章保存为模板。为保证公众号兼容性，脚本、外部样式与危险链接会在导入时移除。</p>
      <div className="template-import-sources"><button className="outline-button" onClick={() => templateFileRef.current?.click()}><FileCode2 size={15} />选择 HTML 文件</button><button className="quiet-button" onClick={() => openTemplateImport(true)}><Clipboard size={15} />使用当前文章</button></div>
      <label>模板名称<input value={templateImportName} onChange={(event) => setTemplateImportName(event.target.value)} placeholder="例如：品牌周报" /></label>
      <label>模板说明<input value={templateImportDescription} onChange={(event) => setTemplateImportDescription(event.target.value)} placeholder="例如：数据复盘 · 蓝灰风格" /></label>
      <label>模板 HTML<textarea value={templateImportHtml} onChange={(event) => setTemplateImportHtml(event.target.value)} placeholder="粘贴 HTML，或从上方选择本地 .html 文件" /></label>
      <input ref={templateFileRef} className="template-file-input" type="file" accept=".html,.htm,text/html" onChange={(event) => { loadTemplateFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      <footer><span>模板仅保存于当前设备</span><button className="solid-button" onClick={() => void persistCustomTemplate()}><Plus size={15} />导入模板</button></footer>
    </aside>}
    {brandOpen && <aside className="brand-popover"><header><div><p>BRAND LIBRARY</p><h2>品牌 VI</h2></div><button onClick={() => setBrandOpen(false)}><X size={17} /></button></header><label>品牌名称<input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} /></label><label>专属颜色<input type="color" value={brand.accent} onChange={(event) => setBrand({ ...brand, accent: event.target.value })} /></label><label>标题字体<select value={brand.font} onChange={(event) => setBrand({ ...brand, font: event.target.value as Brand['font'] })}><option value="serif">人文宋体</option><option value="sans">现代无衬线</option><option value="hand">手写标题</option></select></label><button className="solid-button full" onClick={() => { void saveBrand(brand); setBrandOpen(false); notify('品牌 VI 已保存到本机'); }}>保存品牌设置</button></aside>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function safeName(name: string) { return name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 30) || 'layoutgo'; }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
