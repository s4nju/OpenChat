'use client';

import { EyeIcon, FilePdfIcon, GlobeIcon } from '@phosphor-icons/react';
import { Link as LinkIcon, Wrench } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MODEL_DEFAULT, MODELS_OPTIONS, PROVIDERS_OPTIONS } from '@/lib/config';
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
    label: 'Tool Calling',
    icon: Wrench,
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
    return MODELS_OPTIONS.filter((m) =>
      Array.from(filters).every((f) =>
        m.features.some((feat) => feat.id === f && feat.enabled)
      )
    );
  }, [filters]);

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

  return (
    <div className="w-full">
      <div className="space-y-6">
        <h1 className="font-bold text-2xl">Available Models</h1>
        <p className="max-w-prose text-muted-foreground text-sm">
          Choose which models appear in your model selector. This won't affect
          existing conversations.
        </p>

        <div className="flex items-center justify-between gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary">
                Filter by features
              </Button>
            </PopoverTrigger>
            <PopoverContent className="space-y-2">
              {allFeatures.map((fid) => {
                const info = FEATURE_INFO[fid];
                if (!info) {
                  return null;
                }
                return (
                  <label className="flex items-center gap-2 text-sm" key={fid}>
                    <input
                      checked={filters.has(fid)}
                      className="size-4 accent-primary"
                      onChange={() => toggleFilter(fid)}
                      type="checkbox"
                    />
                    {info.label}
                  </label>
                );
              })}
            </PopoverContent>
          </Popover>

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
                        className="h-full w-full"
                        provider={provider}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-1">
                        <h3 className="font-medium">{model.name}</h3>
                      </div>
                      <ToggleSwitch
                        checked={enabled.includes(model.id)}
                        onChange={() => handleToggle(model.id)}
                      />
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
                              <Icon className="h-2.5 w-2.5 brightness-75 sm:h-3 sm:w-3 dark:filter-none" />
                              <span className="whitespace-nowrap brightness-75 dark:filter-none">
                                {info.label}
                              </span>
                            </Badge>
                          );
                        })}
                      </div>
                      <a
                        className="hidden h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:flex [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                        href={`https://www.google.com/search?q=${encodeURIComponent(
                          model.name
                        )}`}
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
