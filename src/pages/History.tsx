import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Search, Clock, Zap, Cpu, ChevronDown, ChevronUp, ArrowRightToLine } from 'lucide-react';
import type { ExecutionRecord } from '@/store/useAppStore';

export default function History() {
  const executionHistory = useAppStore((s) => s.executionHistory);
  const loadHistory = useAppStore((s) => s.loadHistory);
  const setTemplate = useAppStore((s) => s.setTemplate);

  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered = executionHistory.filter((r) => {
    const matchSearch =
      !search ||
      r.templateContent.toLowerCase().includes(search.toLowerCase()) ||
      r.result.toLowerCase().includes(search.toLowerCase());
    const matchModel = !modelFilter || r.model === modelFilter;
    return matchSearch && matchModel;
  });

  const usedModels = [...new Set(executionHistory.map((r) => r.model))];

  const handleLoad = (r: ExecutionRecord) => {
    setTemplate(r.templateContent);
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-xl font-bold text-[var(--text-primary)]">执行历史</h1>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索内容..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          <option value="">全部模型</option>
          {usedModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
          <p className="text-sm">暂无执行记录</p>
        </div>
      )}

      <div className="relative space-y-0">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--border)]" />
        {filtered.map((r) => {
          const isExpanded = expanded === r.id;
          return (
            <div key={r.id} className="relative pl-10 pb-4">
              <div className="absolute left-4 top-3 h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)] bg-[var(--bg-primary)]" />
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] transition-colors hover:border-[var(--accent)]/30">
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Cpu size={12} className="text-purple-400" />
                        {r.model}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={12} className="text-[var(--accent)]" />
                        {r.tokensUsed} tokens
                      </span>
                      <span>{r.duration}ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLoad(r)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
                      >
                        <ArrowRightToLine size={12} />
                        加载到编辑器
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : r.id)}
                        className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                  <p className="mb-1 line-clamp-1 text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--text-primary)]">输入: </span>
                    {r.templateContent.slice(0, 100)}
                  </p>
                  <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--text-primary)]">输出: </span>
                    {r.result.slice(0, 100)}
                  </p>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-tertiary)] p-4 space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-[var(--text-primary)]">完整输入</p>
                      <pre className="overflow-x-auto rounded bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono">
                        {r.templateContent}
                      </pre>
                    </div>
                    {Object.keys(r.variables).length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-[var(--text-primary)]">变量</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(r.variables).map(([k, v]) => (
                            <span key={k} className="text-xs text-[var(--text-secondary)]">
                              <span className="text-amber-400">[{k}]</span> = {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-xs font-medium text-[var(--text-primary)]">完整输出</p>
                      <pre className="overflow-x-auto rounded bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono">
                        {r.result}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
