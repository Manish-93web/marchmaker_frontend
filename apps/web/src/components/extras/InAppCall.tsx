import { Button } from '@marchmaker/ui';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useVoiceCall } from '../../lib/rtc';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Voice call inside the app. Shows ringing, connected (with timer, mute, end) and a quick way to report. */
export function InAppCall({ introId, enabled }: { introId: string; enabled: boolean }) {
  const { t } = useTranslation();
  const call = useVoiceCall(introId, enabled);
  const supported = typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  if (!supported) return <p className="text-sm text-muted">{t('x.rtc.unsupported')}</p>;
  const errText = call.error ? t(`x.rtc.errors.${call.error}`, { defaultValue: t('x.rtc.errors.GENERIC') }) : null;
  return (
    <div className="space-y-2" aria-live="polite">
      <audio ref={call.attachAudio} autoPlay />
      {call.phase === 'idle' && (
        <Button onClick={() => void call.start()}>
          <Mic className="mr-2 h-4 w-4" aria-hidden />
          {t('x.rtc.start')}
        </Button>
      )}
      {call.phase === 'calling' && (
        <>
          <p role="status">{t('x.rtc.ringing')}</p>
          <Button variant="outline" onClick={() => void call.end()}>
            {t('x.rtc.cancel')}
          </Button>
        </>
      )}
      {call.phase === 'incoming' && (
        <div role="alertdialog" aria-label={t('x.rtc.incoming')} className="rounded-card border-2 border-accent bg-surface-2 p-4">
          <p className="font-medium">{t('x.rtc.incoming')}</p>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => void call.accept()}>{t('x.rtc.accept')}</Button>
            <Button variant="outline" onClick={() => void call.decline()}>
              {t('x.rtc.decline')}
            </Button>
          </div>
        </div>
      )}
      {call.phase === 'connecting' && <p role="status">{t('x.rtc.connecting')}</p>}
      {call.phase === 'connected' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg" aria-label={t('x.rtc.timer', { time: mmss(call.seconds) })}>
            {mmss(call.seconds)}
          </span>
          <Button variant="outline" aria-pressed={call.muted} onClick={() => call.setMuted(!call.muted)}>
            {call.muted ? <MicOff className="mr-2 h-4 w-4" aria-hidden /> : <Mic className="mr-2 h-4 w-4" aria-hidden />}
            {call.muted ? t('x.rtc.unmute') : t('x.rtc.mute')}
          </Button>
          <Button variant="destructive" onClick={() => void call.end()}>
            <PhoneOff className="mr-2 h-4 w-4" aria-hidden />
            {t('x.rtc.end')}
          </Button>
          <Link className="text-sm underline" to={`/introductions/${introId}?report=1`}>
            {t('x.rtc.report')}
          </Link>
        </div>
      )}
      {call.phase === 'ended' && (
        <div className="flex items-center gap-3">
          <p role="status">{t('x.rtc.ended')}</p>
          <Button variant="ghost" onClick={call.reset}>
            {t('x.rtc.done')}
          </Button>
        </div>
      )}
      {errText && (
        <p role="alert" className="text-sm text-danger">
          {errText}
        </p>
      )}
    </div>
  );
}
