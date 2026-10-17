// Minimal typings for the parts of Google Identity Services this app uses.
export interface GisCredentialResponse {
  credential?: string
}

export interface GisPromptNotification {
  isNotDisplayed(): boolean
  isSkippedMoment(): boolean
  isDismissedMoment(): boolean
}

export interface GisIdConfiguration {
  client_id: string
  callback: (response: GisCredentialResponse) => void
  nonce: string
  auto_select: boolean
  cancel_on_tap_outside: boolean
  use_fedcm_for_prompt: boolean
}

export interface GisAccountsId {
  initialize(config: GisIdConfiguration): void
  prompt(listener?: (notification: GisPromptNotification) => void): void
  renderButton(container: HTMLElement, options: Record<string, string | number>): void
  disableAutoSelect(): void
  cancel(): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GisAccountsId } }
  }
}
