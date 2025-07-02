import { Polar } from '@convex-dev/polar';
import { api, components } from './_generated/api';

export const polar = new Polar(components.polar, {
  getUserInfo: async (
    ctx
  ): Promise<{ userId: string; email: string; name?: string }> => {
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user?.email) {
      throw new Error('User not found or no email');
    }

    // Get the user's display name (preferredName > name > fallback)
    const displayName = user.preferredName || user.name || 'User';

    return {
      userId: user._id,
      email: user.email,
      name: displayName,
    };
  },
  products: {
    premium:
      process.env.POLAR_PREMIUM_PRODUCT_ID ||
      (() => {
        throw new Error(
          'POLAR_PREMIUM_PRODUCT_ID environment variable is required'
        );
      })(),
  },
});

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
