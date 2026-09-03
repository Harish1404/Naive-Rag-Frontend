"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Copy, Check, CircleAlert } from "lucide-react";
import {
  Children,
  isValidElement,
  useCallback,
  useState,
  type ReactNode,
} from "react";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * Copy-to-clipboard with a 2s confirmation.
 *
 * Shared by the message-level button and every code block, which is why it is
 * a hook rather than duplicated state.
 */
function useCopy() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return { copied, copy };
}

/** Flatten a markdown node's children back to plain text, for copying. */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeToText(node.props.children);
  }
  return "";
}

/**
 * A fenced code block, ChatGPT style: a header bar naming the language with its
 * own copy button, over horizontally scrollable code.
 *
 * This is a `pre` override rather than a `code` one. react-markdown nests
 * `code` inside `pre` for fenced blocks, and the language class lives on the
 * inner `code` — so the header is only reachable from out here.
 */
function CodeBlock({ children }: { children?: ReactNode }) {
  const { copied, copy } = useCopy();

  // <pre><code className="language-python">…</code></pre>
  const codeEl = Children.toArray(children).find(
    (child): child is React.ReactElement<{ className?: string; children?: ReactNode }> =>
      isValidElement(child)
  );

  const className = codeEl?.props?.className ?? "";
  const language = /language-(\w+)/.exec(className)?.[1] ?? "";
  const text = nodeToText(children);

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/50 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() => copy(text)}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-secondary" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const { copied, copy } = useCopy();

  return (
    <div
      className={cn(
        // `group` is load-bearing: the copy button below reveals on
        // group-hover, and without this class it never appears at all.
        "group animate-message-in flex w-full flex-col",
        isUser ? "items-end" : "items-start"
      )}
    >
      {/* Role label */}
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1.5",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold tracking-wide",
            isUser ? "text-muted-foreground" : "text-primary"
          )}
        >
          {isUser ? "You" : "Assistant"}
        </span>
      </div>

      {/* Message content */}
      <div className={cn("relative", isUser ? "max-w-[80%] sm:max-w-[70%]" : "w-full")}>
        <div
          className={cn(
            "text-[14.5px] leading-[1.7]",
            isUser
              ? "whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm border border-border/70 bg-surface-elevated px-4 py-3 text-foreground shadow-sm"
              : "w-full text-foreground/90"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div
              className={cn(
                "prose prose-sm w-full max-w-none",
                "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                isStreaming && "streaming-cursor"
              )}
            >
              <ReactMarkdown
                // GitHub-flavoured markdown. This is what makes tables work at
                // all — CommonMark has no table syntax, so without this plugin
                // a `| a | b |` block renders as a literal paragraph.
                remarkPlugins={[remarkGfm]}
                // Raw HTML, then sanitised. The order is the security property
                // and must not be swapped.
                //
                // Models emit HTML inside markdown constantly — `<br>` to break
                // a line inside a table cell most of all, since markdown has no
                // other way to do it. Without rehypeRaw those tags are escaped
                // and the reader sees a literal "<br>" in the middle of a cell.
                //
                // Turning raw HTML on is what makes sanitising mandatory. The
                // text being rendered is model output, and on the RAG path it
                // quotes chunks retrieved from uploaded documents — so a
                // poisoned PDF could otherwise put an <img onerror=...> on the
                // page and make authenticated requests with the user's session
                // cookie riding along.
                //
                // rehypeSanitize's default (GitHub) schema is a good fit as-is:
                // it permits <br> and the table elements, drops <script> and
                // every on* handler, restricts href/src to safe protocols, and
                // still keeps className="language-*" on <code>, which is what
                // CodeBlock reads to label a fenced block.
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  // ── Tables ───────────────────────────────────────────────
                  // The wrapper owns the border and the scrolling. A wide
                  // table must scroll inside its own box; the page itself
                  // must never scroll sideways.
                  table: ({ children }) => (
                    <div className="my-4 w-full overflow-x-auto rounded-xl border border-border/60">
                      <table className="w-full border-collapse text-left text-[13.5px]">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50">{children}</thead>
                  ),
                  tr: ({ children }) => (
                    <tr className="transition-colors hover:bg-muted/20">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-border/60 px-3 py-2.5 text-left text-[13px] font-semibold text-foreground">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-t border-border/40 px-3 py-2.5 align-top leading-relaxed">
                      {children}
                    </td>
                  ),

                  // ── Code ─────────────────────────────────────────────────
                  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                  code: ({ className, children, ...props }) => {
                    // Fenced blocks carry a language-* class and are handled
                    // by CodeBlock above; only inline code lands here bare.
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[13px] text-foreground"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className={cn("font-mono", className)} {...props}>
                        {children}
                      </code>
                    );
                  },

                  // ── Headings ─────────────────────────────────────────────
                  h1: ({ children }) => (
                    <h1 className="mt-6 mb-3 text-[19px] font-semibold tracking-tight">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-5 mb-2.5 text-[17px] font-semibold tracking-tight">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 mb-2 text-[15px] font-semibold tracking-tight">
                      {children}
                    </h3>
                  ),

                  // ── Blocks & inline ──────────────────────────────────────
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-3 list-outside list-disc space-y-1.5 pl-6 [&>li>p]:my-0 [&>li>p]:inline">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-3 list-outside list-decimal space-y-1.5 pl-6 [&>li>p]:my-0 [&>li>p]:inline">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="pl-1 leading-relaxed">{children}</li>
                  ),
                  p: ({ children }) => <p className="my-2.5 leading-relaxed">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-2 border-primary/40 pl-4 italic text-foreground/80">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-5 border-border/60" />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* The answer stopped early — it ran into the model's token ceiling,
            or the user hit stop. Without this the reply just ends mid-word and
            reads as if the model had nothing more to say.
            Not shown while streaming: an in-progress answer is legitimately
            incomplete and already has a cursor saying so. */}
        {!isUser && message.partial && !isStreaming && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-amber-600 dark:text-amber-400">
            <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              This response was cut off before it finished. Ask me to continue
              and I&apos;ll pick up where it stopped.
            </span>
          </div>
        )}

        {/* Copy button for assistant messages.
            focus-visible keeps it reachable by keyboard, since hover alone
            would hide it from anyone not using a mouse. */}
        {!isUser && message.content && (
          <button
            type="button"
            onClick={() => copy(message.content)}
            className="mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted/50 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
            title="Copy response"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-secondary" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
