import { Outlet } from 'react-router-dom';

import { Toaster } from '@/shared/components/ui/Toaster';

/**
 * Root shell: full-height column; pages render their own `TopBar`.
 *
 * Three of the four insets live here, so every screen in normal flow clears a
 * landscape notch and the home indicator at once instead of each one repeating
 * its own padding. The top is the exception: the `TopBar` is always the first
 * thing under the top edge and carries it itself.
 *
 * The background still paints edge to edge — only the content moves. Anything
 * `fixed` (the toasts, the phone emote sheet) sits outside this box and has to
 * carry its own.
 */
export const AppLayout = () => (
  <div className="flex min-h-full flex-col bg-bg pr-(--safe-right) pb-(--safe-bottom) pl-(--safe-left) text-ink">
    <Outlet />
    <Toaster />
  </div>
);
