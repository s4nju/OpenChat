'use client';

import {
  BrainIcon,
  EyeIcon,
  FilePdfIcon,
  GlobeIcon,
  SketchLogoIcon,
} from '@phosphor-icons/react';
import { Check, ImagePlus, Key, Link as LinkIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ProviderIcon } from '@/app/components/common/provider-icon';
import { useUser } from '@/app/providers/user-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  APP_BASE_URL,
  MODEL_DEFAULT,
  MODELS_OPTIONS,
  PROVIDERS_OPTIONS,
} from '@/lib/config';
import { cn } from '@/lib/utils';

type FeatureInfo = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FEATURE_INFO: Record<string, FeatureInfo> = {
  'file-upload': {
    label: 'Vision',
    icon: EyeIcon,
  },
  'pdf-processing': {
    label: 'PDF Comprehension',
    icon: FilePdfIcon,
  },
  reasoning: {
    label: 'Reasoning',
    icon: BrainIcon,
  },
  'web-search': {
    label: 'Web Search',
    icon: GlobeIcon,
  },
  'image-generation': {
    label: 'Image Generation',
    icon: ImagePlus,
  },
};

const RECOMMENDED_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gpt-4o-mini',
  'o4-mini',
  'claude-4-sonnet-reasoning',
  'deepseek-r1-0528',
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (isChecked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'bg-primary hover:bg-primary/90'
          : 'bg-muted hover:bg-muted/80'
      )}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-background',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
        data-state={checked ? 'checked' : 'unchecked'}
      />
    </button>
  );
}

// Get the appropriate color classes for each feature
const getFeatureColorClasses = (featureId: string) => {
  switch (featureId) {
    case 'file-upload':
      return 'text-teal-600 dark:text-teal-400';
    case 'pdf-processing':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'reasoning':
      return 'text-pink-600 dark:text-pink-400';
    case 'web-search':
      return 'text-blue-600 dark:text-blue-400';
    case 'image-generation':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-muted-foreground';
  }
};

export default function ModelsPage() {
  const { user, updateUser } = useUser();
  const [disabled, setDisabled] = useState<Set<string>>(
    () => new Set(user?.disabledModels ?? [])
  );
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [freeOnly, setFreeOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setDisabled(new Set(user.disabledModels ?? []));
    }
  }, [user]);

  const allFeatures = useMemo(() => {
    const f = new Set<string>();
    for (const m of MODELS_OPTIONS) {
      for (const feat of m.features) {
        if (feat.enabled) {
          f.add(feat.id);
        }
      }
    }
    return Array.from(f);
  }, []);

  const isModelEnabled = (id: string) => !disabled.has(id);

  const filteredModels = useMemo(() => {
    return MODELS_OPTIONS.filter((m) => {
      if (freeOnly && m.premium) {
        return false;
      }
      return Array.from(filters).every((f) =>
        m.features.some((feat) => feat.id === f && feat.enabled)
      );
    });
  }, [filters, freeOnly]);

  const handleToggle = async (id: string) => {
    const next = new Set(disabled);
    if (next.has(id)) {
      next.delete(id);
    } else if (id !== MODEL_DEFAULT) {
      next.add(id);
    }
    setDisabled(next);
    await updateUser({ disabledModels: Array.from(next) });
  };

  const handleRecommended = async () => {
    // Recommended: disable all not in rec
    const recSet = new Set<string>();
    for (const id of MODELS_OPTIONS.map((m) => m.id)) {
      if (!RECOMMENDED_MODELS.includes(id) && id !== MODEL_DEFAULT) {
        recSet.add(id);
      }
    }
    setDisabled(recSet);
    await updateUser({ disabledModels: Array.from(recSet) });
  };

  const handleUnselectAll = async () => {
    const next = new Set<string>(); // no disabled models
    setDisabled(next);
    await updateUser({ disabledModels: [] });
    setShowConfirm(false);
  };

  const toggleFilter = (id: string) => {
    setFilters((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const toggleFree = () => {
    setFreeOnly((prev) => !prev);
  };

  const handleCopy = async (id: string) => {
    try {
      const base =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : APP_BASE_URL;
      const u = new URL(base);
      u.searchParams.set('model', id); // encodes automatically
      u.searchParams.set('q', '%s'); // encodes to %25s
      const searchUrl = u.toString().replace('%25s', '%s');
      await navigator.clipboard.writeText(searchUrl);
      setCopied(id);
      setTimeout(() => {
        setCopied((prev) => (prev === id ? null : prev));
      }, 1000);
    } catch {
      toast.error('Failed to copy to clipboard. Please try again.');
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="font-bold text-2xl">Available Models</h1>
        <p className="max-w-prose text-muted-foreground text-sm">
          Choose which models appear in your model selector. This won't affect
          existing conversations.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">
                  {`Filter by features${filters.size ? ` (${filters.size})` : ''}`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {allFeatures.map((fid) => {
                  const info = FEATURE_INFO[fid];
                  if (!info) {
                    return null;
                  }
                  const Icon = info.icon;
                  const checked = filters.has(fid);
                  return (
                    <DropdownMenuItem
                      aria-checked={checked}
                      className="flex items-center justify-between"
                      data-state={checked ? 'checked' : 'unchecked'}
                      key={fid}
                      onSelect={(e) => {
                        e.preventDefault();
                        toggleFilter(fid);
                      }}
                      role="menuitemcheckbox"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md',
                            getFeatureColorClasses(fid)
                          )}
                        >
                          <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                          <Icon
                            className={cn(
                              'relative h-4 w-4',
                              getFeatureColorClasses(fid)
                            )}
                          />
                        </div>
                        <span>{info.label}</span>
                      </div>
                      <span className="flex h-3.5 w-3.5 items-center justify-center">
                        {checked && (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <title>Selected</title>
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  aria-checked={freeOnly}
                  className="flex items-center justify-between"
                  data-state={freeOnly ? 'checked' : 'unchecked'}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleFree();
                  }}
                  role="menuitemcheckbox"
                >
                  <span>Only show free plan models</span>
                  <span className="flex h-3.5 w-3.5 items-center justify-center">
                    {freeOnly && (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>Selected</title>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {(filters.size > 0 || freeOnly) && (
              <Button
                className="h-8 px-3"
                onClick={() => {
                  setFilters(new Set());
                  setFreeOnly(false);
                }}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="hidden md:inline-flex"
              onClick={handleRecommended}
              size="sm"
            >
              Select Recommended Models
            </Button>
            <AlertDialog onOpenChange={setShowConfirm} open={showConfirm}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  Unselect All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unselect All Models?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to unselect all models?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnselectAll}>
                    Unselect All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-4">
          {filteredModels.length === 0 && (
            <div className="h-full space-y-4 overflow-y-auto py-16">
              <div className="flex h-full flex-col items-center justify-center gap-6 py-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted-foreground/30 border-dashed bg-muted/20">
                    <svg
                      className="h-8 w-8 text-muted-foreground/60"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Filter empty</title>
                      <path d="M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.055" />
                      <path d="m22 3-5 5" />
                      <path d="m17 3 5 5" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg text-muted-foreground">
                      No models found
                    </h3>
                    <p className="text-muted-foreground/80 text-sm">
                      No models match your current filters. Try adjusting your
                      filter criteria or clear all filters to see all available
                      models.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {filteredModels.map((model) => {
            const provider = PROVIDERS_OPTIONS.find(
              (p) => p.id === model.provider
            );
            return (
              <div
                className="relative flex flex-col rounded-lg border border-input p-3 sm:p-4"
                key={model.id}
              >
                <div className="flex w-full items-start gap-4">
                  <div className="relative h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10">
                    {provider && (
                      <ProviderIcon
                        className="h-full w-full text-muted-foreground grayscale"
                        provider={provider}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-1">
                        <h3 className="font-medium">{model.name}</h3>
                        {model.usesPremiumCredits && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <SketchLogoIcon
                                  className="h-3 w-3 text-muted-foreground"
                                  weight="regular"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Premium Model</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {model.apiKeyUsage.userKeyOnly && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <Key className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Requires API Key</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <ToggleSwitch
                        checked={isModelEnabled(model.id)}
                        onChange={() => handleToggle(model.id)}
                      />
                    </div>
                    <div className="relative">
                      <p className="mr-12 text-xs sm:text-sm">
                        {(() => {
                          if (!model.description) {
                            return '';
                          }
                          if (expanded[model.id]) {
                            return model.description.replace(/\n/g, ' ');
                          }
                          return model.description.split('\n')[0];
                        })()}
                      </p>
                      {model.description &&
                        model.description.split('\n').length > 1 && (
                          <button
                            className="mt-1 cursor-pointer text-xs"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [model.id]: !prev[model.id],
                              }))
                            }
                            type="button"
                          >
                            {expanded[model.id] ? 'Show less' : 'Show more'}
                          </button>
                        )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1 sm:mt-2 sm:gap-2">
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {model.features.map((feat) => {
                          if (!feat.enabled) {
                            return null;
                          }
                          const info = FEATURE_INFO[feat.id];
                          if (!info) {
                            return null;
                          }
                          const Icon = info.icon;

                          return (
                            <div
                              className={cn(
                                'relative flex items-center gap-1 overflow-hidden rounded-full px-1.5 py-0.5 text-[10px] sm:gap-1.5 sm:px-2 sm:text-xs',
                                getFeatureColorClasses(feat.id)
                              )}
                              key={feat.id}
                            >
                              <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                              <Icon className="relative h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="relative whitespace-nowrap">
                                {info.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        className="hidden h-8 w-30 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:flex [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                        onClick={() => handleCopy(model.id)}
                        type="button"
                      >
                        <span className="flex w-full items-center justify-center">
                          {copied === model.id ? (
                            <>
                              <Check className="mr-1.5 h-2 w-2" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <LinkIcon className="mr-1.5 h-2 w-2" />
                              <span>Search URL</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
