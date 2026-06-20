import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Plus, Search, Play, Copy, Trash2, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import type { Template } from '@/store/useAppStore';

export default function Cases() {
  const templates = useAppStore((s) => s.templates);
  const loadTemplates = useAppStore((s) => s.loadTemplates);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const setTemplate = useAppStore((s) => s.setTemplate);
  const loadVariableSets = useAppStore((s) => s.loadVariableSets);
  const variableSets = useAppStore((s) => s.variableSets);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleLoad = (t: Template) => {
    setTemplate(t.content);
    navigate('/');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleExpand = (t: Template) => {
    if (expanded === t.id) {
      setExpanded(null);
    } else {
      setExpanded(t.id);
      loadVariableSets(t.id);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">模板用例</h1>
        <button
          onClick={() => {
            setTemplate('');
            navigate('/');
          }}
          className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] hover:opacity-90"
        >
          <Plus size={16} />
          新建模板
        </button>
      </div>

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索模板名称或标签..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
          <p className="text-sm">暂无模板</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] transition-colors hover:border-[var(--accent)]/30"
          >
            <div className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleLoad(t)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
                    title="加载到编辑器"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    onClick={() => handleCopy(t.content)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
                    title="复制"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mb-3 line-clamp-2 text-xs text-[var(--text-secondary)]">{t.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  {t.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-0.5 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
                      <Tag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                  <span>{t.variables.length} 变量</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => handleExpand(t)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {expanded === t.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded === t.id ? '收起' : '变量组合'}
              </button>
            </div>

            {expanded === t.id && (
              <div className="border-t border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
                {variableSets.length === 0 ? (
                  <p className="text-[10px] text-[var(--text-secondary)]">暂无变量组合</p>
                ) : (
                  <div className="space-y-2">
                    {variableSets.map((vs) => (
                      <div key={vs.id} className="rounded bg-[var(--bg-secondary)] p-2">
                        <p className="text-xs font-medium text-[var(--text-primary)]">{vs.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(vs.values).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-[var(--text-secondary)]">
                              <span className="text-amber-400">{k}</span>={v}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
