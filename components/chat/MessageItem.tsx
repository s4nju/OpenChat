import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "next-themes";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  return (
    <div key={message.id} className={cn(
      "flex w-full items-start gap-3",
      message.role === 'user' ? 'justify-end' : 'justify-start'
    )}
    >
      <div className={cn(
        "rounded-lg p-3 text-sm overflow-hidden",
        message.role === 'user'
          ? 'bg-primary text-primary-foreground max-w-[85%] md:max-w-[75%]'
          : 'bg-transparent w-full'
      )}
      >
        <ReactMarkdown
          rehypePlugins={[rehypeSanitize, rehypeRaw]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              return isInline ? (
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md whitespace-normal break-words" {...props}>
                  {children}
                </code>
              ) : (
                <CodeBlock
                  language={match ? match[1] : "text"}
                  code={String(children).replace(/\n$/, '')}
                />
              );
            },
            p: ({ children }) => (
              <p className="whitespace-pre-wrap leading-relaxed break-words hyphens-auto mt-2 first:mt-0">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2 pl-2">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside my-2 pl-2">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="my-1">
                {children}
              </li>
            ),
            a: ({ href, children }) => (
              <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold my-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold my-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold my-2">{children}</h3>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-3 py-1 my-2 italic text-gray-700 dark:text-gray-300">
                {children}
              </blockquote>
            ),
            pre: ({ children }) => (
              <pre className="overflow-auto max-w-full">
                {children}
              </pre>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { theme } = useTheme();
  const [codeTheme, setCodeTheme] = useState(theme === "dark" ? oneDark : oneLight);

  useEffect(() => {
    setCodeTheme(theme === "dark" ? oneDark : oneLight);
  }, [theme]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="relative bg-gray-100 dark:bg-gray-900 rounded-md my-2 group w-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {language && (
          <code className="text-xs text-muted-foreground">{language}</code>
        )}
        <button
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="Copy code"
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
      <div className="overflow-x-auto max-w-full">
        <SyntaxHighlighter 
          language={language} 
          style={codeTheme}
          customStyle={{
            margin: 0,
            padding: '1rem',
            borderRadius: '0 0 0.375rem 0.375rem',
            fontSize: '0.75rem',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
          wrapLines={true}
          wrapLongLines={true}
          codeTagProps={{
            style: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
