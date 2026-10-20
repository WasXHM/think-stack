import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownToSpeech, splitSpeechText } from '../src/utils/markdown-speech.js';

test('Markdown prose keeps visible text while replacing fenced, indented and inline code', () => {
  const markdown = '# 原始问题\n\n**重点**与[说明](https://example.com/private)包含 `secret()`。\n\n```js\nconst secret = 1;\nsecret++;\n```\n\n    private_code()\n\n![流程图](https://example.com/image.png)';
  const result = markdownToSpeech(markdown, 'en');
  assert.equal(result.language, 'zh');
  assert.match(result.text, /原始问题/);
  assert.match(result.text, /重点与说明/);
  assert.match(result.text, /此处为行内代码/);
  assert.match(result.text, /JavaScript 代码片段，共 2 行/);
  assert.match(result.text, /代码片段，共 1 行/);
  assert.match(result.text, /图片：流程图/);
  assert.doesNotMatch(result.text, /secret|private_code|https:|```|\*\*|!\[/);
});

test('English narration, GFM tables, task lists, references and unknown code languages', () => {
  const markdown = 'Read **this** [guide][ref].\n\n[ref]: https://example.com\n\n- [x] Done\n- [ ] Pending\n\n| Name | Value |\n| --- | --- |\n| Item | One |\n\n~~~madeup\nnever_read_this\n~~~';
  const { text, language } = markdownToSpeech(markdown, 'zh');
  assert.equal(language, 'en');
  assert.match(text, /Read this guide/);
  assert.match(text, /Completed\.Done/);
  assert.match(text, /Not completed\.Pending/);
  assert.match(text, /following is a table/);
  assert.match(text, /Name； Value/);
  assert.match(text, /A code snippet with 1 lines/);
  assert.doesNotMatch(text, /never_read_this|madeup|https:|\[x\]|\|/);
});

test('empty content and code-only blocks use safe descriptions, never executable HTML', () => {
  assert.equal(markdownToSpeech('---\n\n<!-- hidden -->').text, '');
  assert.equal(markdownToSpeech('```python\nprint("中文")\n```', 'en').language, 'en');
  assert.doesNotMatch(markdownToSpeech('<script>alert("secret")</script>').text, /alert|secret/);
  assert.equal(markdownToSpeech('<https://example.com>').text, 'Link.');
  assert.doesNotMatch(markdownToSpeech('```constructor\ncode\n```', 'en').text, /function|Object|native/);
});

test('long narration is chunked without lost text or broken surrogate pairs', () => {
  const input = '这是中文内容。'.repeat(100) + '😀'.repeat(150);
  const chunks = splitSpeechText(input);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 220));
  assert.equal(chunks.join(''), input);
  assert.ok(chunks.every((chunk) => !/[\uD800-\uDBFF]$/.test(chunk) && !/^[\uDC00-\uDFFF]/.test(chunk)));
  assert.deepEqual(splitSpeechText('   \n\n '), []);
});
