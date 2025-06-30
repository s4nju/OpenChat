'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { APP_NAME } from '@/lib/config';

export default function CustomizationPage() {
  const { user, updateUser } = useUser();
  const router = useRouter();

  const [preferredName, setPreferredName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [about, setAbout] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPreferredName(user.preferredName || '');
      setOccupation(user.occupation || '');
      setTraits(user.traits ? user.traits.split(', ') : []);
      setAbout(user.about || '');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const initialTraits = user.traits ? user.traits.split(', ') : [];
      const hasChanges =
        (user.preferredName || '') !== preferredName ||
        (user.occupation || '') !== occupation ||
        initialTraits.join(', ') !== traits.join(', ') ||
        (user.about || '') !== about;
      setHasUnsavedChanges(hasChanges);
    }
  }, [user, preferredName, occupation, traits, about]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Helper function to check if an anchor should trigger unsaved changes dialog
  const shouldInterceptAnchor = useCallback(
    (anchor: HTMLAnchorElement): string | null => {
      if (!anchor.href || anchor.target === '_blank') {
        return null;
      }

      const url = anchor.getAttribute('href') || anchor.href;
      if (url?.startsWith('/')) {
        return url;
      }

      return null;
    },
    []
  );

  // Helper function to handle navigation with unsaved changes
  const handleNavigationAttempt = useCallback((url: string, e: MouseEvent) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(() => {
      setPendingUrl(url);
      setShowUnsavedChangesDialog(true);
    }, 0);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      const anchor = (e.target as HTMLElement).closest(
        'a'
      ) as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const url = shouldInterceptAnchor(anchor);
      if (url) {
        handleNavigationAttempt(url, e);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasUnsavedChanges, shouldInterceptAnchor, handleNavigationAttempt]);

  const handleSave = async () => {
    await updateUser({
      preferredName,
      occupation,
      traits: traits.join(', '),
      about,
    });
    setHasUnsavedChanges(false);
    toast({ title: 'Preferences saved', status: 'success' });
  };

  const handleAddTrait = (trait: string) => {
    if (trait && !traits.includes(trait) && traits.length < 50) {
      setTraits([...traits, trait]);
    }
  };

  const handleRemoveTrait = (traitToRemove: string) => {
    setTraits(traits.filter((trait) => trait !== traitToRemove));
  };

  const handleTraitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTraitInput(e.target.value);
  };

  const handleTraitInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleAddTrait(traitInput);
      setTraitInput('');
    }
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && hasUnsavedChanges) {
      e.preventDefault();
      handleSave();
    }
  };

  const defaultTraits = [
    'friendly',
    'witty',
    'concise',
    'curious',
    'empathetic',
    'creative',
    'patient',
  ];

  return (
    <div className="w-full">
      <div className="space-y-8">
        <div>
          <h1 className="font-bold text-2xl">Customize {APP_NAME}</h1>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between">
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="preferred-name"
              >
                What should {APP_NAME} call you?
              </label>
              <span className="text-muted-foreground text-sm">
                {preferredName.length}/50
              </span>
            </div>
            <Input
              id="preferred-name"
              maxLength={50}
              onChange={(e) => {
                setPreferredName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter your name"
              value={preferredName}
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="occupation"
              >
                What do you do?
              </label>
              <span className="text-muted-foreground text-sm">
                {occupation.length}/100
              </span>
            </div>
            <Input
              id="occupation"
              maxLength={100}
              onChange={(e) => {
                setOccupation(e.target.value);
                setHasUnsavedChanges(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Engineer, student, etc."
              value={occupation}
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="traits-input"
              >
                What traits should {APP_NAME} have?{' '}
                <span className="text-muted-foreground">
                  (up to 50, max 100 chars each)
                </span>
              </label>
              <span className="text-muted-foreground text-sm">
                {traits.length}/50
              </span>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <div className="mb-2 flex flex-wrap gap-2">
                {traits.map((trait) => (
                  <div
                    className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"
                    key={trait}
                  >
                    <span>{trait}</span>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        handleRemoveTrait(trait);
                        setHasUnsavedChanges(true);
                      }}
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <Input
                className="border-none bg-transparent focus:ring-0"
                id="traits-input"
                maxLength={50}
                onChange={handleTraitInputChange}
                onKeyDown={handleTraitInputKeyDown}
                placeholder="Type a trait and press Enter or Tab..."
                value={traitInput}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {defaultTraits
                .filter((trait) => !traits.includes(trait))
                .map((trait) => (
                  <Button
                    key={trait}
                    onClick={() => {
                      handleAddTrait(trait);
                      setHasUnsavedChanges(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {trait} +
                  </Button>
                ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <label className="mb-2 block font-medium text-sm" htmlFor="about">
                Anything else {APP_NAME} should know about you?
              </label>
              <span className="text-muted-foreground text-sm">
                {about.length}/3000
              </span>
            </div>
            <Textarea
              className="max-h-48"
              id="about"
              maxLength={3000}
              onChange={(e) => {
                setAbout(e.target.value);
                setHasUnsavedChanges(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Interests, values, or preferences to keep in mind"
              rows={5}
              value={about}
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button disabled={!hasUnsavedChanges} onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
      <AlertDialog
        onOpenChange={setShowUnsavedChangesDialog}
        open={showUnsavedChangesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUrl(null)}>
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingUrl) {
                  setHasUnsavedChanges(false);
                  setShowUnsavedChangesDialog(false);
                  router.push(pendingUrl);
                }
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
