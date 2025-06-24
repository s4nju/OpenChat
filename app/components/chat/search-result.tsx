"use client"

import { Globe, ArrowSquareOut, CaretDown, CaretUp } from "@phosphor-icons/react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/prompt-kit/markdown"
import Image from "next/image"

interface SearchResult {
  url: string
  title: string
  description: string
  content?: string
  markdown?: string
}

interface SearchResultsProps {
  results: SearchResult[]
  isLoading?: boolean
  error?: string
}

export function SearchResults({ results, isLoading, error }: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedResults(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary animate-pulse" />
          <span className="font-medium text-primary">Searching the web...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-destructive" />
          <span className="font-medium text-destructive">Search failed</span>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">No results found</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="size-4 text-primary" />
        <span className="font-medium text-primary">Web Search</span>
        <span className="text-sm text-muted-foreground">• {results.length} results</span>
      </div>

      <div className="space-y-2">
        {results.map((result, index) => {
          const isExpanded = expandedResults.has(index)
          const domain = new URL(result.url).hostname.replace('www.', '')

          return (
            <div
              key={index}
              className={cn(
                "group rounded-lg border bg-card transition-all hover:shadow-sm",
                isExpanded && "shadow-sm"
              )}
            >
              <button
                onClick={() => toggleExpanded(index)}
                className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <Image
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                    alt=""
                    className="size-5 mt-0.5 rounded"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">
                        {result.title}
                      </h3>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ArrowSquareOut className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </a>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">{domain}</p>
                    
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {result.description}
                    </p>
                  </div>

                  <div className="ml-2">
                    {isExpanded ? (
                      <CaretUp className="size-4 text-muted-foreground" />
                    ) : (
                      <CaretDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && result.content && (
                <div className="px-4 pb-4 -mt-2">
                  <div className="pl-8 pt-2 border-t">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{result.content}</Markdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
} 