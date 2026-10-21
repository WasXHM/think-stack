import React, { useEffect } from 'react';
import { useSpeech, speechErrorMessage } from './SpeechProvider.js';
import { t } from '../i18n/index.js';

export default function SpeechButton({ id, markdown, label }) {
  const { supported, playback, play, stop, pause, resume } = useSpeech();
  const active = playback.id === id;
  const playing = active && playback.status === 'playing';
  const paused = active && playback.status === 'paused';
  useEffect(() => () => stop(id), [id, markdown, stop]);
  const action = playing ? t('暂停朗读') : paused ? t('继续朗读') : t('朗读');
  return <div className="speech-controls">
    <div className="speech-controls__buttons">
      <button className="icon-button" type="button" disabled={!supported} title={!supported ? t('当前浏览器不支持语音朗读。') : action} aria-label={`${action}：${label}`} onClick={playing ? pause : paused ? resume : () => play(id, markdown)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {playing ? <path d="M16 8v8M20 8v8" /> : <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />}
        </svg>
      </button>
      {playing || paused ? <button className="icon-button" type="button" title={t('停止朗读')} aria-label={`${t('停止朗读')}：${label}`} onClick={() => stop(id)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
      </button> : null}
    </div>
    {active && playback.error ? <span className="speech-controls__error" role="alert">{speechErrorMessage(playback.error)}</span> : null}
    <span className="sr-only" role="status">{playing ? t('正在朗读') : paused ? t('朗读已暂停') : ''}</span>
  </div>;
}
