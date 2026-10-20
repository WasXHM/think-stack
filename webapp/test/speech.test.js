import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpeechController } from '../src/services/speech.js';

function setup() {
  const spoken = [];
  const states = [];
  let voices = [];
  let canceled = 0;
  const synthesis = {
    getVoices: () => voices,
    cancel: () => { canceled += 1; },
    speak: (item) => spoken.push(item),
    pause() {}, resume() {},
  };
  class Utterance { constructor(text) { this.text = text; } }
  const player = createSpeechController({ synthesis, Utterance, onChange: (state) => states.push(state) });
  return { player, synthesis, spoken, states, setVoices: (list) => { voices = list; }, cancelCount: () => canceled };
}

test('one active reader, stale end/error events cannot continue a replaced reading', () => {
  const { player, spoken } = setup();
  player.play({ id: 'question', text: 'First paragraph.\nSecond paragraph.', language: 'en' });
  const previous = spoken[0];
  player.play({ id: 'answer', text: '中文回答。', language: 'zh' });
  previous.onend(); previous.onerror({ error: 'interrupted' });
  assert.equal(spoken.length, 2);
  assert.equal(player.getState().id, 'answer');
  assert.equal(spoken[1].lang, 'zh-CN');
  spoken[1].onend();
  assert.equal(player.getState().status, 'idle');
});

test('pause at chunk boundary, resume, late-loaded voice selection and stop', () => {
  const { player, spoken, setVoices, cancelCount } = setup();
  player.play({ id: 'note', text: 'First.\nSecond.', language: 'en' });
  assert.equal(spoken[0].voice, null);
  player.pause();
  spoken[0].onend();
  assert.equal(player.getState().status, 'paused');
  assert.equal(spoken.length, 1);
  const voice = { lang: 'en-US', name: 'English' };
  setVoices([voice]);
  player.resume();
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].voice, voice);
  player.stop('another-entry');
  assert.equal(player.getState().status, 'playing');
  player.stop('note');
  spoken[1].onend();
  assert.equal(player.getState().status, 'idle');
  assert.ok(cancelCount() >= 2);
});

test('errors terminate the queue and disposal stops playback without updating unmounted UI', () => {
  const { player, spoken, states } = setup();
  player.play({ id: 'note', text: 'First.\nSecond.', language: 'zh' });
  spoken[0].onerror({ error: 'language-unavailable' });
  assert.equal(player.getState().error, 'language-unavailable');
  spoken[0].onend();
  assert.equal(spoken.length, 1);
  player.play({ id: 'note', text: 'Again.', language: 'en' });
  const count = states.length;
  player.dispose();
  spoken[1].onend(); spoken[1].onerror({ error: 'canceled' });
  assert.equal(states.length, count);
});

test('unsupported browser and empty narration fail clearly', () => {
  const unsupported = createSpeechController({});
  assert.equal(unsupported.supported, false);
  unsupported.play({ id: 'x', text: 'Text', language: 'en' });
  assert.equal(unsupported.getState().error, 'unsupported');
  const { player, spoken } = setup();
  player.play({ id: 'x', text: '', language: 'en' });
  assert.equal(player.getState().error, 'empty');
  assert.equal(spoken.length, 0);
});
