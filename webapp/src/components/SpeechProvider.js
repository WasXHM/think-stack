import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createSpeechController } from '../services/speech.js';
import { markdownToSpeech } from '../utils/markdown-speech.js';
import { getLanguage, t } from '../i18n/index.js';

const Context = createContext(null);
export const useSpeech = () => useContext(Context);
export default function SpeechProvider({ children }) {
  const controller = useRef(null);
  const [supported, setSupported] = useState(false);
  const [playback, setPlayback] = useState({ id: null, status: 'idle', error: null });
  useEffect(() => {
    const player = createSpeechController({ synthesis: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance, onChange: setPlayback });
    controller.current = player;
    setSupported(player.supported);
    // Trigger voice discovery; each utterance reads the latest available voice list.
    window.speechSynthesis?.getVoices();
    const leave = () => player.stop();
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); player.dispose(); controller.current = null; };
  }, []);
  const stop = useCallback((id) => controller.current?.stop(id), []);
  const play = useCallback((id, markdown) => {
    try {
      const content = markdownToSpeech(markdown, getLanguage());
      controller.current?.play({ id, ...content });
    } catch {
      controller.current?.stop();
      setPlayback({ id, status: 'error', error: 'content-error' });
    }
  }, []);
  return <Context.Provider value={{ supported, playback, play, stop, pause: () => controller.current?.pause(), resume: () => controller.current?.resume() }}>{children}</Context.Provider>;
}

export function speechErrorMessage(error) {
  if (error === 'empty') return t('这段内容没有可朗读的文字。');
  if (error === 'unsupported') return t('当前浏览器不支持语音朗读。');
  if (error === 'language-unavailable' || error === 'voice-unavailable') return t('当前设备没有可用的对应语言语音，请安装系统语音后重试。');
  if (error === 'not-allowed') return t('浏览器未允许播放，请再次点击朗读。');
  return t('朗读失败，请检查设备语音设置后重试。');
}
