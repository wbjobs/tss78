import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Save, ChevronDown, X } from 'lucide-react';

export default function VariablePanel() {
  const variables = useAppStore((s) => s.variables);
  const setVariable = useAppStore((s) => s.setVariable);
  const variableSets = useAppStore((s) => s.variableSets);
  const toggleVariablePanel = useAppStore((s) => s.toggleVariablePanel);
  const loadVariableSet = useAppStore((s) => s.loadVariableSet);
  const variableKeys = Object.keys(variables);
  const [setName, setSetName] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSaveSet = async () => {
    if (!setName.trim()) return;
    const { currentTemplate, templates, saveVariableSet, saveTemplate } = useAppStore.getState();
    let tpl = templates.find((t) => t.content === currentTemplate);
    if (!tpl) {
      await saveTemplate(setName, []);
      tpl = useAppStore.getState().templates.find((t) => t.content === currentTemplate);
    }
    if (tpl) {
      await saveVariableSet(tpl.id, setName);
    }
    setSetName('');
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">变量面板</h3>
        <button
          onClick={toggleVariablePanel}
          className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {variableKeys.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)]">
            在模板中使用 [变量名] 来创建变量
          </p>
        )}
        {variableKeys.map((key) => (
          <div key={key}>
            <label className="variable-pill mb-1 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
              {key}
            </label>
            <input
              type="text"
              value={variables[key]}
              onChange={(e) => setVariable(key, e.target.value)}
              placeholder={`输入 ${key} 的值`}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-4 space-y-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            加载变量组合
            <ChevronDown size={14} />
          </button>
          {dropdownOpen && variableSets.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] shadow-lg">
              {variableSets.map((vs) => (
                <button
                  key={vs.id}
                  onClick={() => {
                    loadVariableSet(vs.id);
                    setDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                >
                  {vs.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder="组合名称"
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleSaveSet}
            className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--bg-primary)] hover:opacity-90"
          >
            <Save size={14} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
