'use client';

import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';

// Define the provider type to match the mutation
type Provider =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'mistral'
  | 'meta'
  | 'Qwen'
  | 'gemini';

// API key validation patterns
const API_KEY_PATTERNS = {
  openai: /^sk-[a-zA-Z0-9]{20,}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{8,}$/,
  gemini: /^AIza[a-zA-Z0-9_-]{35,}$/,
} as const;

// Validation function
function validateApiKey(
  provider: Provider,
  key: string
): { isValid: boolean; error?: string } {
  if (!key.trim()) {
    return { isValid: false, error: 'API key is required' };
  }

  const pattern = API_KEY_PATTERNS[provider as keyof typeof API_KEY_PATTERNS];
  if (!pattern) {
    return { isValid: true }; // No specific pattern for this provider
  }

  if (!pattern.test(key)) {
    switch (provider) {
      case 'openai':
        return {
          isValid: false,
          error:
            "OpenAI API keys should start with 'sk-' followed by at least 20 characters",
        };
      case 'anthropic':
        return {
          isValid: false,
          error:
            "Anthropic API keys should start with 'sk-ant-' followed by at least 8 characters (letters, numbers, hyphens, underscores)",
        };
      case 'gemini':
        return {
          isValid: false,
          error:
            "Google API keys should start with 'AIza' followed by 35+ characters",
        };
      default:
        return { isValid: false, error: 'Invalid API key format' };
    }
  }

  return { isValid: true };
}

const PROVIDERS: Array<{
  id: Provider;
  title: string;
  placeholder: string;
  docs: string;
  models: string[];
}> = [
  {
    id: 'anthropic',
    title: 'Anthropic API Key',
    placeholder: 'sk-ant...',
    docs: 'https://console.anthropic.com/account/keys',
    models: [
      'Claude 3.5 Sonnet',
      'Claude 3.7 Sonnet',
      'Claude 3.7 Sonnet (Reasoning)',
      'Claude 4 Opus',
      'Claude 4 Sonnet',
      'Claude 4 Sonnet (Reasoning)',
    ],
  },
  {
    id: 'openai',
    title: 'OpenAI API Key',
    placeholder: 'sk-...',
    docs: 'https://platform.openai.com/api-keys',
    models: ['GPT-4.5', 'o3', 'o3 Pro'],
  },
  {
    id: 'gemini',
    title: 'Google API Key',
    placeholder: 'AIza...',
    docs: 'https://console.cloud.google.com/apis/credentials',
    models: [
      'Gemini 2.0 Flash',
      'Gemini 2.0 Flash Lite',
      'Gemini 2.5 Flash',
      'Gemini 2.5 Flash (Thinking)',
      'Gemini 2.5 Flash Lite',
      'Gemini 2.5 Flash Lite (Thinking)',
      'Gemini 2.5 Pro',
    ],
  },
] as const;

// Helper component for API key icons
function ApiKeyIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>API Key</title>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 0 1.4Z" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  );
}

// Helper component for delete icon
function DeleteIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Delete</title>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

// Helper component for success checkmark
function CheckIcon() {
  return (
    <svg
      className="size-4 text-green-500"
      fill="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Success</title>
      <path
        clipRule="evenodd"
        d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

// Helper component for error icon
function ErrorIcon() {
  return (
    <svg
      className="size-3"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Error</title>
      <path
        clipRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

// Helper component for toggle switch
function ToggleSwitch({
  checked,
  onChange,
  providerId,
}: {
  checked: boolean;
  onChange: (isChecked: boolean) => void;
  providerId: Provider;
}) {
  const switchId = `toggle-${providerId}`;

  return (
    <div className="flex items-center gap-2">
      <button
        aria-checked={checked}
        className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            : 'bg-muted hover:bg-muted/80'
        }`}
        data-state={checked ? 'checked' : 'unchecked'}
        id={switchId}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 dark:bg-white"
          data-state={checked ? 'checked' : 'unchecked'}
        />
      </button>
      <label
        className={`text-sm ${checked ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}
        htmlFor={switchId}
      >
        {checked ? 'Priority' : 'Fallback'}
      </label>
    </div>
  );
}

// Helper component for API key input form
function ApiKeyInputForm({
  placeholder,
  docs,
  title,
  validationError,
  isValidating,
  onSave,
  onInputChange,
  inputRef,
}: {
  placeholder: string;
  docs: string;
  title: string;
  validationError?: string;
  isValidating: boolean;
  onSave: () => void;
  onInputChange: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Input
            className={validationError ? 'border-red-500' : ''}
            onChange={onInputChange}
            placeholder={placeholder}
            ref={inputRef}
            type="password"
          />
        </div>
        {validationError && (
          <p className="flex items-center gap-1 text-red-500 text-xs">
            <ErrorIcon />
            {validationError}
          </p>
        )}
        <p className="prose prose-pink text-muted-foreground text-xs">
          Get your API key from{' '}
          <a
            className="no-underline hover:underline"
            href={docs}
            rel="noopener noreferrer"
            target="_blank"
          >
            {title.split(' ')[0]}&apos;s Dashboard
          </a>
        </p>
      </div>
      <div className="flex w-full justify-end gap-2">
        <Button disabled={isValidating} onClick={onSave}>
          {isValidating ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// Helper component for provider card
function ProviderCard({
  providerConfig,
  savedApiKeys,
  validationErrors,
  isValidating,
  onSave,
  onInputChange,
  onDelete,
  onToggle,
  inputRefs,
}: {
  providerConfig: (typeof PROVIDERS)[0];
  savedApiKeys: Array<{ provider: string; mode?: string }>;
  validationErrors: Record<string, string>;
  isValidating: Record<string, boolean>;
  onSave: (provider: Provider) => void;
  onInputChange: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
  onToggle: (provider: Provider, checked: boolean) => void;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  const hasKey = savedApiKeys.some((k) => k.provider === providerConfig.id);
  const getMode = () => {
    const apiKey = savedApiKeys.find((k) => k.provider === providerConfig.id);
    return (apiKey?.mode || 'fallback') === 'priority';
  };

  return (
    <div className="space-y-4 rounded-lg border p-4" key={providerConfig.id}>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <ApiKeyIcon />
            {providerConfig.title}
          </h3>
          {hasKey && (
            <div className="flex items-center gap-4">
              <ToggleSwitch
                checked={getMode()}
                onChange={(checked) => onToggle(providerConfig.id, checked)}
                providerId={providerConfig.id}
              />
              <Button
                onClick={() => onDelete(providerConfig.id)}
                size="icon"
                variant="ghost"
              >
                <DeleteIcon />
              </Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Used for the following models:
        </p>
        <div className="flex flex-wrap gap-2">
          {providerConfig.models.map((m) => (
            <span
              className="rounded-full bg-secondary px-2 py-1 text-xs"
              key={m}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      {hasKey ? (
        <div className="flex items-center gap-2 text-sm">
          <CheckIcon />
          <span>API key configured</span>
        </div>
      ) : (
        <ApiKeyInputForm
          docs={providerConfig.docs}
          inputRef={(el) => {
            inputRefs.current[providerConfig.id] = el;
          }}
          isValidating={isValidating[providerConfig.id]}
          onInputChange={() => onInputChange(providerConfig.id)}
          onSave={() => onSave(providerConfig.id)}
          placeholder={providerConfig.placeholder}
          title={providerConfig.title}
          validationError={validationErrors[providerConfig.id]}
        />
      )}
    </div>
  );
}

export default function ApiKeysPage() {
  const apiKeys = useQuery(api.api_keys.getApiKeys) ?? [];
  const saveApiKey = useMutation(api.api_keys.saveApiKey);
  const deleteApiKey = useMutation(api.api_keys.deleteApiKey);
  const updateMode = useMutation(api.api_keys.updateApiKeyMode);

  // Use refs to store API key inputs securely - not exposed in React DevTools
  // This prevents sensitive API keys from being visible in component state
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({});

  // Clear all input values on component unmount for security
  useEffect(() => {
    const currentInputs = inputRefs.current;
    return () => {
      for (const input of Object.values(currentInputs)) {
        if (input) {
          input.value = '';
        }
      }
    };
  }, []);

  const handleSave = useCallback(
    async (provider: Provider) => {
      const inputElement = inputRefs.current[provider];
      const key = inputElement?.value || '';

      if (!key.trim()) {
        return;
      }

      // Validate the API key
      const validation = validateApiKey(provider, key);
      if (!validation.isValid) {
        setValidationErrors((prev) => ({
          ...prev,
          [provider]: validation.error || 'Invalid API key',
        }));
        return;
      }

      // Clear validation error
      setValidationErrors((prev) => ({ ...prev, [provider]: '' }));
      setIsValidating((prev) => ({ ...prev, [provider]: true }));

      try {
        await saveApiKey({ provider, key });
        toast({ title: 'API key saved', status: 'success' });

        // Immediately clear the input value for security
        if (inputElement) {
          inputElement.value = '';
        }
      } catch {
        // Error handling without console
        toast({ title: 'Failed to save key', status: 'error' });
      } finally {
        setIsValidating((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [saveApiKey]
  );

  const handleInputChange = useCallback(
    (provider: Provider) => {
      // Clear validation error when user starts typing
      if (validationErrors[provider]) {
        setValidationErrors((prev) => ({ ...prev, [provider]: '' }));
      }
    },
    [validationErrors]
  );

  const handleDelete = useCallback(
    async (provider: Provider) => {
      if (!confirm('Delete saved API key?')) {
        return;
      }
      try {
        await deleteApiKey({ provider });
        toast({ title: 'API key deleted', status: 'success' });
      } catch {
        // Error handling without console
        toast({ title: 'Failed to delete key', status: 'error' });
      }
    },
    [deleteApiKey]
  );

  const handleToggle = useCallback(
    async (provider: Provider, checked: boolean) => {
      try {
        await updateMode({ provider, mode: checked ? 'priority' : 'fallback' });
      } catch {
        // Error handling without console
        toast({ title: 'Failed to update mode', status: 'error' });
      }
    },
    [updateMode]
  );

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl">API Keys</h1>
          <div className="mt-2 space-y-2">
            <p className="text-muted-foreground text-xs">
              Bring your own API keys for select models. Messages sent using
              your API keys will not count towards your monthly limits.
            </p>
            <p className="text-muted-foreground text-xs">
              Note: For optional API key models, you can choose Priority (always
              use your API key first) or Fallback (use your credits first, then
              your API key).
            </p>
          </div>
        </div>
        {PROVIDERS.map((providerConfig) => (
          <ProviderCard
            inputRefs={inputRefs}
            isValidating={isValidating}
            key={providerConfig.id}
            onDelete={handleDelete}
            onInputChange={handleInputChange}
            onSave={handleSave}
            onToggle={handleToggle}
            providerConfig={providerConfig}
            savedApiKeys={apiKeys}
            validationErrors={validationErrors}
          />
        ))}
      </div>
    </div>
  );
}
