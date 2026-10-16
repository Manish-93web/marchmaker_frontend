import { Banner, Button } from '@marchmaker/ui';
import { Camera, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  /** Called when the member prefers to choose a file instead. */
  onPickFile: (file: File) => void;
  disabled?: boolean;
}

/**
 * Live selfie capture with an oval guide. Falls back to a plain file picker when the
 * camera is unavailable or access is denied, so nobody is blocked.
 */
export function CameraCapture({ onCapture, onPickFile, disabled }: CameraCaptureProps) {
  const { t } = useTranslation();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError(null);
    if (!supported) {
      setError(t('v.selfie.unsupported'));
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      stream.current = s;
      setActive(true);
      // The element exists after the state update; attach on the next frame.
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => undefined);
        }
      });
    } catch {
      setError(t('v.selfie.denied'));
    }
  };

  const capture = () => {
    const el = video.current;
    if (!el || !el.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    canvas.toBlob(
      (b) => {
        if (b) {
          stop();
          onCapture(b);
        }
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('v.selfie.guide')}</p>
      {error && <Banner tone="warning">{error}</Banner>}

      {active && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-hero bg-black">
          <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" aria-label="Camera preview" />
          {/* Face guide: dimmed surround with a clear oval. */}
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <mask id="oval">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="190" rx="95" ry="125" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgba(0,0,0,0.55)" mask="url(#oval)" />
            <ellipse cx="150" cy="190" rx="95" ry="125" fill="none" stroke="#F2A33A" strokeWidth="3" strokeDasharray="8 6" />
          </svg>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button type="button" onClick={() => void start()} disabled={disabled}>
            <Camera className="h-4 w-4" aria-hidden />
            {t('v.selfie.start')}
          </Button>
        ) : (
          <>
            <Button type="button" onClick={capture}>
              {t('v.selfie.capture')}
            </Button>
            <Button type="button" variant="ghost" onClick={stop}>
              {t('v.selfie.stop')}
            </Button>
          </>
        )}
        <input
          ref={picker}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.target.value = '';
          }}
        />
        <Button type="button" variant="outline" disabled={disabled} onClick={() => picker.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden />
          {t('v.selfie.uploadInstead')}
        </Button>
      </div>
    </div>
  );
}
