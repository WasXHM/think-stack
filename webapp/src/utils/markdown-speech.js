import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { t } from '../i18n/index.js';

const parser = unified().use(remarkParse).use(remarkGfm);
const codeLanguages = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', python: 'Python', java: 'Java', c: 'C', cpp: 'C++', 'c++': 'C++', cs: 'C sharp', csharp: 'C sharp',
  html: 'HTML', css: 'CSS', json: 'JSON', sql: 'SQL', sh: 'Shell', bash: 'Shell', shell: 'Shell',
  go: 'Go', rust: 'Rust', rs: 'Rust', swift: 'Swift', kotlin: 'Kotlin', yaml: 'YAML', yml: 'YAML', xml: 'XML', ruby: 'Ruby', php: 'PHP',
};

function prose(node) {
  if (['code', 'inlineCode', 'html', 'definition', 'footnoteDefinition', 'footnoteReference'].includes(node.type)) return '';
  if (node.type === 'text') return node.value;
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? '';
  return (node.children ?? []).map(prose).join(' ');
}

export function speechLanguage(text, fallback = 'zh') {
  // Examine prose rather than code: Chinese text with English identifiers still uses a Chinese voice.
  if (/[\u3400-\u9fff]/u.test(text)) return 'zh';
  if (/[a-z]/i.test(text)) return 'en';
  return fallback === 'en' ? 'en' : 'zh';
}

export function markdownToSpeech(markdown, fallback = 'zh') {
  const tree = parser.parse(String(markdown ?? ''));
  const language = speechLanguage(prose(tree), fallback);
  const say = (key, values = {}) => t(key, values, language);
  function read(node) {
    const children = () => (node.children ?? []).map(read).join('');
    switch (node.type) {
      case 'text': return node.value;
      case 'code': {
        const lines = node.value.trim() ? node.value.trim().split(/\r?\n/).length : 0;
        const tag = String(node.lang ?? '').toLowerCase();
        const name = Object.hasOwn(codeLanguages, tag) ? codeLanguages[tag] : null;
        return `\n${name ? say('此处为 {language} 代码片段，共 {lines} 行，略过代码内容。', { language: name, lines }) : say('此处为代码片段，共 {lines} 行，略过代码内容。', { lines })}\n`;
      }
      case 'inlineCode': return ` ${say('此处为行内代码。')} `;
      case 'image': case 'imageReference': return node.alt ? ` ${say('图片：{description}。', { description: node.alt })} ` : '';
      case 'link': return node.children?.length === 1 && node.children[0].value === node.url ? say('链接。') : children();
      case 'html': case 'definition': case 'footnoteDefinition': case 'footnoteReference': return '';
      case 'thematicBreak': case 'break': return '\n';
      case 'table': return `\n${say('以下为表格内容。')}\n${children()}\n`;
      case 'tableRow': return `${(node.children ?? []).map(read).join('； ')}\n`;
      case 'listItem': return `${node.checked === true ? say('已完成。') : node.checked === false ? say('未完成。') : ''}${children()}\n`;
      case 'root': case 'paragraph': case 'heading': case 'blockquote': case 'list': return `${children()}\n`;
      default: return children();
    }
  }
  const text = read(tree).replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, language };
}

export function splitSpeechText(text, maximum = 220) {
  maximum = Number.isFinite(maximum) ? Math.max(2, Math.floor(maximum)) : 220;
  const chunks = [];
  for (const paragraph of String(text).split(/\n+/)) {
    let remaining = paragraph.trim();
    while (remaining.length > maximum) {
      const prefix = remaining.slice(0, maximum);
      let cut = Math.max(prefix.lastIndexOf('。'), prefix.lastIndexOf('！'), prefix.lastIndexOf('？'), prefix.lastIndexOf('. '), prefix.lastIndexOf('! '), prefix.lastIndexOf('? '));
      if (cut >= maximum / 3) cut += 1;
      else { cut = prefix.lastIndexOf(' '); if (cut < maximum / 3) cut = maximum; }
      // Avoid splitting a UTF-16 surrogate pair.
      if (/[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut -= 1;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) chunks.push(remaining);
  }
  return chunks;
}
