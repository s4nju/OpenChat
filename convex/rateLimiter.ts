import { RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';
import { PERIODS, RATE_LIMITS } from './lib/rateLimitConstants';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Anonymous users: daily limit
  anonymousDaily: {
    kind: 'fixed window',
    rate: RATE_LIMITS.ANONYMOUS_DAILY,
    period: PERIODS.DAILY,
    capacity: RATE_LIMITS.ANONYMOUS_DAILY,
  },

  // Authenticated users: daily limit
  authenticatedDaily: {
    kind: 'fixed window',
    rate: RATE_LIMITS.AUTHENTICATED_DAILY,
    period: PERIODS.DAILY,
    capacity: RATE_LIMITS.AUTHENTICATED_DAILY,
  },

  // Standard monthly limit for all users
  standardMonthly: {
    kind: 'fixed window',
    rate: RATE_LIMITS.STANDARD_MONTHLY,
    period: PERIODS.MONTHLY,
    capacity: RATE_LIMITS.STANDARD_MONTHLY,
  },
});
