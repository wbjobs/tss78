import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CheckCircle2, XCircle, Clock, Zap, Loader2, Copy, Trash2, ChevronDown, ChevronUp, Layers } from 'lucide-react';

export default function BatchResultTable() {
  const batchResults = useAppStore((s) => s.batchResults);
  const isBatchExecuting = useAppStore((s) => s.isBatchExecuting);
  const batchProgress = useAppStore((s) => s.batchProgress);
  const clearBatchResults = useAppStore((s) => s.clearBatchResults);
  const uploadedImages = useAppStore((s) => s.uploadedImages);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const imageMap = useMemo(() => {
    const map: Record<string, { url: string; filename: string }> = {};
    for (const img of uploadedImages) {
      map[img.id] = { url: img.url, filename: img.filename };
      map[img.url] = { url: img.url, filename: img.filename };
    }
    return map;
  }, [uploadedImages]);

  const variableNames = useMemo(() => {
    if (!batchResults || batchResults.results.length === 0) return [];
    const names = new Set<string>();
    for (const r of batchResults.results) {
      if (r.variables) {
        for (const k of Object.keys(r.variables)) names.add(k);
      }
    }
    return Array.from(names);
  }, [batchResults]);

  if (!batchResults && !isBatchExecuting) return null;

  if (isBatchExecuting && !batchResults) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[var(--accent-purple)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">批量测试运行中...</p>
          </div>
        </div>
        <div className="p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin text-[var(--accent-purple)]" />
          <div className="w-64 h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div
              className="h-full bg-[var(--accent-purple)] transition-all"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">正在执行多组测试，请耐心等待...</p>
        </div>
      </div>
    );
  }

  if (!batchResults) return null;

  const handleCopy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {}
  };

  const avgTokens = batchResults.total > 0
    ? Math.round(batchResults.results.reduce((s, r) => s + (r.tokensUsed ?? 0), 0) / batchResults.total)
    : 0;
  const avgDuration = batchResults.total > 0
    ? Math.round(batchResults.results.reduce((s, r) => s + (r.duration ?? 0), 0) / batchResults.total)
    : 0;

  return (
    <div className="h-full flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-[var(--accent-purple)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">批量测试结果</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                共 {batchResults.total} 组
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-green-400">
                <CheckCircle2 size={10} /> {batchResults.succeeded}
              </span>
              {batchResults.failed > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
                  <XCircle size={10} /> {batchResults.failed}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                <Clock size={10} /> {batchResults.totalDuration}ms
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                <Zap size={10} /> 平均 {avgTokens} tok
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[var(--text-secondary)]">
                平均 {avgDuration}ms
              </span>
            </div>
          </div>
          <button
            onClick={clearBatchResults}
            className="flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={12} /> 清空
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)]">
            <tr className="border-b border-[var(--border)]">
              <th className="w-12 px-3 py-2 text-left font-medium text-[var(--text-secondary)]">#</th>
              {variableNames.map((name) => (
                <th key={name} className="px-3 py-2 text-left font-medium text-[var(--accent-amber)]">
                  {name}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium text-[var(--accent-purple)]">图片</th>
              <th className="w-56 px-3 py-2 text-left font-medium text-[var(--text-secondary)]">模型输出</th>
              <th className="w-20 px-3 py-2 text-left font-medium text-[var(--text-secondary)]">状态</th>
              <th className="w-16 px-3 py-2 text-right font-medium text-[var(--text-secondary)]">Tokens</th>
              <th className="w-16 px-3 py-2 text-right font-medium text-[var(--text-secondary)]">耗时</th>
            </tr>
          </thead>
          <tbody>
            {batchResults.results.map((result) => (
              <ExpandedRow
                key={result.combinationId}
                result={result}
                variableNames={variableNames}
                imageMap={imageMap}
                expanded={expanded[result.index] ?? false}
                onToggle={() => setExpanded((s) => ({ ...s, [result.index]: !s[result.index] }))}
                onCopy={(text) => handleCopy(result.index, text)}
                copied={copiedIdx === result.index}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpandedRow({
  result,
  variableNames,
  imageMap,
  expanded,
  onToggle,
  onCopy,
  copied,
}: {
  result: any;
  variableNames: string[];
  imageMap: Record<string, { url: string; filename: string }>;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const images = result.images ?? [];
  const truncated = (result.result ?? '').slice(0, 80);
  const hasMore = (result.result ?? '').length > 80;

  return (
    <>
      <tr
        key={result.index + '-main'}
        onClick={onToggle}
        className={`border-b border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--bg-tertiary)]/50 ${
          expanded ? 'bg-[var(--bg-tertiary)]/30' : ''
        }`}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            <span className="text-[var(--text-secondary)]">{result.index + 1}</span>
          </div>
        </td>
        {variableNames.map((name) => (
          <td key={name} className="px-3 py-2">
            <span className="inline-block max-w-[120px] truncate rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">
              {result.variables?.[name] ?? '-'}
            </span>
          </td>
        ))}
        <td className="px-3 py-2">
          {images.length === 0 ? (
            <span className="text-[var(--text-secondary)]">-</span>
          ) : (
            <div className="flex gap-1">
              {images.slice(0, 3).map((img: string, i: number) => {
                const info = imageMap[img];
                return (
                  <div key={i} className="h-8 w-8 overflow-hidden rounded border border-[var(--border)]">
                    {info ? (
                      <img src={info.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-tertiary)] text-[9px] text-[var(--text-secondary)]">
                        图{i + 1}
                      </div>
                    )}
                  </div>
                );
              })}
              {images.length > 3 && (
                <span className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-secondary)]">
                  +{images.length - 3}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="max-w-0 px-3 py-2">
          <div className="flex items-start gap-1">
            <p className="flex-1 truncate text-[11px] leading-relaxed text-[var(--text-secondary)]">
              {truncated || (result.error ?? '')}
              {hasMore && <span className="text-[var(--accent)]"> ...</span>}
            </p>
          </div>
        </td>
        <td className="px-3 py-2">
          {result.success ? (
            <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-green-400">
              <CheckCircle2 size={10} /> 成功
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
              <XCircle size={10} /> 失败
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right font-mono text-[10px] text-[var(--text-secondary)]">
          {result.tokensUsed ?? 0}
        </td>
        <td className="px-3 py-2 text-right font-mono text-[10px] text-[var(--text-secondary)]">
          {result.duration ?? 0}ms
        </td>
      </tr>
      {expanded && result.result && (
        <tr key={result.index + '-expanded'} className="bg-[var(--bg-tertiary)]/30">
          <td colSpan={7 + variableNames.length} className="px-6 py-3">
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  完整模型输出
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(result.result ?? '');
                  }}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Copy size={10} />
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">
                {result.result}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
