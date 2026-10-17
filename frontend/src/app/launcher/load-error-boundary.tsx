import { Component, type ReactNode } from 'react'
import { ErrorState } from '../../shared/components/error-state'

interface Props {
  onRetry: () => void
  children: ReactNode
}

// Must be a class: React has no hook equivalent for catching errors of lazy imports.
export class LoadErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error('Load failed') }
  }

  componentDidCatch(error: unknown): void {
    console.error(error)
  }

  private retry = () => {
    this.setState({ error: null })
    this.props.onRetry()
  }

  render() {
    if (this.state.error) return <div className="container app-main"><ErrorState error={this.state.error} onRetry={this.retry} /></div>
    return this.props.children
  }
}
