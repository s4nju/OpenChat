'use client';

import {
  BrainIcon,
  EyeIcon,
  FilePdfIcon,
  GlobeIcon,
  SketchLogoIcon,
} from '@phosphor-icons/react';
import { Link as LinkIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  color: string;
  colorDark: string;
};

const FEATURE_INFO: Record<string, FeatureInfo> = {
  'file-upload': {
    label: 'Vision',
    icon: EyeIcon,
    color: 'hsl(168 54% 52%)',
    colorDark: 'hsl(168 54% 74%)',
  },
  'pdf-processing': {
    label: 'PDF Comprehension',
    icon: FilePdfIcon,
    color: 'hsl(237 55% 57%)',
    colorDark: 'hsl(237 75% 77%)',
  },
  reasoning: {
    label: 'Reasoning',
    icon: BrainIcon,
    color: 'hsl(10 54% 54%)',
    colorDark: 'hsl(10 74% 74%)',
  },
  'web-search': {
    label: 'Web Search',
    icon: GlobeIcon,
    color: 'hsl(211 55% 55%)',
    colorDark: 'hsl(211 72% 75%)',
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
        checked ? 'bg-primary' : 'bg-secondary'
      )}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
        data-state={checked ? 'checked' : 'unchecked'}
      />
    </button>
  );
}

export default function ModelsPage() {
  const { user, updateUser } = useUser();
  const [enabled, setEnabled] = useState<string[]>(
    () => user?.enabledModels ?? [MODEL_DEFAULT]
  );
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [freeOnly, setFreeOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setEnabled(user.enabledModels ?? [MODEL_DEFAULT]);
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

  const filteredModels = useMemo(() => {
    return MODELS_OPTIONS.filter((m) => {
      if (freeOnly && m.usesPremiumCredits) {
        return false;
      }
      return Array.from(filters).every((f) =>
        m.features.some((feat) => feat.id === f && feat.enabled)
      );
    });
  }, [filters, freeOnly]);

  const handleToggle = async (id: string) => {
    let next = enabled.includes(id)
      ? enabled.filter((m) => m !== id)
      : [...enabled, id];
    if (!next.includes(MODEL_DEFAULT)) {
      next = [...next, MODEL_DEFAULT];
    }
    setEnabled(next);
    await updateUser({ enabledModels: next });
  };

  const handleRecommended = async () => {
    const rec = [...RECOMMENDED_MODELS];
    if (!rec.includes(MODEL_DEFAULT)) {
      rec.push(MODEL_DEFAULT);
    }
    setEnabled(rec);
    await updateUser({ enabledModels: rec });
  };

  const handleUnselectAll = async () => {
    const next = [MODEL_DEFAULT];
    setEnabled(next);
    await updateUser({ enabledModels: next });
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

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="font-bold text-2xl">Available Models</h1>
        <p className="max-w-prose text-muted-foreground text-sm">
          Choose which models appear in your model selector. This won't affect
          existing conversations.
        </p>

        <div className="flex items-center justify-between gap-2">
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
                        className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md text-[--color] dark:text-[--color-dark]"
                        style={
                          {
                            '--color': info.color,
                            '--color-dark': info.colorDark,
                          } as React.CSSProperties
                        }
                      >
                        <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                        <Icon className="h-4 w-4" />
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
            <button
              className="text-muted-foreground text-sm hover:underline"
              onClick={() => {
                setFilters(new Set());
                setFreeOnly(false);
              }}
              type="button"
            >
              Clear
            </button>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleRecommended} size="sm">
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
                          <SketchLogoIcon
                            className="h-3 w-3 text-muted-foreground"
                            weight="regular"
                          />
                        )}
                      </div>
                      <ToggleSwitch
                        checked={enabled.includes(model.id)}
                        onChange={() => handleToggle(model.id)}
                      />
                    </div>
                    <div className="relative">
                      <p className="mr-12 whitespace-pre-line text-xs sm:text-sm">
                        {expanded[model.id]
                          ? model.description
                          : model.description.split('\n')[0]}
                      </p>
                      <button
                        className="mt-1 text-xs"
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
                            <Badge
                              className="relative flex items-center gap-1 overflow-hidden rounded-full px-1.5 py-0.5 text-[10px] sm:gap-1.5 sm:px-2 sm:text-xs dark:text-[--color-dark]"
                              key={feat.id}
                              style={
                                {
                                  '--color': info.color,
                                  '--color-dark': info.colorDark,
                                } as React.CSSProperties
                              }
                            >
                              <div className="absolute inset-0 bg-current opacity-20 dark:opacity-15" />
                              <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="whitespace-nowrap">
                                {info.label}
                              </span>
                            </Badge>
                          );
                        })}
                      </div>
                      <a
                        className="hidden h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:flex [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                        href={`${APP_BASE_URL}?model=${model.id}&q=`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <LinkIcon className="mr-1.5 h-2 w-2" /> Search URL
                      </a>
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
