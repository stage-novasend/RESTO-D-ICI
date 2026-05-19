import { Injectable } from '@nestjs/common';

@Injectable()
export class TresorerieService {
  constructor() {}

  private sanitizePdfText(value: unknown) {
    const base =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : '';

    return base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildPdfBuffer(title: string, lines: string[]) {
    const safeLines = [title, ...lines].map((line) =>
      this.sanitizePdfText(line),
    );
    const contentLines = safeLines
      .map(
        (line, index) =>
          `BT /F1 12 Tf 50 ${760 - index * 18} Td (${line}) Tj ET`,
      )
      .join('\n');
    const stream = `${contentLines}\n`;
    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${stream.length} >> stream
${stream}endstream endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000248 00000 n 
0000000318 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${318 + stream.length}
%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  async getRevenueStats(
    restaurantId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ) {
    const stats = {
      caJour: 0,
      caSemaine: 0,
      caMois: 0,
      nbCommandes: 0,
      ticketMoyen: 0,
      margesBrutes: 0,
    };

    if (period === 'day') {
      stats.caJour = Math.floor(Math.random() * 200000) + 100000;
      stats.nbCommandes = Math.floor(Math.random() * 15) + 8;
    } else if (period === 'week') {
      stats.caSemaine = Math.floor(Math.random() * 1000000) + 500000;
      stats.nbCommandes = Math.floor(Math.random() * 80) + 40;
    } else {
      stats.caMois = Math.floor(Math.random() * 4000000) + 2000000;
      stats.nbCommandes = Math.floor(Math.random() * 300) + 150;
    }

    stats.ticketMoyen =
      stats.caJour > 0 ? Math.round(stats.caJour / stats.nbCommandes) : 0;
    stats.margesBrutes = Math.floor(Math.random() * 30) + 60;

    return stats;
  }

  async generateReceiptPdf(data: {
    commandeId: string;
    restaurantId: string;
    numeroCommande?: string;
    montantTotal?: number;
    modePaiement?: string | null;
    clientNom?: string;
    payeAt?: Date | string | null;
  }) {
    const generatedAt = data.payeAt
      ? new Date(data.payeAt).toLocaleString('fr-FR')
      : new Date().toLocaleString('fr-FR');

    return this.buildPdfBuffer(
      `Recu commande ${data.numeroCommande || data.commandeId}`,
      [
        `Commande: ${data.commandeId}`,
        `Restaurant: ${data.restaurantId}`,
        ...(data.clientNom ? [`Client: ${data.clientNom}`] : []),
        ...(typeof data.montantTotal === 'number'
          ? [`Montant total: ${data.montantTotal} FCFA`]
          : []),
        ...(data.modePaiement
          ? [`Mode de paiement: ${data.modePaiement}`]
          : []),
        `Date de paiement: ${generatedAt}`,
        `Document genere automatiquement par Restodici`,
      ],
    );
  }

  async recordExpense(data: any, restaurantId: string) {
    return {
      id: 'expense_' + Date.now(),
      ...data,
      restaurantId,
      createdAt: new Date(),
      status: 'recorded',
    };
  }

  async generateFinancialReport(
    restaurantId: string,
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ) {
    return {
      period,
      restaurantId,
      reportUrl: `/reports/financial_${restaurantId}_${period}_${Date.now()}.pdf`,
      generatedAt: new Date(),
      summary: {
        totalRevenue: Math.floor(Math.random() * 5000000) + 1000000,
        totalExpenses: Math.floor(Math.random() * 2000000) + 500000,
        netProfit: Math.floor(Math.random() * 3000000) + 500000,
        profitMargin: Math.floor(Math.random() * 30) + 20,
      },
    };
  }

  async exportSyscohada(
    restaurantId: string,
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ) {
    const rows = [
      ['SYSCOHADA Export', `${restaurantId}`, `${period.toUpperCase()}`],
      ['Date', 'Compte', 'Libelle', 'Debit', 'Credit'],
      [
        new Date().toISOString().slice(0, 10),
        '701',
        'Ventes de marchandises',
        '0',
        '1200000',
      ],
      [new Date().toISOString().slice(0, 10), '607', 'Achats', '400000', '0'],
      [
        new Date().toISOString().slice(0, 10),
        '4457',
        'TVA collectee',
        '0',
        '180000',
      ],
      [
        new Date().toISOString().slice(0, 10),
        '4456',
        'TVA deductible',
        '90000',
        '0',
      ],
      [
        new Date().toISOString().slice(0, 10),
        'Resultat',
        'Benefice net',
        '0',
        '710000',
      ],
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `${String(cell).replace(/"/g, '""')}`)
          .map((cell) => `"${cell}"`)
          .join(','),
      )
      .join('\r\n');

    return Buffer.from(csvContent, 'utf8');
  }

  async recordOrderPayment(data: {
    commandeId: string;
    numeroCommande: string;
    montantTotal: number;
    montantRemis: number;
    modePaiement?: string;
    restaurantId: string;
    payeAt?: Date;
  }) {
    return {
      id: `tx_${Date.now()}`,
      type: 'ORDER_PAYMENT',
      status: 'synced',
      syncedAt: new Date(),
      ...data,
    };
  }

  async configureBudgetAlerts(restaurantId: string, config: any) {
    return {
      restaurantId,
      ...config,
      updatedAt: new Date(),
      status: 'configured',
    };
  }
}
