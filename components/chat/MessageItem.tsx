import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Check, Copy, RotateCw, Pencil, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "next-themes";
import { v4 as uuidv4 } from 'uuid';

// Extend the Window interface to include our global store accessors
declare global {
  interface Window {
    chatStore?: () => {
      messages: Message[];
      setMessages: (messages: Message[]) => void;
      saveCurrentChat: (selectedModel?: string) => void;
      processChat: (messages: Message[], input: string, apiKey: string, selectedModel: string) => Promise<void>;
    };
    settingsStore?: () => {
      apiKey: string;
      selectedModel: string;
    };
  }
}

interface MessageItemProps {
  message: Message;
  onEdit?: (id: string, content?: string) => void;
  onRegenerate?: (id: string) => void;
  isGenerating?: boolean;
}

export function MessageItem({ message, onEdit, onRegenerate, isGenerating = false }: MessageItemProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      // Place cursor at the end of the text
      const length = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      
      // Format as "Mar 31 at 11:28 PM"
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return "";
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleEdit = () => {
    // Enable in-place editing for both user and assistant messages
    setIsEditing(true);
    setEditedContent(message.content);
  };

  const handleRegenerate = () => {
    if (onRegenerate) onRegenerate(message.id);
  };

  const handleSubmitEdit = () => {
    if (editedContent.trim() !== message.content.trim()) {
      // Direct modification of the message without going through input
      if (typeof window !== 'undefined' && window.chatStore) {
        const chatStore = window.chatStore();
        const currentMessages = chatStore.messages;
        
        // Find the index of the current message
        const messageIndex = currentMessages.findIndex(msg => msg.id === message.id);
        
        if (messageIndex >= 0) {
          // Keep all messages
          const messagesBeforeEdit = [...currentMessages];
          
          // Update just this message with new content
          messagesBeforeEdit[messageIndex] = {
            ...messagesBeforeEdit[messageIndex],
            content: editedContent.trim(),
            timestamp: new Date().toISOString()
          };
          
          // Set messages with the updated message
          chatStore.setMessages(messagesBeforeEdit);
          
          // If we have a saved chat, update it
          if (chatStore.saveCurrentChat) {
            chatStore.saveCurrentChat();
          }
          
          // Only regenerate responses if this is a user message
          // For assistant messages, we simply update the content
          if (message.role === 'user' && messageIndex < currentMessages.length - 1) {
            // Process the chat with the edited content to get new responses
            if (chatStore.processChat) {
              const messagesToProcess = currentMessages.slice(0, messageIndex + 1);
              messagesToProcess[messageIndex] = {
                ...messagesToProcess[messageIndex],
                content: editedContent.trim()
              };
              
              const apiKey = window.settingsStore?.()?.apiKey;
              const selectedModel = window.settingsStore?.()?.selectedModel;
              
              if (apiKey && selectedModel) {
                chatStore.processChat(messagesToProcess, editedContent.trim(), apiKey, selectedModel);
              }
            }
          }
        }
      } else if (onEdit) {
        // Fallback to the provided onEdit handler if window.chatStore is not available
        onEdit(message.id, editedContent);
      }
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Render the action buttons
  const renderActionButtons = () => {
    return (
      <>
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Copy message"
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={handleRegenerate}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Regenerate response"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Edit message"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </>
    );
  };

  // Render edit controls when editing
  const renderEditControls = () => {
    return (
      <div className="flex gap-2 mt-2 justify-end">
        <button
          onClick={handleCancelEdit}
          className="px-3 py-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
          aria-label="Cancel edit"
        >
          <X className="h-4 w-4 inline mr-1" />
          Cancel
        </button>
        <button
          onClick={handleSubmitEdit}
          className="px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          aria-label="Save edit"
        >
          <Check className="h-4 w-4 inline mr-1" />
          Save
        </button>
      </div>
    );
  };

  return (
    <div key={message.id} className={cn(
      "flex flex-col w-full gap-1 group/message",
      message.role === 'user' ? 'items-end' : 'items-start'
    )}>
      <div className={cn(
        "w-full flex flex-col",
        message.role === 'user' ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          "rounded-lg p-3 text-sm overflow-hidden",
          message.role === 'user'
            ? 'bg-primary text-primary-foreground max-w-[85%] md:max-w-[75%]'
            : 'bg-transparent w-full'
        )}>
          {isEditing ? (
            <div className="w-full">
              <textarea
                ref={editTextareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full resize-none outline-none border-none p-0 m-0",
                  message.role === 'user' 
                    ? "bg-transparent text-primary-foreground" 
                    : "bg-gray-100 dark:bg-gray-800 p-2 rounded"
                )}
                rows={Math.max(3, editedContent.split('\n').length)}
                placeholder="Edit message..."
              />
              {renderEditControls()}
            </div>
          ) : (
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
          )}
        </div>
        
        {/* Message footer with buttons and timestamp - hide while generating */}
        {message.role === 'assistant' && !isGenerating && (
          <div className="flex justify-between items-center mt-1 w-full px-1 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
            <div className="flex gap-1.5">
              {renderActionButtons()}
            </div>
            {message.timestamp && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(message.timestamp)}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Action buttons for user messages - hide during AI generation */}
      {message.role === 'user' && !isEditing && !isGenerating && (
        <div className="flex justify-between items-center mt-1 w-full max-w-[85%] md:max-w-[75%] px-1 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
          <div className="flex-1"></div> {/* Spacer */}
          <div className="flex gap-1.5">
            {renderActionButtons()}
          </div>
        </div>
      )}
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
