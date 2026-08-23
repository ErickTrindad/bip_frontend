import React from 'react';

interface FormattedAiMessageProps {
  content: string;
}

/**
 * Remove blocos de raciocínio interno do modelo (<think>...</think>) se retornados
 */
export function cleanAiResponse(text: string): string {
  if (!text) return '';
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Renderizador de texto formatado para respostas do consultor de IA
 * Suporta títulos (###, ##, #), listas com marcadores (- ou *), citações (>), 
 * negrito (**texto**) e código inline (`código`).
 */
export function FormattedAiMessage({ content }: FormattedAiMessageProps) {
  const cleaned = cleanAiResponse(content);
  if (!cleaned) return null;

  const lines = cleaned.split('\n');

  // Renderiza inline: **negrito** e `code`
  const renderInline = (lineText: string): React.ReactNode => {
    // Regex para tokens: **bold** ou `code`
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(lineText)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(lineText.substring(lastIndex, matchIndex));
      }

      const raw = match[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <strong key={matchIndex} className="font-bold text-text-primary">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        parts.push(
          <code
            key={matchIndex}
            className="px-1.5 py-0.5 mx-0.5 bg-neutral-200/60 dark:bg-neutral-800 text-brand-700 font-mono text-[11px] rounded"
          >
            {raw.slice(1, -1)}
          </code>
        );
      }
      lastIndex = matchIndex + raw.length;
    }

    if (lastIndex < lineText.length) {
      parts.push(lineText.substring(lastIndex));
    }

    return parts.length > 0 ? parts : lineText;
  };

  return (
    <div className="flex flex-col gap-2.5 text-xs text-text-primary leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Títulos H3 / H2 / H1
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="text-sm font-bold text-brand-700 mt-2 flex items-center gap-1.5"
            >
              {renderInline(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className="text-sm font-extrabold text-text-primary mt-2.5 pb-1 border-b border-border-neutral"
            >
              {renderInline(trimmed.substring(3))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2
              key={idx}
              className="text-base font-extrabold text-brand-600 mt-3 pb-1 border-b border-border-neutral"
            >
              {renderInline(trimmed.substring(2))}
            </h2>
          );
        }

        // Citações / Dicas (> 💡 Dica)
        if (trimmed.startsWith('>')) {
          return (
            <blockquote
              key={idx}
              className="p-2.5 my-1 bg-brand-50/70 border-l-3 border-brand-500 rounded-r-xl text-xs font-medium text-text-primary"
            >
              {renderInline(trimmed.replace(/^>\s*/, ''))}
            </blockquote>
          );
        }

        // Listas com marcadores (- ou *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <div className="flex-1">{renderInline(trimmed.substring(2))}</div>
            </div>
          );
        }

        // Parágrafo regular
        return (
          <p key={idx} className="m-0">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
