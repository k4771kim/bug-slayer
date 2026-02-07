'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-white gap-4 p-8">
          <div className="text-red-400 text-2xl font-bold">Game Engine Error</div>
          <p className="text-gray-400 text-center max-w-md">
            The game engine encountered an unexpected error. This might be due to a browser compatibility issue or a temporary glitch.
          </p>
          <pre className="text-xs text-gray-500 max-w-md overflow-auto bg-[#252526] p-3 rounded">
            {this.state.error?.message}
          </pre>
          <button
            onClick={this.handleRetry}
            className="px-6 py-2 bg-[#007acc] hover:bg-[#0098ff] rounded transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
