import type { Card, XhsTemplateId } from './types';

const clean = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? '';

export function makeCards(title: string, html: string): Card[] {
  const text = clean(html);
  const sentences = text.split(/[。！？]/).map((item) => item.trim()).filter((item) => item.length > 8);
  const snippets = (sentences.length ? sentences : [text]).slice(0, 4);
  return snippets.map((body, index) => ({
    id: crypto.randomUUID(),
    index: index + 1,
    title: index === 0 ? title : ['先记住这一句', '把它做得更简单', '留白，才有新的感觉'][index - 1] ?? title,
    body,
    theme: (['cover', 'quote', 'list', 'memo'] as const)[index % 4]
  }));
}

const cardStyle = (template: XhsTemplateId, accent: string) => {
  const styles: Record<XhsTemplateId, { background: string; text: string; line: string; label: string; accent?: string }> = {
    'xhs-poster': { background: accent, text: '#182a3e', line: '#fff4e8', label: '#fff4e8' },
    'xhs-notebook': { background: '#fff3dd', text: '#3e5244', line: '#94b79a', label: '#5d856b' },
    'xhs-magazine': { background: '#f2efe9', text: '#202020', line: '#ef3b52', label: '#202020' },
    'xhs-soda': { background: '#ffd95d', text: '#234bc2', line: '#ff594b', label: '#234bc2' },
    'xhs-ink': { background: '#171719', text: '#f1d58a', line: '#f1d58a', label: '#f1d58a' },
    'xhs-mist': { background: '#e9e5e0', text: '#4d4d55', line: '#a99192', label: '#817174' },
    'xhs-data': { background: '#eaf4ff', text: '#184b7b', line: '#2f88d6', label: '#2f88d6' },
    'xhs-study': { background: '#f6f4df', text: '#2d4b3c', line: '#90c85b', label: '#4f7f45' },
    'xhs-collage': { background: '#e9d7bf', text: '#563d32', line: '#d05748', label: '#8e604b' },
    'xhs-chat': { background: '#e9f3ff', text: '#264461', line: '#8bb4e1', label: '#4e789e' },
    'xhs-minimal': { background: '#fbfbfa', text: '#1f2522', line: '#1f2522', label: '#6e756f' },
    'xhs-warm': { background: '#f5ddd3', text: '#6b3e35', line: '#c97c68', label: '#a15f4e' }
  };
  return styles[template];
};

export function cardSvg(card: Card, brandName: string, accent: string, template: XhsTemplateId = 'xhs-poster'): string {
  const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char));
  const wrap = (value: string, limit: number) => value.match(new RegExp(`.{1,${limit}}`, 'g'))?.slice(0, 4) ?? [value];
  const style = cardStyle(template, accent);
  const title = (x: number, y: number, size = 62, limit = 11, fill = style.text, line = 72) => wrap(card.title, limit).map((item, index) => `<text x="${x}" y="${y + index * line}" fill="${fill}" font-size="${size}" font-family="serif" font-weight="700">${esc(item)}</text>`).join('');
  const body = (x: number, y: number, size = 24, limit = 20, fill = style.text, line = 38) => wrap(card.body, limit).map((item, index) => `<text x="${x}" y="${y + index * line}" fill="${fill}" font-size="${size}" font-family="sans-serif">${esc(item)}</text>`).join('');
  const label = `<text x="96" y="142" fill="${style.label}" font-size="19" font-family="monospace" letter-spacing="4">${esc(brandName.toUpperCase())}</text>`;
  const footer = `<text x="96" y="1330" fill="${style.label}" font-size="20" font-family="monospace">0${card.index}</text><text x="984" y="1330" fill="${style.label}" text-anchor="end" font-size="20" font-family="monospace">${esc(brandName)}</text>`;
  let layout = '';
  switch (template) {
    case 'xhs-notebook':
      layout = `${label}<line x1="150" y1="0" x2="150" y2="1440" stroke="#d9ad9a" stroke-width="3"/>${title(190, 310, 56, 12)}${[0, 1, 2].map((index) => `<rect x="190" y="${535 + index * 115}" width="28" height="28" fill="#6f9a75"/><text x="204" y="${556 + index * 115}" text-anchor="middle" fill="#fff" font-size="15" font-family="monospace">${index + 1}</text><line x1="240" y1="${566 + index * 115}" x2="924" y2="${566 + index * 115}" stroke="#94b79a" stroke-width="2" opacity=".65"/>`).join('')}${body(245, 550, 23, 18)}${footer}`;
      break;
    case 'xhs-magazine':
      layout = `<text x="96" y="142" fill="#ef3b52" font-size="54" font-family="monospace" font-weight="900">LAYOUT</text><text x="984" y="138" text-anchor="end" fill="#202020" font-size="17" font-family="monospace">ISSUE 0${card.index} / 2026</text><rect x="96" y="175" width="888" height="10" fill="#202020"/><rect x="96" y="197" width="888" height="6" fill="#ef3b52"/><text x="96" y="310" fill="#ef3b52" font-size="19" font-family="monospace">EDITORIAL NOTE</text>${title(96, 410, 66, 10, '#202020', 74)}<line x1="650" y1="680" x2="650" y2="870" stroke="#ef3b52" stroke-width="8"/>${body(680, 715, 23, 15, '#202020')}${footer}`;
      break;
    case 'xhs-soda':
      layout = `<circle cx="886" cy="170" r="96" fill="#ff594b"/><circle cx="755" cy="287" r="55" fill="#fff1c8"/><text x="886" y="192" text-anchor="middle" fill="#fff1c8" font-size="50" font-family="monospace" font-weight="900">!</text>${label}${title(96, 335, 68, 10, '#234bc2', 74)}${[0, 1, 2].map((index) => `<circle cx="122" cy="${610 + index * 92}" r="20" fill="#234bc2"/><text x="122" y="${617 + index * 92}" text-anchor="middle" fill="#ffd95d" font-size="18" font-family="monospace">${index + 1}</text>`).join('')}${body(165, 615, 23, 21, '#234bc2', 92)}${footer}`;
      break;
    case 'xhs-ink':
      layout = `<path d="M70 160V70H160M920 70H1010V160M70 1280V1370H160M920 1370H1010V1280" fill="none" stroke="#f1d58a" stroke-width="3"/>${label}<text x="96" y="310" fill="#f1d58a" font-size="120" font-family="serif">“</text>${title(96, 425, 68, 10, '#f1d58a', 78)}${body(96, 700, 24, 18, '#d7c58e')}${footer}`;
      break;
    case 'xhs-mist':
      layout = `<text x="96" y="142" fill="#817174" font-size="20" font-family="monospace">07 / 22</text><text x="984" y="142" text-anchor="end" fill="#817174" font-size="17" font-family="sans-serif">晴 · 适合慢一点</text><rect x="124" y="250" width="840" height="760" fill="#f4f1ed" stroke="#a99192" stroke-width="2"/><text x="170" y="330" fill="#817174" font-size="18" font-family="monospace">DAILY NOTE</text>${title(170, 470, 58, 11, '#4d4d55', 74)}${body(170, 690, 23, 19, '#4d4d55')}${footer}`;
      break;
    case 'xhs-data':
      layout = `${label}<text x="984" y="142" text-anchor="end" fill="#2f88d6" font-size="34" font-family="monospace" font-weight="900">KEY\nPOINTS</text>${title(96, 325, 58, 12, '#184b7b', 68)}${[0, 1, 2].map((index) => `<rect x="96" y="${540 + index * 135}" width="888" height="100" fill="#fff"/><rect x="96" y="${540 + index * 135}" width="75" height="100" fill="#2f88d6"/><text x="133" y="${600 + index * 135}" text-anchor="middle" fill="#fff" font-size="25" font-family="monospace">0${index + 1}</text>`).join('')}${body(205, 595, 23, 23, '#184b7b', 135)}${footer}`;
      break;
    case 'xhs-study':
      layout = `${label}<rect x="810" y="91" width="126" height="26" fill="#d8ef8c" transform="rotate(-5 810 91)"/>${title(96, 340, 64, 11, '#2d4b3c', 72)}${[0, 1, 2].map((index) => `<text x="100" y="${605 + index * 120}" fill="#4f7f45" font-size="33" font-family="monospace" font-weight="900">${index + 1}</text><line x1="160" y1="${620 + index * 120}" x2="950" y2="${620 + index * 120}" stroke="#9eb489" stroke-width="2" stroke-dasharray="8 9"/>`).join('')}${body(170, 600, 24, 21, '#2d4b3c', 120)}${footer}`;
      break;
    case 'xhs-collage':
      layout = `<rect x="380" y="82" width="310" height="54" fill="#f7eddc" transform="rotate(-4 380 82)"/><text x="535" y="116" text-anchor="middle" fill="#8e604b" font-size="18" font-family="monospace">COLLECT</text><rect x="114" y="285" width="760" height="650" fill="#f8ebd9" transform="rotate(-3 114 285)"/><rect x="150" y="320" width="760" height="650" fill="none" stroke="#d05748" stroke-width="16" transform="rotate(-3 150 320)"/>${label}${title(185, 500, 58, 12, '#563d32', 69)}${body(185, 720, 22, 18, '#563d32')}<rect x="578" y="1010" width="344" height="122" fill="#fff6e8" transform="rotate(2 578 1010)"/><text x="610" y="1068" fill="#563d32" font-size="18" font-family="sans-serif">made for keeping</text>${footer}`;
      break;
    case 'xhs-chat':
      layout = `${label}${title(96, 310, 58, 12, '#264461', 69)}${[0, 1, 2].map((index) => `<rect x="${index % 2 ? 350 : 96}" y="${500 + index * 145}" width="${index % 2 ? 634 : 600}" height="105" rx="28" fill="${index % 2 ? '#8bb4e1' : '#fff'}"/>`).join('')}${body(125, 558, 22, 20, '#264461', 145)}${footer}`;
      break;
    case 'xhs-minimal':
      layout = `<text x="96" y="142" fill="#6e756f" font-size="20" font-family="monospace">NOTE / 0${card.index}</text><line x1="96" y1="184" x2="984" y2="184" stroke="#1f2522" stroke-width="2"/>${title(96, 500, 68, 11, '#1f2522', 77)}${body(96, 790, 24, 19, '#59615b')}${footer}`;
      break;
    case 'xhs-warm':
      layout = `<rect x="96" y="95" width="170" height="46" fill="#c97c68"/><text x="181" y="126" text-anchor="middle" fill="#f8f0cf" font-size="18" font-family="serif">日 常 小 签</text><text x="984" y="126" text-anchor="end" fill="#a15f4e" font-size="18" font-family="monospace">JULY / 22</text><rect x="142" y="315" width="796" height="650" fill="#f8ebdf" stroke="#c97c68" stroke-width="2"/><circle cx="540" cy="315" r="43" fill="#f8f0cf"/><text x="540" y="330" text-anchor="middle" fill="#c97c68" font-size="35" font-family="serif">✦</text>${title(190, 515, 55, 12, '#6b3e35', 67)}${body(190, 725, 22, 20, '#6b3e35')}<text x="540" y="1100" text-anchor="middle" fill="#a15f4e" font-size="19" font-family="serif">把今天收好</text>${footer}`;
      break;
    case 'xhs-poster':
    default:
      layout = `<circle cx="885" cy="1050" r="165" fill="#f2bd64"/><circle cx="885" cy="1050" r="125" fill="none" stroke="#3152a2" stroke-width="28"/>${label}<rect x="916" y="96" width="68" height="68" fill="#f2bd64"/><text x="950" y="140" text-anchor="middle" fill="#3152a2" font-size="25" font-family="monospace">0${card.index}</text>${title(96, 375, 70, 10, '#fff7ed', 78)}${body(96, 650, 24, 20, '#fff7ed')}<text x="96" y="1170" fill="#f2bd64" font-size="37" font-family="monospace" font-weight="900">READ</text><text x="96" y="1212" fill="#f2bd64" font-size="37" font-family="monospace" font-weight="900">THIS</text>${footer}`;
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440"><rect width="1080" height="1440" fill="${style.background}"/>${layout}</svg>`;
}
