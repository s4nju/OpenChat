'use client';

import type { SourceUIPart } from '@ai-sdk/ui-utils';
import { CaretDown, Globe, Link } from '@phosphor-icons/react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Regex patterns defined at top level for performance
const WWW_PREFIX_REGEX = /^www\./;
const PROTOCOL_REGEX = /^https?:\/\//;
const TRAILING_SLASH_REGEX = /\/$/;

type SourcesListProps = {
  sources: SourceUIPart['source'][];
  className?: string;
};

const getFavicon = (url: string) => {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

const getOpenGraphImage = (url: string) => {
  // Use a service to get OpenGraph images - you can replace this with your preferred service
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&waitFor=0&type=jpeg&overlay.browser=false&viewport.width=1200&viewport.height=630`;
};

const addUTM = (url: string) => {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'chat.ajanraj.com');
  u.searchParams.set('utm_medium', 'web-search');
  return u.toString();
};

const TRANSITION: Transition = {
  type: 'spring',
  duration: 0.2,
  bounce: 0,
};

export function SourcesList({ sources, className }: SourcesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const formatUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace(WWW_PREFIX_REGEX, '');
    } catch {
      return url
        .replace(PROTOCOL_REGEX, '')
        .replace(TRAILING_SLASH_REGEX, '')
        .replace(WWW_PREFIX_REGEX, '');
    }
  };

  const handleImageError = (sourceId: string) => {
    setImageErrors((prev) => new Set([...prev, sourceId]));
  };

  return (
    <div className={cn('my-4', className)}>
      <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card">
        <button
          className="flex w-full flex-row items-center px-4 py-3 transition-colors hover:bg-accent"
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
        >
          <div className="flex flex-1 flex-row items-center gap-3 text-left">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              Sources ({sources.length})
            </span>
            <div className="-space-x-1 flex">
              {sources.slice(0, 4).map((source) => (
                <Image
                  alt={`Favicon for ${source.title}`}
                  className="h-4 w-4 rounded-full border-2 border-background"
                  height={16}
                  key={source.id}
                  loader={({ src }) => src}
                  src={getFavicon(source.url)}
                  unoptimized
                  width={16}
                />
              ))}
              {sources.length > 4 && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground text-xs">
                  +{sources.length - 4}
                </div>
              )}
            </div>
          </div>
          <CaretDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded ? 'rotate-180 transform' : ''
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={TRANSITION}
            >
              <div className="border-border border-t">
                <div className="scrollbar-hide overflow-x-auto">
                  <div className="flex min-w-max gap-3 p-4">
                    {sources.map((source) => (
                      <motion.div
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-64 flex-shrink-0"
                        initial={{ opacity: 0, scale: 0.95 }}
                        key={source.id}
                        transition={{ duration: 0.2 }}
                      >
                        <a
                          className="group block"
                          href={addUTM(source.url)}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <div className="overflow-hidden rounded-lg border bg-background transition-colors hover:bg-accent/50">
                            {/* OpenGraph Image */}
                            <div className="relative h-32 w-full overflow-hidden bg-muted">
                              {imageErrors.has(source.id) ? (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Globe className="h-8 w-8 text-muted-foreground" />
                                </div>
                              ) : (
                                <Image
                                  alt={`Preview for ${source.title}`}
                                  blurDataURL="data:image/jpeg;base64,..."
                                  className="scale-110 object-cover transition-transform hover:scale-115"
                                  fill
                                  loading="lazy"
                                  onError={() => handleImageError(source.id)}
                                  placeholder="blur"
                                  src={getOpenGraphImage(source.url)}
                                  // Remove unoptimized to enable Next.js optimization
                                />
                              )}
                              {/* Favicon overlay */}
                              <div className="absolute bottom-2 left-2">
                                <div className="rounded-full bg-background/90 p-1 backdrop-blur-sm">
                                  <Image
                                    alt={`Favicon for ${source.title}`}
                                    className="h-4 w-4 rounded-sm"
                                    height={16}
                                    loader={({ src }) => src}
                                    src={getFavicon(source.url)}
                                    unoptimized
                                    width={16}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex h-20 flex-col justify-between p-3">
                              <h3 className="line-clamp-2 font-medium text-sm transition-colors group-hover:text-primary">
                                {source.title}
                              </h3>
                              <div className="mt-1 flex items-center justify-between">
                                <p className="line-clamp-1 flex-1 text-muted-foreground text-xs">
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
                    <div className="text-center text-muted-foreground text-xs">
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
  );
}
