import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import VariableHighlight from '@/components/VariableHighlight';
import VariablePanel from '@/components/VariablePanel';
import ImageUploader from '@/components/ImageUploader';
import ResultPanel from '@/components/ResultPanel';
import ModelConfig from '@/components/ModelConfig';
import BatchTestConfig from '@/components/BatchTestConfig';
import BatchResultTable from '@/components/BatchResultTable';
import { Save, PanelRightOpen, Play, GitCompare, Layers, Sparkles } from 'lucide-react';

export default function Editor() {
  const currentTemplate = useAppStore((s) => s.currentTemplate);
  const setTemplate = useAppStore((s) => s.setTemplate);
  const variablePanelOpen = useAppStore((s) => s.variablePanelOpen);
  const toggleVariablePanel = useAppStore((s) => s.toggleVariablePanel);
  const execute = useAppStore((s) => s.execute);
  const executeAB = useAppStore((s) => s.executeAB);
  const isExecuting = useAppStore((s) => s.isExecuting);
  const saveTemplate = useAppStore((s) => s.saveTemplate);
  const abResult = useAppStore((s) => s.abResult);
  const batchMode = useAppStore((s) => s.batchMode);
  const setBatchMode = useAppStore((s) => s.setBatchMode);
  const batchResults = useAppStore((s) => s.batchResults);
  const isBatchExecuting = useAppStore((s) => s.isBatchExecuting);

  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSave = () => {
    if (!saveName.trim()) return;
    const tags = saveTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    saveTemplate(saveName, tags);
    setShowSaveDialog(false);
    setSaveName('');
    setSaveTags('');
  };

  const showBatchResults = batchMode && (batchResults || isBatchExecuting);

  return (
    <div className="flex h-[calc(100vh-52px)]">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-full">
          <div className="flex w-1/2 flex-col border-r border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center gap-1 rounded-md bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Save size={13} />
                  保存模板
                </button>
                <button
                  onClick={toggleVariablePanel}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${
                    variablePanelOpen
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <PanelRightOpen size={13} />
                  变量面板
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[var(--bg-tertiary)] p-0.5">
                <button
                  onClick={() => setBatchMode(false)}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors ${
                    !batchMode
                      ? 'bg-[var(--bg-primary)] text-[var(--accent)] shadow'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Sparkles size={11} />
                  单次
                </button>
                <button
                  onClick={() => setBatchMode(true)}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors ${
                    batchMode
                      ? 'bg-[var(--bg-primary)] text-[var(--accent-purple)] shadow'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Layers size={11} />
                  批量
                </button>
              </div>
            </div>

            {showSaveDialog && (
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="模板名称"
                  className="w-32 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <input
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="标签(逗号分隔)"
                  className="w-40 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleSave}
                  className="rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--bg-primary)] hover:opacity-90"
                >
                  保存
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="rounded bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                >
                  取消
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <textarea
                value={currentTemplate}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="输入模板内容...&#10;使用 [变量名] 来定义变量，例如：&#10;请翻译以下内容为[语言]：[内容]"
                className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-[var(--text-primary)] outline-none placeholder-[var(--text-secondary)]"
              />
            </div>

            <div className="border-t border-[var(--border)] p-3 space-y-3">
              {currentTemplate && (
                <div className="rounded-md bg-[var(--bg-tertiary)] p-3">
                  <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">变量预览</p>
                  <VariableHighlight text={currentTemplate} />
                </div>
              )}

              {batchMode ? (
                <BatchTestConfig />
              ) : (
                <>
                  <ImageUploader />
                  <ModelConfig />
                  <div className="flex gap-2">
                    <button
                      onClick={execute}
                      disabled={isExecuting || isBatchExecuting}
                      className="glow-button flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--bg-primary)] transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      <Play size={16} />
                      {isExecuting ? '运行中...' : '运行'}
                    </button>
                    <button
                      onClick={executeAB}
                      disabled={isExecuting || isBatchExecuting}
                      className="flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 disabled:opacity-50"
                    >
                      <GitCompare size={16} />
                      A/B
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex w-1/2 flex-col">
            <div className="border-b border-[var(--border)] px-4 py-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {batchMode ? (showBatchResults ? '批量对比结果' : '批量结果输出') : `输出结果${abResult ? ' (A/B 模式)' : ''}`}
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              {showBatchResults ? (
                <BatchResultTable />
              ) : batchMode ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                  <div className="text-center">
                    <Layers size={32} className="mx-auto mb-2 opacity-30 text-[var(--accent-purple)]" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      在左侧配置变量取值组合后点击"运行批量测试"
                    </p>
                  </div>
                </div>
              ) : (
                <ResultPanel />
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`variable-panel-drawer border-l border-[var(--border)] transition-all duration-300 ease-in-out ${
          variablePanelOpen ? 'w-72' : 'w-0'
        } overflow-hidden`}
      >
        <div className="w-72">
          <VariablePanel />
        </div>
      </div>
    </div>
  );
}
