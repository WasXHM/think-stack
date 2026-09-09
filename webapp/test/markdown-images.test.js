import assert from 'node:assert/strict';
import test from 'node:test';
import { clipboardImages, insertMarkdownImages, validateImageFile, MAX_IMAGE_BYTES } from '../src/utils/markdown-images.js';

test('inserts remote images at caret or replaces selection without losing surrounding text', () => {
  const result = insertMarkdownImages('前文后文', 2, 2, ['/think-stack/api/images/test.png']);
  assert.equal(result.value, '前文\n![截图](/think-stack/api/images/test.png)\n后文');
  assert.equal(result.value.slice(result.caret), '后文');
  assert.equal(insertMarkdownImages('abc', 1, 2, ['/a.png', '/b.png']).value, 'a\n![截图](/a.png)\n\n![截图](/b.png)\nc');
  assert.equal(insertMarkdownImages('', 0, 0, ['/a.png']).value, '![截图](/a.png)');
  assert.throws(() => insertMarkdownImages('abc', 1, 1, ['/a.png'], 5), /长度限制/);
  assert.throws(() => insertMarkdownImages('', 0, 0, ['javascript:alert(1)']), /无效/);
  assert.equal(insertMarkdownImages('', 0, 0, ['https://example.com/a(b).png']).value, '![截图](https://example.com/a%28b%29.png)');
});

test('clipboard text is untouched and image items are not duplicated by the files fallback', () => {
  const file = { type: 'image/png', size: 100 };
  assert.deepEqual(clipboardImages({ items: [{ kind: 'string', type: 'text/plain' }] }), []);
  assert.deepEqual(clipboardImages({ items: [{ kind: 'file', type: file.type, getAsFile: () => file }], files: [file] }), [file]);
  assert.deepEqual(clipboardImages({ files: [file] }), [file]);
  assert.doesNotThrow(() => validateImageFile(file));
  assert.throws(() => validateImageFile({ ...file, size: MAX_IMAGE_BYTES + 1 }), /10 MB/);
  assert.throws(() => validateImageFile({ ...file, type: 'image/svg+xml' }), /PNG/);
});
