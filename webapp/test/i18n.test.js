import assert from 'node:assert/strict';
import test from 'node:test';
import en from '../src/i18n/en.js';
import zh from '../src/i18n/zh.js';
import { t, setLanguage } from '../src/i18n/index.js';
import { entryDraftKey } from '../src/utils/entry-drafts.js';

test('Chinese and English catalogs have matching keys and placeholders', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const key of Object.keys(zh)) {
    assert.ok(en[key].trim(), key);
    assert.deepEqual((en[key].match(/\{\w+\}/g) ?? []).sort(), (zh[key].match(/\{\w+\}/g) ?? []).sort(), key);
    assert.ok(!/[\u3400-\u9fff]/.test(en[key]), key);
  }
});
test('switching language translates UI while preserving interpolated document content and separating drafts', () => {
  setLanguage('zh');
  const chineseDraft = entryDraftKey('topic', 'answer');
  assert.equal(t('登录'), '登录');
  setLanguage('en');
  assert.equal(t('登录'), 'Log in');
  assert.equal(t('编辑 {p0}', { p0: '中文标题' }), 'Edit 中文标题');
  assert.notEqual(entryDraftKey('topic', 'answer'), chineseDraft);
  setLanguage('zh');
});
