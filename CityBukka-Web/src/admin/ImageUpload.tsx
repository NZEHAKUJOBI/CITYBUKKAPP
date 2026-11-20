import { ImageIcon, CloudUpload } from 'lucide-react';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { errorMessage, resolveMediaUrl, uploadImage, validateImageFile } from './adminApi';
import { cx, styles as s } from './ui';

/**
 * Pick / drop an image (JPEG, PNG, WebP ≤ 5 MB), upload it to /api/admin/uploads and
 * hand back the stored URL. The URL can also be typed or pasted directly.
 */
export function ImageUpload({ label, value, onChange, onBusyChange }: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);
  useEffect(() => setBroken(false), [value]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setLocalPreview(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null);
    setProgress(0);
    onBusyChange?.(true);
    try {
      const { url } = await uploadImage(file, setProgress);
      onChange(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProgress(null);
      setLocalPreview(null);
      onBusyChange?.(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const previewSrc = localPreview ?? resolveMediaUrl(value);

  return (
    <div className={cx(s.field, s.full)}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <div className={s.upload}>
        <div className={s.preview}>
          {previewSrc && !broken
            ? <img src={previewSrc} alt="" className={s.preview} style={{ border: 0 }} onError={() => setBroken(true)} />
            : (
              <span className={s.noPhoto}>
                <ImageIcon size={26} aria-hidden />
                <span>{value && broken ? 'Image not found' : 'No photo yet'}</span>
              </span>
            )}
        </div>
        <div className={s.uploadCol}>
          <div
            className={cx(s.drop, dragging && s.dropActive)}
            role="button"
            tabIndex={0}
            aria-label={`Upload ${label.toLowerCase()}`}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <CloudUpload size={20} aria-hidden />
            <span>{progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : 'Drop an image or click to choose'}</span>
            <span className={s.hint}>JPEG, PNG or WebP · max 5 MB</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            data-testid={`${id}-file`}
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          {progress !== null && (
            <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div className={s.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <input
            id={id}
            className={s.input}
            type="text"
            inputMode="url"
            placeholder="…or paste an image URL"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
          />
          {error && <span className={s.fieldError} role="alert">{error}</span>}
        </div>
      </div>
    </div>
  );
}
