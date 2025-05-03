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
import React, { useCallback, useEffect, useRef } from "react"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { FileList } from "./file-list"
import { PromptSystem } from "./prompt-system"
import { SelectModel } from "./select-model"

type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: (options: { enableSearch: boolean }) => void
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
}

export function ChatInput({
  value,
  onValueChange,
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
}: ChatInputProps) {
  const [searchEnabled, setSearchEnabled] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        onSend({ enableSearch: searchEnabled });
      }
    },
    [onSend, isSubmitting, searchEnabled]
  )

  const handleMainClick = () => {
    // console.log("[ChatInput] Clicked main button");
    // console.log("[ChatInput] status:", status);

    if (status === "streaming") {
      // console.log("[ChatInput] Stopping streaming...");
      stop();
      return;
    }

    if (isSubmitting) {
      // Prevent double submission
      return;
    }

    onSend({ enableSearch: searchEnabled });
  }
  
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
          onValueChange={onValueChange}
          onSuggestion={onSuggestion}
          value={value}
          systemPrompt={systemPrompt}
        />
      )}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="border-input bg-popover relative z-10 overflow-hidden border p-0 pb-2 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={onValueChange}
        >
          <FileList files={files} onFileRemove={onFileRemove} />
          <PromptInputTextarea
            placeholder={`Ask ${APP_NAME}`}
            onKeyDown={handleKeyDown}
            className="mt-2 ml-2 min-h-[44px] text-base leading-[1.3] sm:text-base md:text-base"
            ref={textareaRef}
            disabled={isSubmitting}
          />
          <PromptInputActions className="mt-5 w-full justify-between px-2">
            <div className="flex gap-2">
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
            </div>
            <PromptInputAction tooltip={isSubmitting ? "Sending..." : "Send"}>
              <Button
                size="sm"
                className="size-9 rounded-full transition-all duration-300 ease-out"
                disabled={status !== "streaming" && !value}
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
