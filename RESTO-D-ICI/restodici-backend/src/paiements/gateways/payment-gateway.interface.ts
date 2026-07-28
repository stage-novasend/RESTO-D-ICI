export interface InitiatePaymentOptions {
  amount: number;
  currency?: string;
  provider?: string; // sous-provider (ex: 'WAVE', 'ORANGE')
  phone?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  webhookUrl?: string;
}

export interface PaymentGatewayResult {
  paymentUrl?: string;
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface PaymentGateway {
  readonly name: string;
  initiate(options: InitiatePaymentOptions): Promise<PaymentGatewayResult>;
  verifyWebhook(payload: any, signature?: string): boolean;
  handleWebhook(payload: any): Promise<PaymentWebhookResult>;
}

export interface PaymentWebhookResult {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  // Sous-provider résolu par la stratégie (ex. 'WAVE', 'ORANGE'), si elle sait
  // le déterminer. Évite au contexte de connaître le détail des stratégies.
  provider?: string;
  metadata?: any;
}
