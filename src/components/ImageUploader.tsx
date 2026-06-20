import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Upload, X, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UploadingImage {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: 'uploading' | 'error' | 'success';
  error?: string;
  errorCode?: string;
  url?: string;
}

const CHUNK_SIZE = 2 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function errorCodeToMessage(errorCode: string, error: string): string {
  const map: Record<string, string> = {
    FILE_TOO_LARGE: '文件过大',
    INVALID_TYPE: '文件类型不支持',
    NO_FILE: '未选择文件',
    UPLOAD_ERROR: '上传失败',
    SESSION_NOT_FOUND: '上传会话已失效',
    MERGE_FAILED: '文件处理失败',
    INVALID_CHUNK: '分片数据无效',
  };
  return map[errorCode] || error || '上传失败';
}

export default function ImageUploader() {
  const uploadedImages = useAppStore((s) => s.uploadedImages);
  const addImage = useAppStore((s) => s.addImage);
  const removeImage = useAppStore((s) => s.removeImage);
  const [dragging, setDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = useCallback(
    async (file: File) => {
      const uploadId = uuidv4();
      const initialItem: UploadingImage = {
        id: uploadId,
        filename: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading',
      };
      setUploadingImages((prev) => [...prev, initialItem]);

      const updateProgress = (progress: number, status?: UploadingImage['status'], error?: string, errorCode?: string, url?: string) => {
        setUploadingImages((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, progress, status: status ?? item.status, error, errorCode, url }
              : item
          )
        );
      };

      try {
        if (!file.type.startsWith('image/')) {
          updateProgress(0, 'error', '不支持的文件类型', 'INVALID_TYPE');
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          updateProgress(0, 'error', `文件大小超过限制，最大支持 ${formatSize(MAX_FILE_SIZE)}`, 'FILE_TOO_LARGE');
          return;
        }

        if (file.size <= CHUNK_SIZE) {
          const formData = new FormData();
          formData.append('image', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const json = await res.json();

          if (!json.success || !json.data) {
            updateProgress(0, 'error', json.error || '上传失败', json.errorCode || 'UPLOAD_ERROR');
            return;
          }

          const payload = json.data;
          addImage({ id: payload.id ?? uuidv4(), filename: payload.filename ?? file.name, url: payload.url ?? '' });
          updateProgress(100, 'success', undefined, undefined, payload.url);
          setTimeout(() => {
            setUploadingImages((prev) => prev.filter((item) => item.id !== uploadId));
          }, 800);
          return;
        }

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const initRes = await fetch('/api/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            totalSize: file.size,
            totalChunks,
          }),
        });
        const initJson = await initRes.json();

        if (!initJson.success || !initJson.data) {
          updateProgress(0, 'error', initJson.error || '初始化上传失败', initJson.errorCode || 'UPLOAD_ERROR');
          return;
        }

        const sessionId = initJson.data.uploadId;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const formData = new FormData();
          formData.append('chunk', chunk, `chunk-${i}`);
          formData.append('uploadId', sessionId);
          formData.append('chunkIndex', String(i));

          const chunkRes = await fetch('/api/upload/chunk', { method: 'POST', body: formData });
          const chunkJson = await chunkRes.json();

          if (!chunkJson.success) {
            updateProgress(Math.round(((i + 1) / totalChunks) * 100), 'error', chunkJson.error || '分片上传失败', chunkJson.errorCode || 'UPLOAD_ERROR');
            return;
          }

          const progress = chunkJson.data?.progress ?? Math.round(((i + 1) / totalChunks) * 100);
          updateProgress(progress);
        }

        const completeRes = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: sessionId }),
        });
        const completeJson = await completeRes.json();

        if (!completeJson.success || !completeJson.data) {
          updateProgress(100, 'error', completeJson.error || '文件处理失败', completeJson.errorCode || 'MERGE_FAILED');
          return;
        }

        const payload = completeJson.data;
        addImage({ id: payload.id ?? uuidv4(), filename: payload.filename ?? file.name, url: payload.url ?? '' });
        updateProgress(100, 'success', undefined, undefined, payload.url);
        setTimeout(() => {
          setUploadingImages((prev) => prev.filter((item) => item.id !== uploadId));
        }, 800);
      } catch (err: any) {
        updateProgress(0, 'error', err?.message || '网络错误，请检查网络连接', 'UPLOAD_ERROR');
      }
    },
    [addImage]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        uploadSingleFile(file);
      }
    },
    [uploadSingleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeUploading = (id: string) => {
    setUploadingImages((prev) => prev.filter((item) => item.id !== id));
  };

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
        <p className="text-xs text-[var(--text-secondary)]">拖拽或点击上传图片</p>
        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">支持 jpg/png/gif/webp/bmp，最大 50MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploadingImages.length > 0 && (
        <div className="space-y-2">
          {uploadingImages.map((img) => (
            <div
              key={img.id}
              className={`relative rounded-lg border p-2 ${
                img.status === 'error'
                  ? 'border-red-500/50 bg-red-500/5'
                  : img.status === 'success'
                  ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                  : 'border-[var(--border)] bg-[var(--bg-tertiary)]'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-[var(--bg-secondary)]">
                  {img.status === 'error' ? (
                    <AlertCircle size={18} className="text-red-400" />
                  ) : img.status === 'success' ? (
                    <ImageIcon size={18} className="text-[var(--accent)]" />
                  ) : (
                    <Loader2 size={18} className="animate-spin text-[var(--text-secondary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-[var(--text-primary)]">{img.filename}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{formatSize(img.size)}</p>
                  {img.status === 'error' ? (
                    <p className="mt-1 text-[11px] text-red-400">{img.error}</p>
                  ) : (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                      <div
                        className={`h-full transition-all duration-200 ${
                          img.status === 'success' ? 'bg-[var(--accent)]' : 'bg-[var(--accent-purple)]'
                        }`}
                        style={{ width: `${img.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeUploading(img.id)}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
