import polar from '@convex-dev/polar/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import resend from '@convex-dev/resend/convex.config';
import { defineApp } from 'convex/server';

const app = defineApp();
app.use(rateLimiter);
app.use(polar);
app.use(resend);

export default app;
