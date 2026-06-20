interface VariableHighlightProps {
  text: string;
}

export default function VariableHighlight({ text }: VariableHighlightProps) {
  if (!text) return null;

  const parts: { type: 'text' | 'variable'; value: string }[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'variable', value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return (
    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--text-secondary)]">
      {parts.map((part, i) =>
        part.type === 'variable' ? (
          <span
            key={i}
            className="variable-pill inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30"
          >
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </div>
  );
}
