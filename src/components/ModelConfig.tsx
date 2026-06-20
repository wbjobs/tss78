import { useAppStore } from '@/store/useAppStore';

const models = [
  { value: 'gpt-4-vision', label: 'GPT-4 Vision' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
];

export default function ModelConfig() {
  const model = useAppStore((s) => s.model);
  const temperature = useAppStore((s) => s.temperature);
  const maxTokens = useAppStore((s) => s.maxTokens);
  const setModel = useAppStore((s) => s.setModel);
  const setTemperature = useAppStore((s) => s.setTemperature);
  const setMaxTokens = useAppStore((s) => s.setMaxTokens);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-secondary)]">模型</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-secondary)]">温度</label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[var(--bg-tertiary)] accent-[var(--accent)]"
        />
        <span className="w-8 text-xs text-[var(--text-primary)]">{temperature.toFixed(1)}</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-secondary)]">最大 Tokens</label>
        <input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
          className="w-20 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>
    </div>
  );
}
