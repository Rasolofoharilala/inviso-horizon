import { Component } from 'react'
import type { ReactNode } from 'react'
import LoadingScreen from './LoadingScreen'

type Props = { children: ReactNode }
type State = { failed: boolean }

export default class LoadingBoundary extends Component<Props, State> {
  state: State = { failed: false }
  static getDerivedStateFromError(): State { return { failed: true } }
  render() {
    if (this.state.failed) {
      return <LoadingScreen error onRetry={() => window.location.reload()} />
    }
    return this.props.children
  }
}
