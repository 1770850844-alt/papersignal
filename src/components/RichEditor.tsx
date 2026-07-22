import { Bold, ImagePlus, Italic, Link2, List, Palette, Quote, RemoveFormatting, Table2, Underline } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';

interface Props { html: string; onChange: (html: string) => void; }

const actions = [
  ['bold', Bold, '加粗'], ['italic', Italic, '倾斜'], ['underline', Underline, '下划线'],
  ['insertUnorderedList', List, '项目列表'], ['formatBlock', Quote, '引用'], ['removeFormat', RemoveFormatting, '清除样式']
] as const;

const symbols = ['•', '✓', '→', '—', '“', '”', '「', '」', '★', '♥', '※', '℃', '©', '®'];

export function RichEditor({ html, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rangeRef = useRef<Range | null>(null);

  // Keep contentEditable unmanaged while typing, otherwise React resets the caret on every keystroke.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html;
  }, [html]);

  const rememberRange = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !ref.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
    rangeRef.current = selection.getRangeAt(0).cloneRange();
  };
  const restoreRange = () => {
    ref.current?.focus();
    if (!rangeRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(rangeRef.current);
  };
  const emit = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const run = (command: string, value?: string) => {
    restoreRange();
    document.execCommand(command, false, value ?? (command === 'formatBlock' ? 'h2' : undefined));
    rememberRange();
    emit();
  };
  const insertLink = () => {
    const value = window.prompt('请输入链接地址', 'https://');
    if (!value) return;
    const href = /^(https?:|mailto:|#)/i.test(value) ? value : `https://${value}`;
    run('createLink', href);
  };
  const insertTable = () => {
    const rows = Number(window.prompt('表格行数（1-8）', '2'));
    const columns = Number(window.prompt('表格列数（1-6）', '2'));
    if (!Number.isInteger(rows) || !Number.isInteger(columns)) return;
    const validRows = Math.min(Math.max(rows, 1), 8);
    const validColumns = Math.min(Math.max(columns, 1), 6);
    const cells = Array.from({ length: validRows }, (_, row) => `<tr>${Array.from({ length: validColumns }, (_, column) => row === 0 ? `<th>表头 ${column + 1}</th>` : `<td>内容 ${row}-${column + 1}</td>`).join('')}</tr>`).join('');
    run('insertHTML', `<table class="editor-table"><tbody>${cells}</tbody></table><p><br></p>`);
  };
  const insertOrderedList = (style: string) => {
    restoreRange();
    document.execCommand('insertOrderedList');
    const node = window.getSelection()?.anchorNode;
    const list = node instanceof Element ? node.closest('ol') : node?.parentElement?.closest('ol');
    if (list) list.style.listStyleType = style;
    rememberRange();
    emit();
  };
  const addImageFromUrl = () => {
    const url = window.prompt('请输入图片 URL（支持 https 地址）');
    if (url) run('insertImage', url);
  };
  const addLocalImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { window.alert('请选择图片文件。'); return; }
    if (file.size > 5 * 1024 * 1024) { window.alert('单张图片请控制在 5MB 以内。'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') run('insertImage', reader.result); };
    reader.readAsDataURL(file);
  };
  const onControlMouseDown = (event: MouseEvent) => { event.preventDefault(); rememberRange(); };

  return <section className="editor-surface" aria-label="文章编辑器">
    <div className="toolbar" role="toolbar" aria-label="富文本工具栏">
      <select className="toolbar-select font-select" title="字体（仅系统或开源字体）" aria-label="字体" defaultValue="" onMouseDown={rememberRange} onChange={(event) => { if (event.target.value) run('fontName', event.target.value); event.currentTarget.value = ''; }}>
        <option value="" disabled>字体</option><option value="Noto Serif SC, serif">开源宋体</option><option value="system-ui, sans-serif">系统无衬线</option><option value="DM Mono, monospace">开源等宽</option>
      </select>
      <select className="toolbar-select size-select" title="字号" aria-label="字号" defaultValue="" onMouseDown={rememberRange} onChange={(event) => { if (event.target.value) run('fontSize', event.target.value); event.currentTarget.value = ''; }}>
        <option value="" disabled>字号</option><option value="2">小号</option><option value="3">正文</option><option value="4">大号</option><option value="5">小标题</option><option value="6">标题</option>
      </select>
      <label className="color-control" title="文字颜色"><Palette size={15} /><input aria-label="文字颜色" type="color" defaultValue="#27322e" onMouseDown={rememberRange} onChange={(event) => run('foreColor', event.target.value)} /></label>
      <i />
      {actions.map(([command, Icon, label]) => <button key={label} type="button" title={label} aria-label={label} onMouseDown={(event) => { onControlMouseDown(event); run(command); }}><Icon size={16} strokeWidth={1.8} /></button>)}
      <i />
      <select className="toolbar-select list-select" title="有序编号样式" aria-label="有序编号样式" defaultValue="" onMouseDown={rememberRange} onChange={(event) => { if (event.target.value) insertOrderedList(event.target.value); event.currentTarget.value = ''; }}>
        <option value="" disabled>编号</option><option value="decimal">1, 2, 3</option><option value="lower-alpha">a, b, c</option><option value="upper-roman">I, II, III</option><option value="cjk-ideographic">一、二、三</option>
      </select>
      <button type="button" title="插入超链接" aria-label="插入超链接" onMouseDown={(event) => { onControlMouseDown(event); insertLink(); }}><Link2 size={16} /></button>
      <button type="button" title="插入表格" aria-label="插入表格" onMouseDown={(event) => { onControlMouseDown(event); insertTable(); }}><Table2 size={16} /></button>
      <button type="button" title="插入本地图片" aria-label="插入本地图片" onMouseDown={(event) => { onControlMouseDown(event); fileInputRef.current?.click(); }}><ImagePlus size={16} /></button>
      <button type="button" title="通过链接插入图片" aria-label="通过链接插入图片" onMouseDown={(event) => { onControlMouseDown(event); addImageFromUrl(); }}><Link2 size={15} /></button>
      <select className="toolbar-select symbol-select" title="插入特殊符号" aria-label="插入特殊符号" defaultValue="" onMouseDown={rememberRange} onChange={(event) => { if (event.target.value) run('insertText', event.target.value); event.currentTarget.value = ''; }}>
        <option value="" disabled>符号</option>{symbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
      </select>
      <input ref={fileInputRef} className="image-file-input" type="file" accept="image/*" onChange={(event) => { addLocalImage(event.target.files?.[0]); event.currentTarget.value = ''; }} />
    </div>
    <div ref={ref} className="rich-editor" contentEditable suppressContentEditableWarning onMouseUp={rememberRange} onKeyUp={rememberRange} onInput={(event) => { rememberRange(); onChange(event.currentTarget.innerHTML); }} />
  </section>;
}
