import { formatAmount } from '../../../shared/amount-mask'

const CURRENCY_SUFFIX = '\u20ab'

// Same "#,###" grouping as the amount inputs, whatever the browser locale; VND has no minor unit.
export function useMoneyFormat(): (amount: number) => string {
  return (amount: number) => `${amount < 0 ? '-' : ''}${formatAmount(amount)} ${CURRENCY_SUFFIX}`
}
