import assert from 'node:assert/strict';
import test from 'node:test';

import { isTopicOwner } from '../src/utils/topic-ownership.js';

test('topic ownership requires both a real topic and a logged-in user', () => {
  assert.equal(isTopicOwner(null, null), false);
  assert.equal(isTopicOwner(undefined, undefined), false);
  assert.equal(isTopicOwner({ ownerUsername: 'admin' }, null), false);
  assert.equal(isTopicOwner(null, { username: 'admin' }), false);
  assert.equal(isTopicOwner({ ownerUsername: undefined }, { username: undefined }), false);
  assert.equal(isTopicOwner({ ownerUsername: '' }, { username: '' }), false);
  assert.equal(isTopicOwner({ ownerUsername: 'admin' }, { username: 'reader' }), false);
  assert.equal(isTopicOwner({ ownerUsername: 'admin' }, { username: 'admin' }), true);
});
