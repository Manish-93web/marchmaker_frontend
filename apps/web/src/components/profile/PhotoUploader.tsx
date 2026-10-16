import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Banner, Badge, Button } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { DEFAULTS, PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from '@marchmaker/shared';
import { api, ApiRequestError } from '../../lib/api';
import { PHOTOS_KEY, PROFILE_KEY, type PhotoRow } from '../../lib/profile';

interface UploadTicket {
  id: string;
  upload: { url: string; method: 'PUT'; headers: Record<string, string> };
}

/** Crops the selected image client-side so only the framed region is ever uploaded. */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(area.width, area.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.9),
  );
}

function putWithProgress(ticket: UploadTicket, blob: Blob, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', ticket.upload.url);
    for (const [k, v] of Object.entries(ticket.upload.headers)) {
      // The browser sets Content-Length itself; it is part of the signature already.
      if (k.toLowerCase() !== 'content-length') xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(blob);
  });
}

function Tile({
  photo,
  locked,
  onPrimary,
  onRemove,
}: {
  photo: PhotoRow;
  locked: boolean;
  onPrimary: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const statusKey = photo.status === 'processing' ? 'processing' : photo.status;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative overflow-hidden rounded-card border border-border bg-surface ${isDragging ? 'z-10 shadow-lg' : ''}`}
    >
      <div className="aspect-[3/4] bg-surface-2">
        {photo.md || photo.sm ? (
          <img src={photo.md ?? photo.sm ?? ''} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">{t('p.photos.processing')}</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 p-2">
        <Badge tone={photo.status === 'rejected' ? 'danger' : photo.status === 'approved' ? 'verified' : 'neutral'}>
          {t(`p.photos.${statusKey}`)}
        </Badge>
        {photo.isPrimary && (
          <Badge tone="accent">
            <Star className="h-3 w-3" aria-hidden /> {t('p.photos.primary')}
          </Badge>
        )}
      </div>
      {photo.status === 'rejected' && photo.rejectionReason && (
        <p className="px-2 pb-2 text-xs text-danger">
          {t(`p.photos.reasons.${photo.rejectionReason}`, t('p.photos.rejected'))}
        </p>
      )}
      {!locked && (
        <div className="flex items-center gap-1 border-t border-border p-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 cursor-grab items-center justify-center rounded-pill hover:bg-surface-2"
            aria-label={`${t('p.photos.reorderHint')}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          {!photo.isPrimary && photo.status !== 'rejected' && (
            <Button type="button" size="sm" variant="ghost" onClick={onPrimary}>
              {t('p.photos.makePrimary')}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={onRemove} aria-label={t('p.photos.remove')}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </li>
  );
}

export function PhotoUploader({ locked }: { locked: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [src, setSrc] = useState<string | null>(null);

  const photos = useQuery({
    queryKey: PHOTOS_KEY,
    queryFn: () => api<{ items: PhotoRow[] }>('/photos'),
    // Poll while any photo is still being processed; signed links also expire after 5 minutes.
    refetchInterval: (q) => (q.state.data?.items.some((p) => p.status === 'processing') ? 2000 : 4 * 60_000),
  });
  const items = photos.data?.items ?? [];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: PHOTOS_KEY });
    void qc.invalidateQueries({ queryKey: PROFILE_KEY });
  };

  const current = queue[0];
  useEffect(() => {
    if (!current) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(current);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [current]);

  const accept = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const picked: File[] = [];
      for (const f of Array.from(files)) {
        if (!(PHOTO_CONTENT_TYPES as readonly string[]).includes(f.type)) {
          setError(t('p.photos.badType'));
          continue;
        }
        if (f.size > PHOTO_MAX_BYTES * 3) {
          setError(t('p.photos.tooBig'));
          continue;
        }
        picked.push(f);
      }
      const room = DEFAULTS.maxPhotos - items.length;
      if (picked.length > room) setError(t('p.photos.limit'));
      setQueue(picked.slice(0, Math.max(0, room)));
    },
    [items.length, t],
  );

  const upload = useMutation({
    mutationFn: async (blob: Blob) => {
      setProgress(0);
      const ticket = await api<UploadTicket>('/photos/upload-url', {
        method: 'POST',
        body: { contentType: 'image/jpeg', sizeBytes: blob.size },
      });
      await putWithProgress(ticket, blob, setProgress);
      await api(`/photos/${ticket.id}/confirm`, { method: 'POST' });
    },
    onSuccess: () => {
      setQueue((q) => q.slice(1));
      refresh();
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('p.photos.uploadFailed')),
    onSettled: () => setProgress(null),
  });

  const primary = useMutation({
    mutationFn: (id: string) => api(`/photos/${id}/primary`, { method: 'PATCH' }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/photos/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  const reorder = useMutation({
    mutationFn: (order: string[]) => api('/photos/order', { method: 'PUT', body: { order } }),
    onSettled: refresh,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = items.map((p) => p.id);
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    qc.setQueryData(PHOTOS_KEY, { items: next.map((id, i) => ({ ...items.find((p) => p.id === id)!, order: i })) });
    reorder.mutate(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted">{t('p.photos.intro')}</p>
      {error && <Banner tone="danger">{error}</Banner>}

      {!locked && items.length < DEFAULTS.maxPhotos && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            accept(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-3 rounded-hero border-2 border-dashed p-8 text-center ${
            dragOver ? 'border-primary bg-surface-2' : 'border-border'
          }`}
        >
          <ImagePlus className="h-8 w-8 text-muted" aria-hidden />
          <p className="text-sm text-muted">{t('p.photos.drop')}</p>
          <input
            ref={input}
            type="file"
            accept={PHOTO_CONTENT_TYPES.join(',')}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) accept(e.target.files);
              e.target.value = '';
            }}
          />
          <Button type="button" onClick={() => input.current?.click()}>
            {t('p.photos.add')}
          </Button>
        </div>
      )}

      {photos.isLoading && <p aria-busy="true">{t('common.loading')}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((p) => p.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={t('p.photos.title')}>
            {items.map((p) => (
              <Tile
                key={p.id}
                photo={p}
                locked={locked}
                onPrimary={() => primary.mutate(p.id)}
                onRemove={() => remove.mutate(p.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-muted">{t('p.photos.privacy')}</p>

      {src && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-label={t('p.photos.cropTitle')} className="w-full max-w-md space-y-4 rounded-hero bg-surface p-4">
            <h2 className="font-display text-xl text-primary">{t('p.photos.cropTitle')}</h2>
            <div className="relative h-80 overflow-hidden rounded-card bg-black">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, px) => setArea(px)}
              />
            </div>
            <label className="block text-sm">
              {t('p.photos.zoom')}
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            {progress !== null && <progress className="w-full" value={progress} max={100} aria-label="Upload progress" />}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setQueue((q) => q.slice(1))} disabled={upload.isPending}>
                {t('common.cancel')}
              </Button>
              <Button
                loading={upload.isPending}
                disabled={!area}
                onClick={async () => {
                  if (!src || !area) return;
                  setError(null);
                  try {
                    upload.mutate(await cropToBlob(src, area));
                  } catch {
                    setError(t('p.photos.uploadFailed'));
                  }
                }}
              >
                {t('p.photos.cropUse')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
