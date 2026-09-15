import { Component, type ErrorInfo, type ReactNode } from 'react';

import { CrashScreen } from './CrashScreen';

interface ErrorBoundaryState {
  crashed: boolean;
}

/**
 * Catches a render error anywhere below it. Without one, a throw unmounts the
 * whole tree and the player is left on a blank page with nothing to click and
 * no sign that the game is still running without them.
 *
 * A class because `getDerivedStateFromError` has no hook equivalent; this is
 * the only class component in the app.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // There is no telemetry in this app, so the console is where a bug report
    // comes from. The component stack is the useful half.
    console.error('Unhandled render error', error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.crashed ? <CrashScreen /> : this.props.children;
  }
}
