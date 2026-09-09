import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMarkdown } from '../src/utils/markdown-format.js';

test('headings affect current line and replace existing level while preserving caret', () => {
  assert.deepEqual(formatMarkdown('前文\n标题\n后文', 5, 5, 'h1'), { value: '前文\n# 标题\n后文', start: 7, end: 7 });
  assert.deepEqual(formatMarkdown('### 标题', 6, 6, 'h2'), { value: '## 标题', start: 5, end: 5 });
  assert.equal(formatMarkdown('# 标题', 4, 4, 'paragraph').value, '标题');
  assert.equal(formatMarkdown('\n正文', 0, 0, 'h1').value, '# \n正文');
  assert.equal(formatMarkdown('正文\n', 3, 3, 'h6').value, '正文\n###### ');
});

test('multiline commands exclude unselected next line at selection boundary', () => {
  assert.equal(formatMarkdown('甲\n乙\n丙', 0, 4, 'h2').value, '## 甲\n## 乙\n丙');
  assert.equal(formatMarkdown('甲\n乙\n丙', 0, 3, 'orderedList').value, '1. 甲\n2. 乙\n丙');
  assert.equal(formatMarkdown('- [x] 甲\n- 乙', 0, 12, 'orderedList').value, '1. 甲\n2. 乙');
  assert.equal(formatMarkdown('> 甲', 3, 3, 'quote').value, '> 甲');
});

test('inline formatting wraps selection, selects placeholder, and toggles wrappers', () => {
  const bold = formatMarkdown('前加粗后', 1, 3, 'bold');
  assert.deepEqual(bold, { value: '前**加粗**后', start: 3, end: 5 });
  assert.deepEqual(formatMarkdown(bold.value, bold.start, bold.end, 'bold'), { value: '前加粗后', start: 1, end: 3 });
  assert.equal(formatMarkdown('**加粗**', 0, 6, 'bold').value, '加粗');
  const empty = formatMarkdown('', 0, 0, 'italic');
  assert.equal(empty.value.slice(empty.start, empty.end), '斜体文本');
  const nested = formatMarkdown(bold.value, bold.start, bold.end, 'italic');
  assert.equal(nested.value, '前**_加粗_**后');
});

test('links select URL and code fences safely contain existing backticks', () => {
  const link = formatMarkdown('链接', 0, 2, 'link');
  assert.equal(link.value, '[链接](https://)');
  assert.equal(link.value.slice(link.start, link.end), 'https://');
  assert.equal(formatMarkdown('a`b', 0, 3, 'inlineCode').value, '``a`b``');
  assert.match(formatMarkdown('```js\na\n```', 0, 11, 'codeBlock').value, /^````\n/);
  assert.equal(formatMarkdown('前后', 1, 1, 'divider').value, '前\n\n---\n\n后');
  assert.throws(() => formatMarkdown('abc', 0, 3, 'bold', 6), /长度限制/);
});
