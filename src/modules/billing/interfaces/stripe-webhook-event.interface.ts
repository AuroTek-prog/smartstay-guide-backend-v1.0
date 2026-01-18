/**
 * Tipos de eventos de webhook de Stripe
 * Documentación: https://stripe.com/docs/api/events/types
 */
export interface StripeWebhookEvent {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeEventType;
}

/**
 * Tipos de eventos más comunes de Stripe
 */
export type StripeEventType =
  // Payment Intents
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  
  // Charges
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded'
  
  // Customers
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  
  // Subscriptions
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  
  // Invoices
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.finalized'
  
  // Refunds
  | 'refund.created'
  | 'refund.updated'
  
  // Generic
  | string;
