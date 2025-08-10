'use client';

import { useMutation } from 'convex/react';
import { AlertCircle, Check, Key, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/app/providers/user-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';

import {
  getApiKeyProviders,
  type ApiKeyProvider as Provider,
  validateApiKey,
} from '@/lib/config/api-keys';

// Get dynamic provider data from model configuration
const PROVIDERS = getApiKeyProviders();

// Helper component for delete icon
function DeleteIcon() {
  return <Trash2 className="size-4" />;
}

// Helper component for success checkmark
function CheckIcon() {
  return <Check className="size-4 text-green-500" />;
}

// Helper component for error icon
function ErrorIcon() {
  return <AlertCircle className="size-3" />;
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
      <Switch checked={checked} id={switchId} onCheckedChange={onChange} />
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
  // Handle Enter key press to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isValidating) {
        e.preventDefault();
        onSave();
      }
    },
    [onSave, isValidating]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Input
            className={validationError ? 'border-red-500' : ''}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
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
            <Key className="size-4" />
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
            <Badge key={m} variant="secondary">
              {m}
            </Badge>
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
  const { apiKeys } = useUser();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(
    null
  );

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

  const handleDelete = useCallback((provider: Provider) => {
    setProviderToDelete(provider);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!providerToDelete) {
      return;
    }
    try {
      await deleteApiKey({ provider: providerToDelete });
      toast({ title: 'API key deleted', status: 'success' });
    } catch {
      // Error handling without console
      toast({ title: 'Failed to delete key', status: 'error' });
    } finally {
      setShowDeleteDialog(false);
      setProviderToDelete(null);
    }
  }, [deleteApiKey, providerToDelete]);

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
        <h1 className="font-bold text-2xl">API Keys</h1>
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Bring your own API keys for select models. Messages sent using your
            API keys will not count towards your monthly limits.
          </p>
          <p className="text-muted-foreground text-xs">
            Note: For optional API key models, you can choose Priority (always
            use your API key first) or Fallback (use your credits first, then
            your API key).
          </p>
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

      {/* Delete confirmation dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API key?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              saved API key for{' '}
              {providerToDelete &&
                PROVIDERS.find((p) => p.id === providerToDelete)?.title}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
