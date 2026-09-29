import React from "react";

/**
 * Helper untuk mem-parse inline text formatting:
 * - **bold**
 * - *italic*
 * - `inline code`
 * - [link](url)
 */
function renderInline(text) {
  if (!text) return null;

  // Regex tokenizing: **bold**, `code`, *italic*, [text](url)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // **bold**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-ai-violet-600 dark:text-ai-violet-400 font-mono text-[11px] border border-slate-200/70 dark:border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // *italic*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={idx} className="italic text-slate-800 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // [title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ai-violet-600 dark:text-ai-violet-400 hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Parser Markdown Block-Level:
 * Mendukung Headings (#, ##, ###), Tabel (|...|), Lists (-, *, 1.), Blockquotes (>), Code Blocks (```)
 */
export const MarkdownRenderer = ({ content }) => {
  if (!content || typeof content !== "string") return null;

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let currentTable = null;
  let currentCodeBlock = null;

  const flushTable = () => {
    if (currentTable && currentTable.rows.length > 0) {
      blocks.push({
        type: "table",
        headers: currentTable.headers,
        rows: currentTable.rows,
      });
      currentTable = null;
    }
  };

  const flushCodeBlock = () => {
    if (currentCodeBlock) {
      blocks.push({
        type: "codeBlock",
        code: currentCodeBlock.lines.join("\n"),
        lang: currentCodeBlock.lang,
      });
      currentCodeBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block Fence
    if (trimmed.startsWith("```")) {
      if (currentCodeBlock) {
        flushCodeBlock();
      } else {
        flushTable();
        currentCodeBlock = {
          lang: trimmed.slice(3).trim(),
          lines: [],
        };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.lines.push(line);
      continue;
    }

    // 2. Table Line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const rawCols = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      // Cek separator line seperti |---|---|
      const isSeparator = rawCols.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        // Hanya baris pemisah, lewati
        continue;
      }

      if (!currentTable) {
        currentTable = {
          headers: rawCols,
          rows: [],
        };
      } else {
        currentTable.rows.push(rawCols);
      }
      continue;
    } else {
      flushTable();
    }

    // 3. Empty Line
    if (!trimmed) {
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      continue;
    }

    // 5. Blockquote
    if (trimmed.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: trimmed.slice(2) });
      continue;
    }

    // 6. Unordered List (- atau *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      blocks.push({ type: "ul", text: ulMatch[1] });
      continue;
    }

    // 7. Ordered List (1. 2. dst)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      blocks.push({ type: "ol", num: olMatch[1], text: olMatch[2] });
      continue;
    }

    // 8. Normal Paragraph
    blocks.push({ type: "p", text: trimmed });
  }

  flushTable();
  flushCodeBlock();

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={idx}
                className="text-sm font-extrabold text-slate-900 dark:text-white pt-2 pb-1 border-b border-slate-200 dark:border-slate-800"
              >
                {renderInline(block.text)}
              </h1>
            );

          case "h2":
            return (
              <h2
                key={idx}
                className="text-xs font-bold text-ai-violet-700 dark:text-ai-violet-400 pt-1.5 pb-0.5 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-ai-violet-500" />
                <span>{renderInline(block.text)}</span>
              </h2>
            );

          case "h3":
            return (
              <h3
                key={idx}
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1"
              >
                {renderInline(block.text)}
              </h3>
            );

          case "ul":
            return (
              <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
                <span className="text-ai-violet-500 dark:text-ai-violet-400 font-bold mt-0.5 text-[9px]">
                  •
                </span>
                <span className="flex-1">{renderInline(block.text)}</span>
              </div>
            );

          case "ol":
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2 my-0.5">
                <span className="font-mono font-bold text-ai-violet-600 dark:text-ai-violet-400 text-[10px] min-w-[14px]">
                  {block.num}.
                </span>
                <span className="flex-1">{renderInline(block.text)}</span>
              </div>
            );

          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-ai-violet-500 pl-3 py-1 my-1.5 italic text-slate-600 dark:text-slate-400 bg-ai-violet-50/50 dark:bg-ai-violet-950/20 rounded-r-lg"
              >
                {renderInline(block.text)}
              </blockquote>
            );

          case "table":
            return (
              <div
                key={idx}
                className="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/60 shadow-xs"
              >
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-1.5 font-semibold">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3 py-1.5 text-slate-700 dark:text-slate-300"
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "codeBlock":
            return (
              <pre
                key={idx}
                className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto my-2 border border-slate-800"
              >
                <code>{block.code}</code>
              </pre>
            );

          case "p":
          default:
            return (
              <p key={idx} className="my-1">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default MarkdownRenderer;
