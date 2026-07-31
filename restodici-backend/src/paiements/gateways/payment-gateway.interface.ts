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

export interface PayoutOptions {
  amount: number;
  provider: string; // 'WAVE' | 'ORANGE' | 'MOMO' | 'MOOV'
  phone: string;
  reference: string;
  recipientName?: string;
}

export interface PayoutResult {
  payoutId: string;
  status: 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'EXPIRED';
  raw?: any;
}

export interface PaymentGateway {
  readonly name: string;
  initiate(options: InitiatePaymentOptions): Promise<PaymentGatewayResult>;
  /**
   * @param rawBody corps brut de la requête — requis pour un HMAC fiable.
   *                Le `payload` parsé n'est qu'un repli dégradé.
   */
  verifyWebhook(payload: any, signature?: string, rawBody?: string): boolean;
  handleWebhook(payload: any): Promise<PaymentWebhookResult>;
  /**
   * Verse de l'argent vers un tiers (ex: reversement au restaurant après
   * commission). Optionnel — tous les gateways ne le supportent pas
   * (ex: pas de payout API pour un virement bancaire classique).
   */
  payout?(options: PayoutOptions): Promise<PayoutResult>;
  /** Interroge le statut d'un payout précédemment initié (si asynchrone). */
  getPayoutStatus?(reference: string): Promise<PayoutResult>;
}

export interface PaymentWebhookResult {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  // Sous-provider résolu par la stratégie (ex. 'WAVE', 'ORANGE'), si elle sait
  // le déterminer. Évite au contexte de connaître le détail des stratégies.
  provider?: string;
  metadata?: any;
}
