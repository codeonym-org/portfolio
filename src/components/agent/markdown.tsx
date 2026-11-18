import { Fragment, type ReactNode } from "react";

/**
 * The tiny Markdown the agent speaks: paragraphs, bullet / numbered
 * lists, **bold**, *italic*, `code` and [links](https://…). Links are
 * limited to http(s) and mailto — model output never becomes a
 * javascript: URL.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function safeHref(href: string) {
  return /^(https?:\/\/|mailto:)/i.test(href) ? href : null;
}

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={k} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={k} className="rounded bg-system/10 px-1 font-mono text-[0.85em] text-system">{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a key={k} href={href} target="_blank" rel="noreferrer noopener" className="text-system underline decoration-system/40 underline-offset-2 hover:decoration-system">
          {link[1]}
        </a>
      ) : (
        <Fragment key={k}>{link[1]}</Fragment>
      );
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
      return <em key={k}>{part.slice(1, -1)}</em>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const key = `p${blocks.length}`;
    blocks.push(<p key={key}>{inline(para.join(" "), key)}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const key = `l${blocks.length}`;
    const items = list.items.map((it, i) => <li key={i}>{inline(it, `${key}-${i}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key} className="list-decimal space-y-0.5 pl-5">{items}</ol>
      ) : (
        <ul key={key} className="list-none space-y-0.5 pl-1 [&>li]:relative [&>li]:pl-4 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:text-system [&>li]:before:content-['▸']">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (heading) {
      flushPara();
      flushList();
      const key = `h${blocks.length}`;
      blocks.push(<p key={key} className="font-display text-[10px] tracking-[0.25em] text-system">{inline(heading[1].toUpperCase(), key)}</p>);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return <div className="space-y-2">{blocks}</div>;
}
