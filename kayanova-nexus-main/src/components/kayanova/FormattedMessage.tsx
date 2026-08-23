import React from "react";
import { cn } from "@/lib/utils";

interface FormattedMessageProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * FormattedMessage parses and renders structured Markdown, bold text (**...**),
 * bullet lists (- / *), numbered lists (1. ...), and paragraph breaks
 * for conversational AI agents.
 */
export function FormattedMessage({ content, className, isUser = false }: FormattedMessageProps) {
  if (!content) return null;

  // If message is from user, render cleanly with line breaks
  if (isUser) {
    return (
      <div
        className={cn("whitespace-pre-wrap break-words leading-relaxed font-medium", className)}
        dir="auto"
      >
        {content}
      </div>
    );
  }

  // Normalize dense Arabic text into structured Markdown lines
  const normalized = normalizeContent(content);

  // Parse blocks (paragraphs, lists, headers)
  const lines = normalized.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === "bullet") {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-2.5 space-y-2 pr-1 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-inherit">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/20" />
              <span className="flex-1 leading-relaxed text-foreground font-normal">
                {renderInlineMarkdown(autoFormatListItem(item))}
              </span>
            </li>
          ))}
        </ul>,
      );
    } else {
      elements.push(
        <ol key={`list-${elements.length}`} className="my-2.5 space-y-2 pr-1 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-inherit">
              <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {idx + 1}
              </span>
              <span className="flex-1 leading-relaxed text-foreground font-normal">
                {renderInlineMarkdown(autoFormatListItem(item))}
              </span>
            </li>
          ))}
        </ol>,
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet item (- or * or •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch && bulletMatch[1]) {
      if (!currentList || currentList.type !== "bullet") {
        flushList();
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered item (1. or 1-)
    const numberMatch = trimmed.match(/^(\d+)[.\-)]\s+(.+)$/);
    if (numberMatch && numberMatch[2]) {
      if (!currentList || currentList.type !== "number") {
        flushList();
        currentList = { type: "number", items: [] };
      }
      currentList.items.push(numberMatch[2]);
      continue;
    }

    // Regular line / header / paragraph
    flushList();

    // Markdown Heading (### / ##)
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch && headerMatch[2]) {
      elements.push(
        <p
          key={`h-${elements.length}`}
          className="mt-2.5 mb-1 font-bold text-foreground text-sm leading-snug"
        >
          {renderInlineMarkdown(headerMatch[2])}
        </p>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="my-1.5 leading-relaxed text-foreground font-normal"
      >
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  }

  flushList();

  return (
    <div
      className={cn("space-y-1 break-words text-xs sm:text-sm leading-relaxed", className)}
      dir="auto"
    >
      {elements}
    </div>
  );
}

/**
 * Normalizes dense continuous Arabic text into structured Markdown lines:
 * 1. If text has intro followed by colon `:` and comma-separated items with prices, splits into bullet items.
 * 2. If text has multiple sentences without newlines, inserts paragraph breaks.
 */
function normalizeContent(raw: string): string {
  if (!raw) return "";
  const text = raw.trim();

  // If already contains markdown lists with newlines, keep as is
  if (text.includes("\n-") || text.includes("\n*") || text.includes("\n1.")) {
    return text;
  }

  // Detect comma-separated catalog/menu items or list after colon ':'
  if (text.includes(":")) {
    const colonIdx = text.indexOf(":");
    const intro = text.slice(0, colonIdx + 1).trim();
    let body = text.slice(colonIdx + 1).trim();

    // Check for closing sentence (e.g. تحب تطلب...؟ / كل الأصناف...؟)
    let closing = "";
    const closingMatch = body.match(
      /((?:كل الأصناف|جميع الأصناف|تحب|حابب|هل تحب|هل ترغب|تحبي|يسعدنا|لأي استفسار)[^]*?[؟?.!])$/,
    );
    if (closingMatch && closingMatch[1] && closingMatch.index !== undefined) {
      closing = closingMatch[1].trim();
      body = body.slice(0, closingMatch.index).trim();
    }

    // Split items by arabic comma (،) or latin comma (,)
    const rawItems = body.split(/[،,]/);
    if (rawItems.length >= 2) {
      const bullets: string[] = [];
      for (const item of rawItems) {
        const clean = item
          .trim()
          .replace(/^[-*•]\s*/, "")
          .replace(/^(?:و|أو)\s+/, "")
          .replace(/\.$/, "")
          .trim();
        if (clean) {
          bullets.push(`- ${clean}`);
        }
      }

      if (bullets.length >= 2) {
        let result = `${intro}\n\n${bullets.join("\n")}`;
        if (closing) {
          result += `\n\n${closing}`;
        }
        return result;
      }
    }
  }

  // Also if text has periods or question marks without newlines in a single dense paragraph
  if (!text.includes("\n") && text.length > 80) {
    const parts = text.split(/([!؟?]\s+|\.\s+)/);
    if (parts.length > 2) {
      let rebuilt = "";
      for (let i = 0; i < parts.length; i += 2) {
        const sentence = parts[i]?.trim();
        const punc = parts[i + 1] || "";
        if (sentence) {
          rebuilt += `${sentence}${punc.trim()}\n\n`;
        }
      }
      if (rebuilt.trim()) return rebuilt.trim();
    }
  }

  return text;
}

/**
 * Ensures list items highlight item names with bold formatting:
 * e.g. "سبانش لاتيه بارد أو ساخن (حليب مكثف + دبل إسبريسو كولومبي) ٨٥ ج.م"
 * -> "**سبانش لاتيه بارد أو ساخن** (حليب مكثف + دبل إسبريسو كولومبي): ٨٥ ج.م"
 */
function autoFormatListItem(item: string): string {
  if (item.includes("**")) return item;

  // Match item name followed by paren and then price (Arabic/Western digits)
  const parenPriceRegex = /^(.+?)\s*(\(.*?\))\s*([\u0660-\u06690-9]+\s*(?:ج\.م|جنيه|EGP|L\.E))$/i;
  const matchParen = item.match(parenPriceRegex);
  if (matchParen && matchParen[1] && matchParen[3]) {
    const name = matchParen[1].trim();
    const paren = matchParen[2]?.trim() || "";
    const price = matchParen[3].trim();
    return `**${name}** ${paren}: ${price}`;
  }

  // Match item name followed by price
  const priceRegex = /^(.+?)\s+([\u0660-\u06690-9]+\s*(?:ج\.م|جنيه|EGP|L\.E))\s*(\(.*\))?$/i;
  const match = item.match(priceRegex);
  if (match && match[1] && match[2]) {
    const name = match[1].trim();
    const price = match[2].trim();
    const extra = match[3] ? ` ${match[3].trim()}` : "";
    return `**${name}**: ${price}${extra}`;
  }

  return item;
}

/**
 * Parses inline Markdown tokens:
 * - **bold** or __bold__ -> <strong>
 * - *italic* or _italic_ -> <em>
 * - `code` -> <code>
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold (**text** or __text__)
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-foreground">
          {inner}
        </strong>
      );
    }

    // Inline Code (`code`)
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold border border-border/80"
        >
          {inner}
        </code>
      );
    }

    // Italic (*text* or _text_)
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={idx} className="italic opacity-90 text-foreground">
          {inner}
        </em>
      );
    }

    // Plain text
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
