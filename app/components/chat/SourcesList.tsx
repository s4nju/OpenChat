"use client"

import { cn } from "@/lib/utils"
import type { SourceUIPart } from "@ai-sdk/ui-utils"
import { CaretDown, Link, Globe } from "@phosphor-icons/react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

type SourcesListProps = {
  sources: SourceUIPart["source"][]
  className?: string
}

const getFavicon = (url: string) => {
  const domain = new URL(url).hostname
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

const getOpenGraphImage = (url: string) => {
  // Use a service to get OpenGraph images - you can replace this with your preferred service
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&waitFor=0&type=jpeg&overlay.browser=false&viewport.width=1200&viewport.height=630`
}

const addUTM = (url: string) => {
  const u = new URL(url)
  u.searchParams.set("utm_source", "chat.ajanraj.com")
  u.searchParams.set("utm_medium", "web-search")
  return u.toString()
}

const TRANSITION = {
  type: "spring",
  duration: 0.2,
  bounce: 0,
}

export function SourcesList({ sources, className }: SourcesListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const formatUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return domain.replace(/^www\./, "")
    } catch {
      return url
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .replace(/^www\./, "")
    }
  }

  const handleImageError = (sourceId: string) => {
    setImageErrors(prev => new Set([...prev, sourceId]))
  }

  return (
    <div className={cn("my-4", className)}>
      <div className="border-border flex flex-col gap-0 overflow-hidden rounded-lg border bg-card">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          className="hover:bg-accent flex w-full flex-row items-center px-4 py-3 transition-colors"
        >
          <div className="flex flex-1 flex-row items-center gap-3 text-left">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sources ({sources.length})</span>
            <div className="flex -space-x-1">
              {sources.slice(0, 4).map((source) => (
                <Image
                  key={source.id}
                  unoptimized
                  loader={({ src }) => src}
                  src={getFavicon(source.url)}
                  width={16}
                  height={16}
                  alt={`Favicon for ${source.title}`}
                  className="border-background h-4 w-4 rounded-full border-2"
                />
              ))}
              {sources.length > 4 && (
                <div className="bg-muted text-muted-foreground flex h-4 w-4 items-center justify-center rounded-full border-2 border-background text-xs font-medium">
                  +{sources.length - 4}
                </div>
              )}
            </div>
          </div>
          <CaretDown
            className={cn(
              "h-4 w-4 transition-transform text-muted-foreground",
              isExpanded ? "rotate-180 transform" : ""
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={TRANSITION}
              className="overflow-hidden"
            >
              <div className="border-t border-border">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3 p-4 min-w-max">
                    {sources.map((source) => (
                      <motion.div
                        key={source.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0 w-64"
                      >
                        <a
                          href={addUTM(source.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <div className="bg-background hover:bg-accent/50 overflow-hidden rounded-lg border transition-colors">
                            {/* OpenGraph Image */}
                            <div className="relative h-32 w-full overflow-hidden bg-muted">
                              {!imageErrors.has(source.id) ? (
                                <Image
                                  src={getOpenGraphImage(source.url)}
                                  alt={`Preview for ${source.title}`}
                                  fill
                                  className="object-cover scale-110 transition-transform hover:scale-115"
                                  onError={() => handleImageError(source.id)}
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Globe className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              {/* Favicon overlay */}
                              <div className="absolute bottom-2 left-2">
                                <div className="bg-background/90 backdrop-blur-sm rounded-full p-1">
                                  <Image
                                    unoptimized
                                    loader={({ src }) => src}
                                    src={getFavicon(source.url)}
                                    width={16}
                                    height={16}
                                    alt={`Favicon for ${source.title}`}
                                    className="h-4 w-4 rounded-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-3 h-20 flex flex-col justify-between">
                              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                {source.title}
                              </h3>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-muted-foreground text-xs line-clamp-1 flex-1">
                                  {formatUrl(source.url)}
                                </p>
                                <div className="ml-2">
                                  <Link className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Scroll hint */}
                {sources.length > 1 && (
                  <div className="px-4 pb-2">
                    <div className="text-muted-foreground text-xs text-center">
                      Scroll horizontally to view more sources →
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
