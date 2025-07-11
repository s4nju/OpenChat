"use client"

import * as React from "react"
import { Search } from "lucide-react"

type SearchHeaderProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ModelSelectorSearchHeader({
  value,
  onChange,
  placeholder = "Search models...",
}: SearchHeaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="sticky top-0 z-10 rounded-t-lg bg-popover px-3.5 pt-0.5">
      <div className="flex items-center">
        <Search className="ml-px mr-3 !size-4 text-muted-foreground/75" />
        <input
          role="searchbox"
          aria-label="Search models"
          placeholder={placeholder}
          className="w-full bg-transparent py-2 text-sm text-foreground placeholder-muted-foreground/50 placeholder:select-none focus:outline-none"
          value={value}
          onChange={handleChange}
        />
      </div>
      <div className="border-b border-chat-border px-3"></div>
    </div>
  )
}