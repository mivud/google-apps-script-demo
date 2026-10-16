import { Component, type ErrorInfo, type ReactNode } from 'react'
import { FatalError } from './fatal-error'

interface ErrorBoundaryState {
  error: unknown
  failed: boolean
}

// Must be a class: React has no hook equivalent for catching render-time errors.
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined, failed: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.failed) return <FatalError titleKey="app.error" />
    return this.props.children
  }
}
