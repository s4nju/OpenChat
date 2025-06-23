"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/config"
import { ArrowUp, Stop } from "@phosphor-icons/react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { FileList } from "./file-list"
import { PromptSystem } from "./prompt-system"
import { SelectModel } from "./select-model"
import { SelectReasoningEffort } from "./select-reasoning-effort"

type ReasoningEffort = "low" | "medium" | "high";

type ChatInputProps = {
  onSend: (message: string, options: { enableSearch: boolean }) => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUpload: (files: File[]) => void
  onFileRemove: (file: File) => void
  onSuggestion: (suggestion: string) => void
  hasSuggestions?: boolean
  onSelectModel: (model: string) => void
  selectedModel: string
  isUserAuthenticated: boolean
  onSelectSystemPrompt: (systemPrompt: string) => void
  systemPrompt?: string
  stop: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  isReasoningModel: boolean
  reasoningEffort: ReasoningEffort
  onSelectReasoningEffort: (reasoningEffort: ReasoningEffort) => void
  initialValue?: string
}

export function ChatInput({
  onSend,
  isSubmitting,
  files,
  onFileUpload,
  onFileRemove,
  onSuggestion,
  hasSuggestions,
  onSelectModel,
  selectedModel,
  isUserAuthenticated,
  onSelectSystemPrompt,
  systemPrompt,
  stop,
  status,
  isReasoningModel,
  reasoningEffort,
  onSelectReasoningEffort,
  initialValue = "",
}: ChatInputProps) {
  // Local state for input value to prevent parent re-renders
  const [value, setValue] = useState(initialValue);
  const [searchEnabled, setSearchEnabled] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Track isEmpty state to prevent PromptSystem re-renders on every keystroke
  const [isEmpty, setIsEmpty] = useState(true)
  
  // Only update isEmpty when the emptiness state actually changes
  useEffect(() => {
    const currentEmpty = !value || value.trim() === ""
    if (currentEmpty !== isEmpty) {
      setIsEmpty(currentEmpty)
    }
  }, [value, isEmpty])

  // Update local value when initialValue changes (e.g., when using suggestions)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        onSend(value, { enableSearch: searchEnabled });
        setValue(""); // Clear input after sending
      }
    },
    [onSend, isSubmitting, searchEnabled, value]
  )

  const handleMainClick = () => {
    if (status === "streaming") {
      stop();
      return;
    }

    if (isSubmitting || !value.trim()) {
      // Prevent double submission or empty submission
      return;
    }

    onSend(value, { enableSearch: searchEnabled });
    setValue(""); // Clear input after sending
  }

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue(suggestion);
    onSuggestion(suggestion);
  }, [onSuggestion]);

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!isUserAuthenticated) {
        e.preventDefault()
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            const newFile = new File(
              [file],
              `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
              { type: file.type }
            )
            imageFiles.push(newFile)
          }
        }
      }

      if (imageFiles.length > 0) {
        onFileUpload(imageFiles)
      }
    },
    [isUserAuthenticated, onFileUpload]
  )

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  return (
    <div className="relative flex w-full flex-col gap-4">
      {hasSuggestions && (
        <PromptSystem
          onSelectSystemPrompt={onSelectSystemPrompt}
          onValueChange={setValue}
          onSuggestion={handleSuggestionClick}
          isEmpty={isEmpty}
          systemPrompt={systemPrompt}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="border-input bg-popover relative z-10 overflow-hidden border p-0 pb-2 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={setValue}
        >
          <FileList files={files} onFileRemove={onFileRemove} />
          <PromptInputTextarea
            placeholder={`Ask ${APP_NAME}`}
            onKeyDown={handleKeyDown}
            className="mt-2 ml-2 min-h-[44px] text-base leading-[1.3] sm:text-base md:text-base"
            ref={textareaRef}
            disabled={isSubmitting}
          />
          <PromptInputActions className="mt-5 w-full justify-between sm:px-2 px-2">
            <div className="flex sm:gap-2 gap-1 transform origin-left sm:scale-100 scale-90">
              <ButtonFileUpload
                onFileUpload={onFileUpload}
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
              />
              <ButtonSearch
                isUserAuthenticated={isUserAuthenticated}
                model={selectedModel}
                onSearch={() => setSearchEnabled((prev) => !prev)}
                searchEnabled={searchEnabled}
              />
              <SelectModel
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                isUserAuthenticated={isUserAuthenticated}
              />
              {isReasoningModel && (
                <SelectReasoningEffort
                  reasoningEffort={reasoningEffort}
                  onSelectReasoningEffort={onSelectReasoningEffort}
                />
              )}
            </div>
            <PromptInputAction
              tooltip={status === "streaming" ? "Stop" : isSubmitting && files.length > 0 ? "Uploading..." : "Send"}
            >
              <Button
                size="sm"
                className="rounded-full transition-all duration-300 ease-out transform origin-right sm:scale-100 scale-90"
                disabled={(!value.trim() && files.length === 0) && status !== "streaming"}
                type="button"
                onClick={handleMainClick}
                aria-label="Send message"
              >
                {status === "streaming" ? (
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
  )
}
