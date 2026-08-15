import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Route protection.
 *
 * This file used to be `middleware.ts` exporting a bare `clerkMiddleware()`,
 * which attached auth context but protected nothing — every page, including
 * /connectors, rendered for signed-out visitors. The `auth.protect()` call
 * below is what actually gates them.
 *
 * Renamed to `proxy.ts` because `middleware.ts` is deprecated in Next.js 16.
 * The convention accepts a default export, so Clerk's handler drops straight in.
 *
 * `/` stays public on purpose: the chat UI is the pitch, so a signed-out
 * visitor sees the real interface and is only sent to sign-in once they
 * actually submit a prompt. Their draft is replayed afterwards — see
 * src/lib/pending-prompt.ts.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
