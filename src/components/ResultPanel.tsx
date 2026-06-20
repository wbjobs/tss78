import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/store/useAppStore';
import { Clock, Zap, Cpu } from 'lucide-react';

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse p-4">
      <div className="h-4 w-3/4 rounded bg-[var(--bg-tertiary)]" />
      <div className="h-4 w-1/2 rounded bg-[var(--bg-tertiary)]" />
      <div className="h-4 w-5/6 rounded bg-[var(--bg-tertiary)]" />
      <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
    </div>
  );
}

function SingleResult({ record }: { record: { result: string; tokensUsed: number; duration: number; model: string } }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-code:text-[var(--accent)] prose-pre:bg-[var(--bg-tertiary)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{record.result}</ReactMarkdown>
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <Zap size={12} className="text-[var(--accent)]" />
          {record.tokensUsed} tokens
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} className="text-amber-400" />
          {record.duration}ms
        </span>
        <span className="flex items-center gap-1">
          <Cpu size={12} className="text-purple-400" />
          {record.model}
        </span>
      </div>
    </div>
  );
}

export default function ResultPanel() {
  const currentResult = useAppStore((s) => s.currentResult);
  const abResult = useAppStore((s) => s.abResult);
  const isExecuting = useAppStore((s) => s.isExecuting);

  if (isExecuting) {
    return (
      <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <Skeleton />
      </div>
    );
  }

  if (!currentResult && !abResult) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <p className="text-sm text-[var(--text-secondary)]">运行模板以查看结果</p>
      </div>
    );
  }

  if (abResult && currentResult) {
    return (
      <div className="grid h-full grid-cols-2 gap-2">
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--accent)]">A</div>
          <SingleResult record={currentResult} />
        </div>
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold text-amber-400">B</div>
          <SingleResult record={abResult} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <SingleResult record={currentResult!} />
    </div>
  );
}
