import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

const TVA_RATE = 0.18;

function formatFcfa(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
}

@Injectable()
export class TresorerieService {
  constructor() {}

  async generateReceiptPdf(data: {
    commandeId: string;
    numero: string;
    restaurantNom: string;
    restaurantAdresse: string;
    restaurantTelephone?: string;
    restaurantEmail?: string;
    restaurantNif?: string;
    restaurantRccm?: string;
    clientNom?: string;
    lignes: Array<{ nom: string; quantite: number; prixUnitaire: number }>;
    montantTotal: number;
    modePaiement?: string | null;
    modeLivraison?: string;
    payeAt?: Date | string | null;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const result = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const PAGE_WIDTH = 595;
      const MARGIN = 50;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

      // ── HEADER BAND ──────────────────────────────────────────────────────────
      // Dark gradient-like background (pdfkit linear gradient)
      const headerHeight = 120;
      const grad = doc.linearGradient(0, 0, PAGE_WIDTH, 0);
      grad.stop(0, '#11100d');
      grad.stop(1, '#2B1500');
      doc.rect(0, 0, PAGE_WIDTH, headerHeight).fill(grad);

      // "R" pill logo
      const logoX = MARGIN;
      const logoY = (headerHeight - 36) / 2;
      doc.roundedRect(logoX, logoY, 36, 36, 8).fill('#FFFFFF');
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#11100d')
        .text('R', logoX, logoY + 8, { width: 36, align: 'center' });

      // "Resto d'ici" next to logo
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#FFFFFF')
        .text("Resto d'ici", logoX + 44, logoY + 10);

      // "REÇU DE PAIEMENT" right-aligned
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#FFFFFF')
        .text('REÇU DE PAIEMENT', MARGIN, 28, {
          width: CONTENT_WIDTH,
          align: 'right',
        });

      // "N° {numero}" in orange
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#E04E1A')
        .text(`N° ${data.numero}`, MARGIN, 58, {
          width: CONTENT_WIDTH,
          align: 'right',
        });

      // ── RESTAURANT INFO BLOCK ─────────────────────────────────────────────────
      let y = headerHeight + 20;

      const formattedDate = data.payeAt
        ? new Date(data.payeAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

      // Left column — restaurant identity
      const leftColX = MARGIN;
      const rightColX = MARGIN + CONTENT_WIDTH / 2 + 10;

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#11100d')
        .text(data.restaurantNom, leftColX, y, { width: CONTENT_WIDTH / 2 });

      y += 18;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64574A')
        .text(data.restaurantAdresse, leftColX, y, {
          width: CONTENT_WIDTH / 2,
        });

      if (data.restaurantTelephone) {
        y += 14;
        doc.text(`Tél: ${data.restaurantTelephone}`, leftColX, y, {
          width: CONTENT_WIDTH / 2,
        });
      }

      if (data.restaurantEmail) {
        y += 14;
        doc.text(`Email: ${data.restaurantEmail}`, leftColX, y, {
          width: CONTENT_WIDTH / 2,
        });
      }

      y += 14;
      doc.text(`NIF: ${data.restaurantNif || 'Non renseigné'}`, leftColX, y, {
        width: CONTENT_WIDTH / 2,
      });

      y += 14;
      doc.text(`RCCM: ${data.restaurantRccm || 'Non renseigné'}`, leftColX, y, {
        width: CONTENT_WIDTH / 2,
      });

      // Right column — order meta
      const rightStartY = headerHeight + 20;
      const labelW = 65;
      const valueX = rightColX + labelW;
      const valueW = CONTENT_WIDTH / 2 - labelW - 10;

      const metaRows: [string, string][] = [
        ['Date:', formattedDate],
        ['Mode:', data.modePaiement || 'N/A'],
        ['Client:', data.clientNom || 'Client'],
        ['Livraison:', data.modeLivraison || 'SUR PLACE'],
      ];

      metaRows.forEach(([label, value], i) => {
        const rowY = rightStartY + i * 18;
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#64574A')
          .text(label, rightColX, rowY, { width: labelW });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#11100d')
          .text(value, valueX, rowY, { width: valueW });
      });

      // ── DIVIDER ───────────────────────────────────────────────────────────────
      const dividerY = Math.max(y, rightStartY + metaRows.length * 18) + 18;
      doc
        .moveTo(MARGIN, dividerY)
        .lineTo(PAGE_WIDTH - MARGIN, dividerY)
        .strokeColor('#D9CFC6')
        .lineWidth(1)
        .stroke();

      // ── TABLE ─────────────────────────────────────────────────────────────────
      const tableY = dividerY + 10;
      const colX = [MARGIN, MARGIN + 295, MARGIN + 360, MARGIN + 447];
      const colW = [295, 65, 87, 88];
      const rowH = 26;
      const cellROW = 23;

      // Header background with left orange accent bar
      doc.rect(MARGIN, tableY, CONTENT_WIDTH, rowH).fill('#11100d');
      doc.rect(MARGIN, tableY, 4, rowH).fill('#E04E1A');

      const headers = ['DÉSIGNATION', 'QTÉ', 'P.U. HT', 'TOTAL HT'];
      const headerAligns: Array<'left' | 'center' | 'right'> = [
        'left',
        'center',
        'right',
        'right',
      ];
      headers.forEach((h, i) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#FFFFFF')
          .text(h, colX[i] + 6, tableY + 8, {
            width: colW[i] - 10,
            align: headerAligns[i],
          });
      });

      // Header bottom border
      doc
        .moveTo(MARGIN, tableY + rowH)
        .lineTo(PAGE_WIDTH - MARGIN, tableY + rowH)
        .strokeColor('#E04E1A')
        .lineWidth(1)
        .stroke();

      // ── TABLE ROWS ────────────────────────────────────────────────────────────
      let rowY = tableY + rowH;
      data.lignes.forEach((ligne, idx) => {
        const unitHT = ligne.prixUnitaire / (1 + TVA_RATE);
        const totalHT = ligne.quantite * unitHT;

        const bg = idx % 2 === 0 ? '#FFFFFF' : '#FEFDF9';
        doc.rect(MARGIN, rowY, CONTENT_WIDTH, cellROW).fill(bg);

        // Row bottom border
        doc
          .moveTo(MARGIN, rowY + cellROW)
          .lineTo(PAGE_WIDTH - MARGIN, rowY + cellROW)
          .strokeColor('#E8E0D6')
          .lineWidth(0.5)
          .stroke();

        const cells = [
          ligne.nom,
          String(ligne.quantite),
          formatFcfa(unitHT),
          formatFcfa(totalHT),
        ];
        const cellAligns: Array<'left' | 'center' | 'right'> = [
          'left',
          'center',
          'right',
          'right',
        ];
        cells.forEach((cell, i) => {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#11100d')
            .text(cell, colX[i] + 6, rowY + 7, {
              width: colW[i] - 10,
              align: cellAligns[i],
            });
        });

        rowY += cellROW;
      });

      const tableEndY = rowY;

      // Vertical column separators (full table height)
      [1, 2, 3].forEach((i) => {
        doc
          .moveTo(colX[i], tableY + rowH)
          .lineTo(colX[i], tableEndY)
          .strokeColor('#DDD5CC')
          .lineWidth(0.5)
          .stroke();
      });

      // Outer table border
      doc
        .rect(MARGIN, tableY, CONTENT_WIDTH, tableEndY - tableY)
        .strokeColor('#C8BFB5')
        .lineWidth(0.75)
        .stroke();

      // ── TAX TOTALS ────────────────────────────────────────────────────────────
      const totalsY = tableEndY + 18;
      const totalHT = data.montantTotal / (1 + TVA_RATE);
      const tva = data.montantTotal - totalHT;
      const totalsBlockX = PAGE_WIDTH - MARGIN - 220;
      const totalsBlockW = 220;

      const totalsRows: [string, string, boolean][] = [
        ['Sous-total HT', formatFcfa(totalHT), false],
        ['TVA (18%)', formatFcfa(tva), false],
        ['TOTAL TTC', formatFcfa(data.montantTotal), true],
      ];

      totalsRows.forEach(([label, value, isBold], i) => {
        const ty = totalsY + i * 24;
        if (isBold) {
          doc.rect(totalsBlockX, ty, totalsBlockW, 24).fill('#FFF4EE');
          doc.rect(totalsBlockX, ty, 3, 24).fill('#E04E1A');
        }
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 11 : 9.5)
          .fillColor(isBold ? '#E04E1A' : '#64574A')
          .text(label, totalsBlockX + 8, ty + (isBold ? 6 : 7), {
            width: 100,
            align: 'left',
          });
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 11 : 9.5)
          .fillColor(isBold ? '#E04E1A' : '#11100d')
          .text(value, totalsBlockX + 110, ty + (isBold ? 6 : 7), {
            width: totalsBlockW - 118,
            align: 'right',
          });
        if (!isBold) {
          doc
            .moveTo(totalsBlockX, ty + 24)
            .lineTo(totalsBlockX + totalsBlockW, ty + 24)
            .strokeColor('#E8E0D6')
            .lineWidth(0.4)
            .stroke();
        }
      });

      // ── AUTHENTICITY STAMP ────────────────────────────────────────────────────
      const stampCX = MARGIN + 85;
      const stampCY = totalsY + 30;
      doc.save();
      doc.rotate(-15, { origin: [stampCX, stampCY] });
      // Outer rectangle
      doc
        .roundedRect(stampCX - 62, stampCY - 26, 124, 52, 4)
        .strokeColor('#E04E1A')
        .lineWidth(1.5)
        .stroke();
      // Inner rectangle
      doc
        .roundedRect(stampCX - 57, stampCY - 21, 114, 42, 3)
        .strokeColor('#E04E1A')
        .lineWidth(0.6)
        .stroke();
      // "R" monogram
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#E04E1A')
        .text('R', stampCX - 57, stampCY - 9, { width: 20, align: 'center' });
      // Text lines
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#E04E1A')
        .text("RESTO D'ICI", stampCX - 34, stampCY - 16, {
          width: 90,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(6.5)
        .fillColor('#E04E1A')
        .text('DOCUMENT CERTIFIÉ AUTHENTIQUE', stampCX - 34, stampCY - 5, {
          width: 90,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(6)
        .fillColor('#E04E1A')
        .text(
          new Date().toLocaleDateString('fr-FR'),
          stampCX - 34,
          stampCY + 6,
          { width: 90, align: 'center' },
        );
      doc.restore();

      // ── SYSCOHADA COMPLIANCE BOX ──────────────────────────────────────────────
      const syscoY = totalsY + totalsRows.length * 24 + 20;
      doc.rect(MARGIN, syscoY, CONTENT_WIDTH, 26).fill('#FAF6F0');
      doc.rect(MARGIN, syscoY, 3, 26).fill('#C58A55');
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#C58A55')
        .text('SYSCOHADA RÉVISÉ', MARGIN + 8, syscoY + 5, {
          width: 110,
          align: 'left',
        });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#64574A')
        .text(
          'Compte 701 — Ventes de marchandises  ·  Compte 4457 — TVA collectée (18%)',
          MARGIN + 124,
          syscoY + 5,
          { width: CONTENT_WIDTH - 132, align: 'left' },
        );

      // ── FOOTER BAND ──────────────────────────────────────────────────────────
      const footerH = 72;
      const footerY = doc.page.height - footerH;

      // Orange top accent line
      doc.rect(0, footerY, PAGE_WIDTH, 2).fill('#E04E1A');
      doc.rect(0, footerY + 2, PAGE_WIDTH, footerH - 2).fill('#11100d');

      // "R" logo in footer
      doc
        .roundedRect(MARGIN, footerY + 14, 28, 28, 6)
        .fill('rgba(255,255,255,0.15)');
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#FFFFFF')
        .text('R', MARGIN, footerY + 20, { width: 28, align: 'center' });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#FFFFFF')
        .text(
          "Merci pour votre confiance — Resto d'ici",
          MARGIN + 36,
          footerY + 14,
          {
            width: CONTENT_WIDTH - 36,
            align: 'left',
          },
        );

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('rgba(255,255,255,0.6)')
        .text(
          `Généré le ${new Date().toLocaleDateString('fr-FR')} · Ce document tient lieu de facture · SYSCOHADA RÉVISÉ`,
          MARGIN + 36,
          footerY + 30,
          { width: CONTENT_WIDTH - 36, align: 'left' },
        );

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('rgba(255,255,255,0.4)')
        .text(
          `restodici.ci · Document N° ${data.numero}`,
          MARGIN + 36,
          footerY + 44,
          { width: CONTENT_WIDTH - 36, align: 'left' },
        );

      doc.end();
    });

    return result;
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
