import { useCallback, useState } from 'react';
import type { ChangeEvent } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;
const OUTPUT_SIZE = 400;

export function AvatarCropModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPx(null);
    setBusy(false);
    setErr(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setErr('Use PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr('Max 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setAreaPx(areaPixels);
  }, []);

  const save = async () => {
    if (!src || !areaPx) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = await cropImageToBlob(src, areaPx);
      await onSave(blob);
      reset();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border border-slate-800 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Choose & crop avatar</h3>

        {!src ? (
          <label className="block">
            <span className="block text-sm text-slate-400 mb-2">PNG, JPEG, or WebP — max 2 MB.</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onFile}
              className="block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-sky-600 file:text-white hover:file:bg-sky-500"
            />
          </label>
        ) : (
          <>
            <div className="relative w-full h-64 bg-slate-950 rounded-lg overflow-hidden mb-4">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="block mb-4">
              <span className="block text-xs text-slate-400 mb-1">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </>
        )}

        {err && <p className="text-red-400 text-sm mb-3">{err}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-white border border-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!src || !areaPx || busy}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Uploading…' : 'Use this avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function cropImageToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      'image/jpeg',
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}
