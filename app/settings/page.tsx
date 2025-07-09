'use client';

import { CheckoutLink, CustomerPortalLink } from '@convex-dev/polar/react';
import { CircleNotch, Headset, Rocket, Sparkle } from '@phosphor-icons/react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import { MessageUsageCard } from '@/app/components/layout/settings/message-usage-card';
import { useUser } from '@/app/providers/user-provider';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';

export default function AccountSettingsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signOut, hasPremium, products } = useUser();
  const router = useRouter();

  // Get product IDs with fallback - memoize to prevent unnecessary re-calculations
  const productIds = React.useMemo(() => {
    return products?.premium?.id ? [products.premium.id] : [];
  }, [products?.premium?.id]);

  // Memoize the delete account handler
  const handleDeleteAccount = useCallback(async () => {
    if (
      !confirm(
        'This will permanently delete your account and all associated data. This action cannot be undone. Continue?'
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount({});
      await signOut();
      toast({ title: 'Account deleted', status: 'success' });
      router.push('/');
    } catch {
      toast({
        title: 'Failed to delete account',
        status: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteAccount, signOut, router]);

  // Render the subscription button - memoize to prevent unnecessary re-renders
  const renderSubscriptionButton = useCallback(() => {
    if (hasPremium) {
      return (
        <CustomerPortalLink polarApi={api.polar}>
          <Button className="w-full md:w-64">Manage Subscription</Button>
        </CustomerPortalLink>
      );
    }

    if (productIds.length > 0) {
      return (
        <CheckoutLink
          embed={false}
          polarApi={api.polar}
          productIds={productIds}
        >
          <Button className="w-full md:w-64">
            Upgrade to Premium - $15/month
          </Button>
        </CheckoutLink>
      );
    }

    return (
      <Button className="w-full md:w-64" disabled variant="secondary">
        Loading products...
      </Button>
    );
  }, [hasPremium, productIds]);

  return (
    <div className="w-full">
      <div className="space-y-12">
        {/* Pro Plan Benefits */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-left font-bold text-2xl">Pro Plan Benefits</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col items-start rounded-lg border border-secondary/40 bg-card/30 px-6 py-4">
              <div className="mb-2 flex items-center">
                <Rocket className="mr-2 h-5 w-5 text-primary" />
                <span className="font-semibold text-base">
                  Access to All Models
                </span>
              </div>
              <p className="text-muted-foreground/80 text-sm">
                Get access to our full suite of models including Claude,
                o4-mini-high, and more!
              </p>
            </div>
            <div className="flex flex-col items-start rounded-lg border border-secondary/40 bg-card/30 px-6 py-4">
              <div className="mb-2 flex items-center">
                <Sparkle className="mr-2 h-5 w-5 text-primary" />
                <span className="font-semibold text-base">Generous Limits</span>
              </div>
              <p className="text-muted-foreground/80 text-sm">
                Receive{' '}
                <span className="font-bold text-foreground">
                  1500 standard credits
                </span>{' '}
                per month, plus{' '}
                <span className="font-bold text-foreground">
                  100 premium credits*
                </span>{' '}
                per month.
              </p>
            </div>
            <div className="flex flex-col items-start rounded-lg border border-secondary/40 bg-card/30 px-6 py-4">
              <div className="mb-2 flex items-center">
                <Headset className="mr-2 h-5 w-5 text-primary" />
                <span className="font-semibold text-base">
                  Priority Support
                </span>
              </div>
              <p className="text-muted-foreground/80 text-sm">
                Get faster responses and dedicated assistance from the team
                whenever you need help!
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-4 pb-4 md:flex-row">
            {renderSubscriptionButton()}
          </div>
          <p className="text-muted-foreground/60 text-sm">
            <span className="mx-0.5 font-medium text-base">*</span>Premium
            credits are used for GPT Image Gen, Claude Sonnet, Gemini 2.5 Pro
            and Grok 3. Additional Premium credits can be purchased separately.
          </p>
          <div className="mt-6 md:hidden">
            <MessageUsageCard />
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold text-destructive">Danger Zone</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Permanently delete your account and all associated data.
            </p>
            <Button
              disabled={isDeleting}
              onClick={handleDeleteAccount}
              size="sm"
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
