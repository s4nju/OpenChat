import { marked } from 'marked';
import 'katex/dist/katex.css';
import { Children, memo, useId, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '@/lib/utils';
import { ButtonCopy } from '../common/button-copy';
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from './code-block';
import { Source, SourceContent, SourceTrigger } from './source';

export type MarkdownProps = {
  children: string;
  id?: string;
  className?: string;
  components?: Partial<Components>;
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const LANGUAGE_REGEX = /language-(\w+)/;
const HTTP_REGEX = /^https?:\/\//i;

function extractLanguage(className?: string): string {
  if (!className) {
    return 'plaintext';
  }
  const match = className.match(LANGUAGE_REGEX);
  return match ? match[1] : 'plaintext';
}

const INITIAL_COMPONENTS: Partial<Components> = {
  code({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line;

    if (isInline) {
      return (
        <span
          className={cn(
            'rounded-sm bg-primary-foreground px-1 font-mono text-sm',
            className
          )}
          {...props}
        >
          {children}
        </span>
      );
    }

    const language = extractLanguage(className);

    return (
      <CodeBlock className={className}>
        <CodeBlockGroup className="flex h-9 items-center justify-between px-4">
          <div className="py-1 pr-2 font-mono text-muted-foreground text-xs">
            {language}
          </div>
        </CodeBlockGroup>
        <div className="sticky top-16 lg:top-0">
          <div className="absolute right-0 bottom-0 flex h-9 items-center pr-1.5">
            <ButtonCopy code={children as string} />
          </div>
        </div>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  a({ href, children, ...props }) {
    // Convert React children to plain text to detect citation-style labels like [[1]]
    const text = Children.toArray(children)
      .map((c) => (typeof c === 'string' ? c : ''))
      .join('')
      .trim();

    // Render [title](url) as a Source pill with domain label and hover details
    if (href && text) {
      const urlStr = String(href);
      const isHttp = HTTP_REGEX.test(urlStr);
      if (isHttp) {
        return (
          <Source href={urlStr}>
            {/* Pill label is the domain (handled by SourceTrigger default) with favicon */}
            <SourceTrigger showFavicon />
            {/* Hover title is brandified host; description is the link text from AI */}
            <SourceContent description={''} title={text} />
          </Source>
        );
      }
    }

    // Fallback: render a normal external link
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  },
};

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string;
    components?: Partial<Components>;
  }) {
    return (
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkBreaks, remarkGfm, remarkMath]}
      >
        {content}
      </ReactMarkdown>
    );
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content;
  }
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId();
  const blockId = id ?? generatedId;
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);

  return (
    <div className={cn('markdown-body', className)}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          components={components}
          content={block}
          key={`${blockId}-block-${
            // biome-ignore lint/suspicious/noArrayIndexKey: <check prompt kit docs>
            index
          }`}
        />
      ))}
    </div>
  );
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = 'Markdown';

export { Markdown };
