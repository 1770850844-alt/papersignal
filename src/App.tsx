import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Check, CheckCircle2, CircleAlert, CircleDashed, Clipboard, Download, FileCode2, KeyRound, LoaderCircle, Palette, Plus, PlugZap, Sparkles, Trash2, X } from 'lucide-react';
import { RichEditor } from './components/RichEditor';
import { PhonePreview } from './components/PhonePreview';
import { generateWithAi, deleteApiKey, hasApiKey, saveApiKey, testAiConnection } from './lib/ai';
import { cardSvg, makeCards } from './lib/card';
import { getProvider, providers } from './lib/providers';
import { deleteDraft, loadAiServices, loadBrand, loadDrafts, saveAiServices, saveBrand, saveDraft } from './lib/storage';
import { getTemplate, templates } from './lib/templates';
import type { AiService, Brand, Card, Draft, Platform, PreviewMode, TemplateId } from './lib/types';
import './styles.css';

const initialTemplate = getTemplate('editorial');
const newDraft = (): Draft => ({ id: crypto.randomUUID(), title: initialTemplate.title, template: initialTemplate.id, content: initialTemplate.content, updatedAt: new Date().toISOString() });
const getText = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
const newAiService = (providerId = 'openai'): AiService => {
  const provider = getProvider(providerId);
  return { id: crypto.randomUUID(), providerId, name: provider.name, baseUrl: provider.baseUrl, model: provider.model, createdAt: new Date().toISOString(), lastTestStatus: 'untested' };
};

export default function App() {
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [brand, setBrand] = useState<Brand>({ name: 'LayoutGo', accent: '#3152A2', font: 'serif' });
  const [mode, setMode] = useState<PreviewMode>('article');
  const [platform, setPlatform] = useState<Platform>('wechat');
  const [cards, setCards] = useState<Card[]>(() => makeCards(initialTemplate.title, initialTemplate.content));
  const [caption, setCaption] = useState('');
  const [drawer, setDrawer] = useState<'brand' | 'ai' | null>(null);
  const [toast, setToast] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiServices, setAiServices] = useState<AiService[]>([]);
  const [activeAiServiceId, setActiveAiServiceId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AiService>(newAiService);
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const saveTimer = useRef<number>();

  const wordCount = useMemo(() => getText(draft.content).length, [draft.content]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };

  useEffect(() => { Promise.all([loadDrafts(), loadBrand(), loadAiServices()]).then(([savedDrafts, savedBrand, savedAi]) => { setDrafts(savedDrafts); setBrand(savedBrand); if (savedDrafts[0]) setDraft(savedDrafts[0]); setAiServices(savedAi.services); setActiveAiServiceId(savedAi.activeServiceId); const active = savedAi.services.find((service) => service.id === savedAi.activeServiceId) ?? savedAi.services[0]; if (active) setAiConfig(active); }).catch(() => notify('本地数据库初始化失败，已切换临时存储。')); }, []);
  useEffect(() => { if (drawer !== 'ai') return; hasApiKey(aiConfig.id).then(setHasKey).catch(() => setHasKey(false)); }, [drawer, aiConfig.id]);
  useEffect(() => { window.clearTimeout(saveTimer.current); saveTimer.current = window.setTimeout(() => { const next = { ...draft, updatedAt: new Date().toISOString() }; saveDraft(next).then(() => setDrafts((items) => [next, ...items.filter((item) => item.id !== next.id)])); }, 650); return () => window.clearTimeout(saveTimer.current); }, [draft.id, draft.title, draft.template, draft.content]);

  const chooseTemplate = (template: TemplateId) => { const item = getTemplate(template); setDraft((current) => ({ ...current, title: item.title, template, content: item.content })); setCards(makeCards(item.title, item.content)); setMode('article'); };
  const changeContent = (content: string) => setDraft((current) => ({ ...current, content, title: getText(content).split(/[。！？\n]/)[0]?.slice(0, 30) || current.title }));
  const newBlankDraft = () => { const next = newDraft(); setDraft(next); setCards(makeCards(next.title, next.content)); notify('已新建一篇草稿'); };
  const openDraft = (item: Draft) => { setDraft(item); setCards(makeCards(item.title, item.content)); setMode('article'); notify(`已打开“${item.title}”`); };
  const removeDraft = async (item: Draft) => {
    if (!window.confirm(`删除草稿“${item.title}”？此操作无法恢复。`)) return;
    try {
      await deleteDraft(item.id);
      const remaining = drafts.filter((draftItem) => draftItem.id !== item.id);
      setDrafts(remaining);
      if (draft.id === item.id) {
        const next = remaining[0] ?? newDraft();
        setDraft(next); setCards(makeCards(next.title, next.content)); setMode('article');
      }
      notify('草稿已删除');
    } catch (error) { notify(error instanceof Error ? error.message : '删除草稿失败'); }
  };
  const copyHtml = async () => { const styled = `<section style="font-family:serif;color:#27322e;line-height:1.9">${draft.content}</section>`; await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([styled], { type: 'text/html' }), 'text/plain': new Blob([getText(draft.content)], { type: 'text/plain' }) })]); notify('已复制兼容公众号的富文本'); };
  const copyCaption = async () => { await navigator.clipboard.writeText(caption || `✨ ${draft.title}\n\n#内容创作 #知识卡片 #自我成长`); notify('小红书正文已复制'); };
  const exportHtml = () => { const file = new Blob([`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${draft.title}</title><article>${draft.content}</article></html>`], { type: 'text/html' }); download(file, `${safeName(draft.title)}.html`); };
  const exportCards = async () => { const zip = new JSZip(); cards.forEach((card) => zip.file(`${String(card.index).padStart(2, '0')}-${safeName(card.title)}.svg`, cardSvg(card, brand.name, brand.accent))); download(await zip.generateAsync({ type: 'blob' }), `${safeName(draft.title)}-小红书图集.zip`); notify('图集已打包下载'); };
  const activeAiService = aiServices.find((service) => service.id === activeAiServiceId) ?? null;
  const generateCards = async () => {
    if (!activeAiService || activeAiService.lastTestStatus !== 'success') { setDrawer('ai'); notify('请先测试并保存一个可用的 AI 服务'); return; }
    setIsGenerating(true);
    try {
      const output = await generateWithAi(activeAiService, `将以下文章整理成 4 张小红书知识卡片。仅返回 JSON：{"caption":"带 Emoji 的正文和 4 个标签","cards":[{"title":"不超过16字","body":"不超过60字"}]}。文章：${getText(draft.content)}`);
      const parsed = JSON.parse(output) as { caption?: string; cards?: Array<{ title: string; body: string }> };
      if (!parsed.cards?.length) throw new Error('返回内容不完整');
      setCards(parsed.cards.slice(0, 6).map((card, index) => ({ id: crypto.randomUUID(), index: index + 1, title: card.title, body: card.body, theme: (['cover', 'quote', 'list', 'memo'] as const)[index % 4] })));
      setCaption(parsed.caption ?? ''); setMode('cards'); setPlatform('xiaohongshu'); notify('已生成小红书图文初稿');
    } catch (error) { notify(error instanceof Error ? `AI 生成失败：${error.message}` : 'AI 生成失败'); } finally { setIsGenerating(false); }
  };
  const expandArticle = async () => {
    if (!activeAiService || activeAiService.lastTestStatus !== 'success') { setDrawer('ai'); notify('请先测试并保存一个可用的 AI 服务'); return; }
    setIsGenerating(true);
    try { const output = await generateWithAi(activeAiService, `将以下小红书文案扩写成公众号文章。只返回安全的 HTML 片段，使用 p、h2、blockquote、ul、li 标签，不使用 markdown。文案：${caption || getText(draft.content)}`); changeContent(output); setMode('article'); setPlatform('wechat'); notify('已生成公众号文章初稿'); }
    catch (error) { notify(error instanceof Error ? `AI 扩写失败：${error.message}` : 'AI 扩写失败'); } finally { setIsGenerating(false); }
  };
  const selectProvider = (providerId: string) => { const provider = getProvider(providerId); setAiConfig((current) => ({ ...current, providerId, baseUrl: provider.baseUrl, model: provider.model, name: current.name === getProvider(current.providerId).name ? provider.name : current.name, lastTestStatus: 'untested', lastTestedAt: undefined, lastTestMessage: undefined })); };
  const activateAiService = async (service: AiService) => { setAiConfig(service); setActiveAiServiceId(service.id); setApiKey(''); await saveAiServices({ services: aiServices, activeServiceId: service.id }); };
  const markTest = (service: AiService, status: AiService['lastTestStatus'], message: string) => {
    const tested = { ...service, lastTestStatus: status, lastTestMessage: message, lastTestedAt: new Date().toISOString() };
    setAiConfig(tested);
    return tested;
  };
  const testCurrentService = async () => {
    if (!aiConfig.name.trim() || !aiConfig.baseUrl.trim() || !aiConfig.model.trim()) { notify('请填写服务名称、Base URL 和模型名'); return null; }
    setIsTestingAi(true);
    try { const message = await testAiConnection(aiConfig, apiKey); const tested = markTest(aiConfig, 'success', message); notify('AI 服务通路测试成功'); return tested; }
    catch (error) { const message = error instanceof Error ? error.message : '通路测试失败'; markTest(aiConfig, 'failed', message); notify(`通路测试失败：${message}`); return null; }
    finally { setIsTestingAi(false); }
  };
  const persistAi = async () => {
    if (!apiKey.trim() && !hasKey) { notify('请先填写 API Key，再测试连接'); return; }
    setIsSavingAi(true);
    try {
      const tested = await testCurrentService();
      if (!tested) return;
      if (apiKey.trim()) await saveApiKey(tested.id, apiKey.trim());
      const exists = aiServices.some((service) => service.id === tested.id);
      const services = exists ? aiServices.map((service) => service.id === tested.id ? tested : service) : [tested, ...aiServices];
      await saveAiServices({ services, activeServiceId: tested.id });
      setAiServices(services); setActiveAiServiceId(tested.id); setAiConfig(tested); setApiKey(''); setHasKey(true);
      notify(`“${tested.name}” 已测试并保存`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存 AI 服务失败');
    } finally { setIsSavingAi(false); }
  };
  const removeAiService = async (service: AiService) => {
    if (!window.confirm(`删除“${service.name}”及其本机 API Key？`)) return;
    try {
      await deleteApiKey(service.id);
      const services = aiServices.filter((item) => item.id !== service.id);
      const nextActive = activeAiServiceId === service.id ? services[0]?.id ?? null : activeAiServiceId;
      await saveAiServices({ services, activeServiceId: nextActive });
      setAiServices(services); setActiveAiServiceId(nextActive); setApiKey(''); setHasKey(false); setAiConfig(services.find((item) => item.id === nextActive) ?? newAiService());
      notify('AI 服务已删除');
    } catch (error) { notify(error instanceof Error ? error.message : '删除失败'); }
  };

  return <main className="app-shell" style={{ '--brand-accent': brand.accent } as React.CSSProperties}>
    <header className="topbar"><a className="brand" href="#top"><img src="/layoutgo-logo.png" alt="LayoutGo" /><small>LOCAL EDITION</small></a><div className="save-status"><Check size={13} /> 本地草稿已保存 <span>/</span> {wordCount} 字</div><div className="top-actions"><button className="icon-action" title="新建草稿" onClick={newBlankDraft}><Plus size={17} /></button><button className="outline-action" onClick={() => setDrawer('brand')}><Palette size={15} />品牌 VI</button><button className="outline-action" onClick={exportHtml}><FileCode2 size={15} />导出 HTML</button><button className="primary-action" onClick={copyHtml}><Clipboard size={15} />复制公众号正文</button></div></header>
    <div className="workspace">
      <aside className="templates-panel"><div className="panel-heading"><p>TEMPLATE LIBRARY</p><h1>今天写点<br />好看的。</h1><span>LAYOUTGO / LOCAL</span></div><nav className="template-list" aria-label="文章模板">{templates.map((template) => <button key={template.id} onClick={() => chooseTemplate(template.id)} className={`template-card ${draft.template === template.id ? 'active' : ''}`}><i>{template.index}</i><span><b>{template.title}</b><small>{template.description}</small></span><em /></button>)}</nav><section className="draft-list"><div><p>本地草稿</p><button onClick={newBlankDraft} title="新建草稿"><Plus size={15} /></button></div><div className="draft-scroll">{drafts.map((item) => <div className={`draft-row ${item.id === draft.id ? 'current' : ''}`} key={item.id}><button className="draft-open" onClick={() => openDraft(item)} title={`打开 ${item.title}`}><span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</small></button><button className="draft-remove" onClick={() => void removeDraft(item)} title={`删除 ${item.title}`} aria-label={`删除草稿 ${item.title}`}><Trash2 size={13} /></button></div>)}</div></section></aside>
      <section className="editor-panel"><div className="editor-meta"><span>正在编辑</span><i /> <b>{getTemplate(draft.template).title}</b></div><section className="ai-workbench"><div className="ai-heading"><span><Sparkles size={15} /> AI 内容转换</span><small>使用你自己的 API Key</small></div><div className="ai-buttons"><button className="ai-primary" disabled={isGenerating} onClick={generateCards}>{isGenerating ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} 长文变小红书卡片</button><button className="ai-secondary" disabled={isGenerating} onClick={expandArticle}>笔记扩写公众号文章 ↗</button><button className="ai-key" onClick={() => setDrawer('ai')}><KeyRound size={15} /> AI 设置</button></div><textarea aria-label="小红书正文" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="生成后显示小红书 Emoji 正文和标签，也可直接编辑或粘贴笔记后扩写。" /><div className="caption-tools"><span>小红书正文</span><button onClick={copyCaption}><Clipboard size={14} />复制正文</button></div></section><RichEditor html={draft.content} onChange={changeContent} /></section>
      <aside className="preview-panel"><header className="preview-heading"><div><p>LIVE CANVAS</p><h2>发布预览</h2></div><div><div className="segmented"><button className={mode === 'article' ? 'selected' : ''} onClick={() => setMode('article')}>文章</button><button className={mode === 'cards' ? 'selected' : ''} onClick={() => setMode('cards')}>卡片</button></div><div className="segmented compact"><button className={platform === 'wechat' ? 'selected' : ''} onClick={() => setPlatform('wechat')}>公众号</button><button className={platform === 'xiaohongshu' ? 'selected' : ''} onClick={() => setPlatform('xiaohongshu')}>小红书</button></div></div></header><div className="preview-stage"><span>LIVE / SAFE AREA</span><PhonePreview mode={mode} platform={platform} template={draft.template} html={draft.content} cards={cards} brand={brand} onCard={() => notify('卡片已选中，可下载全部图集')} /></div><footer className="preview-footer"><span /><p>{mode === 'article' ? '公众号模式：复制后保留文字层级、引用与图片。' : '小红书模式：下载图集后手动上传，再复制正文。'}</p>{mode === 'cards' && <button onClick={exportCards}><Download size={15} />下载图集</button>}</footer></aside>
    </div>
    {drawer === 'brand' && <aside className="drawer"><header><div><p>BRAND LIBRARY</p><h2>品牌 VI</h2></div><button onClick={() => setDrawer(null)}><X /></button></header><label>品牌名称<input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} /></label><label>专属颜色<input type="color" value={brand.accent} onChange={(event) => setBrand({ ...brand, accent: event.target.value })} /></label><label>标题字体<select value={brand.font} onChange={(event) => setBrand({ ...brand, font: event.target.value as Brand['font'] })}><option value="serif">人文宋体</option><option value="sans">现代无衬线</option><option value="hand">手写标题</option></select></label><button className="primary-action wide" onClick={() => { saveBrand(brand); setDrawer(null); notify('品牌 VI 已保存到本机'); }}>保存品牌设置</button></aside>}
    {drawer === 'ai' && <aside className="drawer ai-drawer"><header><div><p>YOUR AI, YOUR KEY</p><h2>AI 服务设置</h2></div><button onClick={() => setDrawer(null)}><X /></button></header><section className="service-library" aria-label="已保存 AI 服务"><div className="service-library-head"><div><span>已保存服务</span><small>{aiServices.length} 个</small></div><button className="mini-action" onClick={() => { setAiConfig(newAiService()); setApiKey(''); setHasKey(false); }}><Plus size={13} />新建</button></div>{aiServices.length ? <div className="service-list">{aiServices.map((service) => <div className={`service-row ${service.id === activeAiServiceId ? 'active' : ''}`} key={service.id}><button className="service-select" onClick={() => void activateAiService(service)}><span className={`service-status ${service.lastTestStatus}`}>{service.lastTestStatus === 'success' ? <CheckCircle2 size={14} /> : service.lastTestStatus === 'failed' ? <CircleAlert size={14} /> : <CircleDashed size={14} />}</span><span><b>{service.name}</b><small>{service.model} {service.id === activeAiServiceId && '· 当前使用'}</small></span></button><button className="service-remove" title={`删除 ${service.name}`} onClick={() => void removeAiService(service)}><Trash2 size={14} /></button></div>)}</div> : <p className="empty-services">还没有保存的服务。填写下方信息并测试通过后，会出现在这里。</p>}</section><div className="service-form-title"><span>{aiServices.some((service) => service.id === aiConfig.id) ? '编辑当前服务' : '新建 AI 服务'}</span>{aiConfig.lastTestStatus === 'success' && <small className="test-success"><CheckCircle2 size={12} />已验证可用</small>}{aiConfig.lastTestStatus === 'failed' && <small className="test-failed"><CircleAlert size={12} />测试未通过</small>}</div><label>服务名称<input placeholder="例如：我的 DeepSeek" value={aiConfig.name} onChange={(event) => setAiConfig({ ...aiConfig, name: event.target.value, lastTestStatus: 'untested', lastTestedAt: undefined, lastTestMessage: undefined })} /></label><label>服务商<select value={aiConfig.providerId} onChange={(event) => selectProvider(event.target.value)}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label>Base URL<input placeholder="https://api.example.com/v1" value={aiConfig.baseUrl} onChange={(event) => setAiConfig({ ...aiConfig, baseUrl: event.target.value.replace(/\/$/, ''), lastTestStatus: 'untested', lastTestedAt: undefined, lastTestMessage: undefined })} /></label><label>模型名<input placeholder="模型名称" value={aiConfig.model} onChange={(event) => setAiConfig({ ...aiConfig, model: event.target.value, lastTestStatus: 'untested', lastTestedAt: undefined, lastTestMessage: undefined })} /></label><label>API Key<input type="password" autoComplete="off" placeholder={hasKey ? '已保存在系统钥匙串，输入可替换' : '粘贴你的 API Key'} value={apiKey} onChange={(event) => setApiKey(event.target.value)} /></label>{aiConfig.lastTestMessage && <p className={`connection-result ${aiConfig.lastTestStatus}`}>{aiConfig.lastTestStatus === 'success' ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}<span>{aiConfig.lastTestMessage}</span></p>}<p className="security-note">API Key 仅保存在当前设备的系统钥匙串。保存前会先真实请求模型，测试不通过的服务不会写入服务列表。</p><div className="drawer-actions ai-actions"><button className="outline-action" disabled={isTestingAi || isSavingAi} onClick={() => void testCurrentService()}>{isTestingAi ? <LoaderCircle className="spin" size={14} /> : <PlugZap size={14} />}测试通路</button><button className="primary-action" disabled={isTestingAi || isSavingAi} onClick={() => void persistAi()}>{isSavingAi ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}测试并保存</button></div></aside>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function safeName(name: string) { return name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 30) || 'layoutgo'; }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
