import { splitSpeechText } from '../utils/markdown-speech.js';

export function createSpeechController({ synthesis, Utterance, onChange = () => {} }) {
  let generation = 0;
  let active = null;
  let utterance = null;
  let state = { id: null, status: 'idle', error: null };
  let disposed = false;
  const supported = Boolean(synthesis && Utterance);
  const emit = (next) => { state = next; if (!disposed) onChange(next); };
  function stop(id) {
    if (id && state.id !== id) return;
    generation += 1;
    active = null;
    utterance = null;
    synthesis?.cancel();
    emit({ id: null, status: 'idle', error: null });
  }
  function fail(id, error) {
    generation += 1;
    active = null;
    utterance = null;
    synthesis?.cancel();
    emit({ id, status: 'error', error });
  }
  function next(token) {
    if (disposed || token !== generation || !active) return;
    if (active.paused) return;
    if (active.index >= active.chunks.length) {
      active = null; utterance = null;
      emit({ id: null, status: 'idle', error: null });
      return;
    }
    const { id, language } = active;
    const item = new Utterance(active.chunks[active.index++]);
    utterance = item; // Retain a reference until the browser finishes this chunk.
    item.lang = language === 'en' ? 'en-US' : 'zh-CN';
    item.rate = 1;
    const voices = synthesis.getVoices?.() ?? [];
    item.voice = voices.find((voice) => voice.lang.toLowerCase() === item.lang.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${language}-`))
      ?? voices.find((voice) => voice.lang.toLowerCase() === language)
      ?? null;
    item.onend = () => {
      if (token !== generation || disposed) return;
      utterance = null;
      next(token);
    };
    item.onerror = (event) => {
      if (token !== generation || disposed) return;
      fail(id, event.error ?? 'synthesis-failed');
    };
    try { synthesis.speak(item); }
    catch { fail(id, 'synthesis-failed'); }
  }
  return {
    supported,
    getState: () => state,
    play({ id, text, language }) {
      if (disposed) return;
      stop();
      if (!supported) { fail(id, 'unsupported'); return; }
      const chunks = splitSpeechText(text);
      if (!chunks.length) { fail(id, 'empty'); return; }
      active = { id, chunks, language, index: 0, paused: false };
      emit({ id, status: 'playing', error: null });
      // Some engines retain their paused flag after cancel().
      synthesis.resume();
      next(generation);
    },
    pause() {
      if (!active || state.status !== 'playing') return;
      active.paused = true;
      synthesis.pause();
      emit({ ...state, status: 'paused' });
    },
    resume() {
      if (!active || state.status !== 'paused') return;
      active.paused = false;
      synthesis.resume();
      emit({ ...state, status: 'playing' });
      if (!utterance) next(generation);
    },
    stop,
    dispose() { disposed = true; stop(); },
  };
}
