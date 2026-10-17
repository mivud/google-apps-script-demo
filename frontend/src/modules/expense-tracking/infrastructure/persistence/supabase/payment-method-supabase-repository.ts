import type { SupabaseClient } from '@supabase/supabase-js'
import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../../../domain/payment-method'
import type { PaymentMethodRepository } from '../../../application/payment-method-repository'
import { toExpenseTrackingError } from './expense-tracking-supabase-errors'
import { newPaymentMethodToRow, paymentMethodToRow, rowToPaymentMethod, type PaymentMethodRow } from './expense-tracking-supabase-rows'
import { SupabaseTable } from './expense-tracking-supabase-table'

const TABLE = 'payment_methods'

export class PaymentMethodSupabaseRepository implements PaymentMethodRepository {
  private readonly client: SupabaseClient
  private readonly table: SupabaseTable<PaymentMethodRow, PaymentMethod>

  constructor(client: SupabaseClient) {
    this.client = client
    this.table = new SupabaseTable(client, TABLE, rowToPaymentMethod, 'payment_method_name_taken')
  }

  async list(): Promise<PaymentMethod[]> {
    const { data, error } = await this.client.from(TABLE).select('*').order('name')
    if (error) throw toExpenseTrackingError(error)
    return (data as PaymentMethodRow[]).map(rowToPaymentMethod)
  }

  create(input: NewPaymentMethod): Promise<PaymentMethod> {
    return this.table.insert(newPaymentMethodToRow(input))
  }

  update(id: string, patch: Partial<Omit<PaymentMethodInput, 'id'>>, expectedLastModified: string): Promise<PaymentMethod> {
    return this.table.update(id, paymentMethodToRow(patch), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.table.remove(id)
  }
}
