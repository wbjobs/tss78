import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Plus, X, Layers, Images, Play, AlertTriangle } from 'lucide-react';
import ImageUploader from './ImageUploader';
import ModelConfig from './ModelConfig';

export default function BatchTestConfig() {
  const currentTemplate = useAppStore((s) => s.currentTemplate);
  const uploadedImages = useAppStore((s) => s.uploadedImages);
  const batchVariableValues = useAppStore((s) => s.batchVariableValues);
  const batchImageGroups = useAppStore((s) => s.batchImageGroups);
  const addBatchVariableValue = useAppStore((s) => s.addBatchVariableValue);
  const removeBatchVariableValue = useAppStore((s) => s.removeBatchVariableValue);
  const updateBatchVariableValue = useAppStore((s) => s.updateBatchVariableValue);
  const addBatchImageGroup = useAppStore((s) => s.addBatchImageGroup);
  const removeBatchImageGroup = useAppStore((s) => s.removeBatchImageGroup);
  const executeBatch = useAppStore((s) => s.executeBatch);
  const generateCombinations = useAppStore((s) => s.generateCombinations);
  const isBatchExecuting = useAppStore((s) => s.isBatchExecuting);

  const variableNames = useMemo(() => {
    const regex = /\[([^\]]+)\]/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(currentTemplate)) !== null) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }
    return vars;
  }, [currentTemplate]);

  const combinationCount = useMemo(() => generateCombinations().length, [generateCombinations]);

  const selectedImageIds = useMemo(() => new Set(uploadedImages.map((i) => i.id)), [uploadedImages]);

  const handleAddImageGroup = () => {
    if (uploadedImages.length === 0) return;
    addBatchImageGroup(uploadedImages.map((i) => i.id));
  };

  const getImageUrl = (id: string) => uploadedImages.find((i) => i.id === id)?.url ?? '';

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-[var(--accent-purple)]" />
          <p className="text-sm font-medium text-[var(--text-primary)]">批量测试配置</p>
        </div>
        <div className="flex items-center gap-2">
          {combinationCount > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">
              将运行 <span className="font-semibold text-[var(--accent)]">{combinationCount}</span> 组组合
            </span>
          )}
          <button
            onClick={executeBatch}
            disabled={isBatchExecuting || combinationCount === 0}
            className="glow-button flex items-center gap-1.5 rounded-md bg-[var(--accent-purple)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Play size={13} />
            {isBatchExecuting ? '运行中...' : '运行批量测试'}
          </button>
        </div>
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-4 space-y-5">
        {variableNames.length === 0 && uploadedImages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertTriangle size={28} className="mb-2 text-[var(--text-secondary)] opacity-40" />
            <p className="text-xs text-[var(--text-secondary)]">
              请先在上方模板中使用 [变量名] 定义变量，或上传图片进行批量对比
            </p>
          </div>
        )}

        {variableNames.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">变量取值</p>
            {variableNames.map((varName) => (
              <div key={varName} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-400">
                    {varName}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {(batchVariableValues[varName] ?? ['']).length} 个取值
                  </span>
                  <button
                    onClick={() => addBatchVariableValue(varName, '')}
                    className="ml-auto flex h-5 w-5 items-center justify-center rounded border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(batchVariableValues[varName] ?? ['']).map((val, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-secondary)]">
                        {idx + 1}
                      </div>
                      <input
                        value={val}
                        onChange={(e) => updateBatchVariableValue(varName, idx, e.target.value)}
                        placeholder={`输入 ${varName} 的第 ${idx + 1} 个取值`}
                        className="flex-1 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none placeholder-[var(--text-secondary)] focus:border-[var(--accent-purple)]"
                      />
                      {(batchVariableValues[varName] ?? ['']).length > 1 && (
                        <button
                          onClick={() => removeBatchVariableValue(varName, idx)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">图片</p>
          <ImageUploader />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Images size={13} className="text-[var(--accent-purple)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">图片组合</p>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {batchImageGroups.length === 0 ? '使用全部已上传图片' : `${batchImageGroups.length} 组图片`}
            </span>
            <button
              onClick={handleAddImageGroup}
              disabled={uploadedImages.length === 0}
              className="ml-auto flex items-center gap-1 rounded border border-dashed border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)] disabled:opacity-30"
            >
              <Plus size={11} /> 添加组
            </button>
          </div>

          {batchImageGroups.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--border)] p-3 text-center">
              <p className="text-[11px] text-[var(--text-secondary)]">
                {uploadedImages.length === 0
                  ? '先在上传区域添加图片'
                  : `将使用已上传的 ${uploadedImages.length} 张图片运行所有组合`}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {batchImageGroups.map((group, gIdx) => (
                <div key={gIdx} className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-1.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)]">
                    G{gIdx + 1}
                  </span>
                  <div className="flex flex-1 gap-1 overflow-x-auto">
                    {group.length === 0 ? (
                      <span className="text-[10px] text-[var(--text-secondary)]">空组（无图片）</span>
                    ) : (
                      group.map((imgId) => {
                        const url = getImageUrl(imgId);
                        if (!url || !selectedImageIds.has(imgId)) return null;
                        return (
                          <div key={imgId} className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-[var(--border)]">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => removeBatchImageGroup(gIdx)}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <ModelConfig />
        </div>
      </div>
    </div>
  );
}
