'use client';

import { ArrowUp, Stop } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/config';
import { ButtonFileUpload } from './button-file-upload';
import { ButtonSearch } from './button-search';
import { FileList } from './file-list';
import { PromptSystem } from './prompt-system';
import { SelectModel } from './select-model';
import { SelectReasoningEffort } from './select-reasoning-effort';

type ReasoningEffort = 'low' | 'medium' | 'high';

type ChatInputProps = {
  onSendAction: (message: string, options: { enableSearch: boolean }) => void;
  isSubmitting?: boolean;
  hasMessages?: boolean;
  files: File[];
  onFileUploadAction: (files: File[]) => void;
  onFileRemoveAction: (file: File) => void;
  onSuggestionAction: (suggestion: string) => void;
  hasSuggestions?: boolean;
  onSelectModelAction: (model: string) => void;
  selectedModel: string;
  isUserAuthenticated: boolean;
  onSelectSystemPromptAction: (personaId: string) => void;
  selectedPersonaId?: string;
  stopAction: () => void;
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
  isReasoningModel: boolean;
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffortAction: (reasoningEffort: ReasoningEffort) => void;
  initialValue?: string;
};

export function ChatInput({
  onSendAction,
  isSubmitting,
  files,
  onFileUploadAction,
  onFileRemoveAction,
  onSuggestionAction,
  hasSuggestions,
  onSelectModelAction,
  selectedModel,
  isUserAuthenticated,
  onSelectSystemPromptAction,
  selectedPersonaId,
  stopAction,
  status,
  isReasoningModel,
  reasoningEffort,
  onSelectReasoningEffortAction,
  initialValue = '',
}: ChatInputProps) {
  // Local state for input value to prevent parent re-renders
  const [value, setValue] = useState(initialValue);
  const [searchEnabled, setSearchEnabled] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Track isEmpty state to prevent PromptSystem re-renders on every keystroke
  const [isEmpty, setIsEmpty] = useState(true);

  // Only update isEmpty when the emptiness state actually changes
  useEffect(() => {
    const currentEmpty = !value || value.trim() === '';
    if (currentEmpty !== isEmpty) {
      setIsEmpty(currentEmpty);
    }
  }, [value, isEmpty]);

  // Update local value when initialValue changes (e.g., when using suggestions)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) {
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSendAction(value, { enableSearch: searchEnabled });
        setValue(''); // Clear input after sending
      }
    },
    [onSendAction, isSubmitting, searchEnabled, value]
  );

  const handleMainClick = () => {
    if (status === 'streaming') {
      stopAction();
      return;
    }

    if (isSubmitting || !value.trim()) {
      // Prevent double submission or empty submission
      return;
    }

    onSendAction(value, { enableSearch: searchEnabled });
    setValue(''); // Clear input after sending
  };

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setValue(suggestion);
      onSuggestionAction(suggestion);
    },
    [onSuggestionAction]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {
        return;
      }

      // Check if there are any file items in the clipboard (not just text)
      const hasFiles = Array.from(items).some((item) => item.kind === 'file');
      // If user is not authenticated and trying to paste files, prevent it
      if (!isUserAuthenticated && hasFiles) {
        e.preventDefault();
        return;
      }

      // If no files or user is authenticated, allow default text paste behavior
      if (!hasFiles) {
        return;
      }

      // Handle image pasting for authenticated users
      const imageFiles: File[] = [];

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const newFile = new File(
              [file],
              `pasted-image-${Date.now()}.${file.type.split('/')[1]}`,
              { type: file.type }
            );
            imageFiles.push(newFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        onFileUploadAction(imageFiles);
      }
    },
    [isUserAuthenticated, onFileUploadAction]
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Compute tooltip text without nested ternary expressions
  let tooltipText = 'Send';
  if (status === 'streaming') {
    tooltipText = 'Stop';
  } else if (isSubmitting && files.length > 0) {
    tooltipText = 'Uploading...';
  }

  return (
    <div className="relative flex w-full flex-col gap-4">
      {hasSuggestions && (
        <PromptSystem
          isEmpty={isEmpty}
          onSelectSystemPrompt={onSelectSystemPromptAction}
          onSuggestion={handleSuggestionClick}
          onValueChange={setValue}
          selectedPersonaId={selectedPersonaId}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="relative z-10 bg-popover p-0 pb-2 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          onValueChange={setValue}
          value={value}
        >
          <FileList files={files} onFileRemoveAction={onFileRemoveAction} />
          <PromptInputTextarea
            className="mt-2 ml-2 min-h-[44px] text-base leading-[1.3] sm:text-base md:text-base"
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${APP_NAME}`}
            ref={textareaRef}
          />
          <PromptInputActions className="mt-5 w-full justify-between px-2 sm:px-2">
            <div className="flex origin-left scale-90 transform gap-1 sm:scale-100 sm:gap-2">
              <ButtonFileUpload
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
                onFileUpload={onFileUploadAction}
              />
              <ButtonSearch
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
                onSearch={() => setSearchEnabled((prev) => !prev)}
                searchEnabled={searchEnabled}
              />
              <SelectModel
                isUserAuthenticated={isUserAuthenticated}
                onSelectModel={onSelectModelAction}
                selectedModel={selectedModel}
              />
              {isReasoningModel && (
                <SelectReasoningEffort
                  onSelectReasoningEffortAction={onSelectReasoningEffortAction}
                  reasoningEffort={reasoningEffort}
                />
              )}
            </div>
            <PromptInputAction tooltip={tooltipText}>
              <Button
                aria-label="Send message"
                className="origin-right scale-90 transform rounded-full transition-all duration-300 ease-out sm:scale-100"
                disabled={
                  !value.trim() &&
                  files.length === 0 &&
                  status !== 'streaming' &&
                  status !== 'submitted'
                }
                onClick={handleMainClick}
                size="sm"
                type="button"
              >
                {status === 'streaming' || status === 'submitted' ? (
                  <Stop className="size-4" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}
