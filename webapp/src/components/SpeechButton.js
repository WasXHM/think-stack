import React, { useEffect } from 'react';
import { Button } from './Button.js';
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
      <Button type="button" size="small" disabled={!supported} title={!supported ? t('当前浏览器不支持语音朗读。') : undefined} aria-label={`${action}：${label}`} onClick={playing ? pause : paused ? resume : () => play(id, markdown)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></svg>
        {action}
      </Button>
      {playing || paused ? <Button type="button" size="small" aria-label={`${t('停止朗读')}：${label}`} onClick={() => stop(id)}>{t('停止')}</Button> : null}
    </div>
    {active && playback.error ? <span className="speech-controls__error" role="alert">{speechErrorMessage(playback.error)}</span> : null}
    <span className="sr-only" role="status">{playing ? t('正在朗读') : paused ? t('朗读已暂停') : ''}</span>
  </div>;
}
