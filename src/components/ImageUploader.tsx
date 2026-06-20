import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Upload, X, ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function ImageUploader() {
  const uploadedImages = useAppStore((s) => s.uploadedImages);
  const addImage = useAppStore((s) => s.addImage);
  const removeImage = useAppStore((s) => s.removeImage);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const formData = new FormData();
        formData.append('image', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const json = await res.json();
          const payload = json.data ?? json;
          if (payload) {
            addImage({ id: payload.id ?? uuidv4(), filename: payload.filename ?? file.name, url: payload.url ?? '' });
          }
        } catch {}
      }
    },
    [addImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragging
            ? 'border-[var(--accent-purple)] bg-purple-500/5'
            : 'border-[var(--border)] hover:border-[var(--accent-purple)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        <Upload size={20} className="mb-1 text-[var(--text-secondary)]" />
        <p className="text-xs text-[var(--text-secondary)]">
          拖拽或点击上传图片
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uploadedImages.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)]">
              <img
                src={img.url}
                alt={img.filename}
                className="h-full w-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <p className="truncate text-[10px] text-white">{img.filename}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
