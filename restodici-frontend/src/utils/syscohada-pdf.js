/**
 * Générateur PDF SYSCOHADA — Côte d'Ivoire
 * Normes OHADA / SYSCOHADA Révisé — TVA 18%
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY   = [15, 23, 42];       // #0F172A
const ORANGE = [255, 140, 0];      // #FF8C00
const GREEN  = [22, 163, 74];      // #16A34A
const GRAY   = [100, 116, 139];    // #64748B
const LIGHT  = [248, 250, 252];    // #F8FAFC
const WHITE  = [255, 255, 255];
const RED    = [220, 38, 38];

const TVA_RATE = 0.18;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fcfa = (n) =>
  `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} FCFA`;

const today = () =>
  new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

function addPageHeader(doc, title, subtitle = '') {
  const W = doc.internal.pageSize.getWidth();

  // Navy banner
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 28, 'F');

  // Orange accent bar
  doc.setFillColor(...ORANGE);
  doc.rect(0, 28, W, 2.5, 'F');

  // Logo / brand
  doc.setTextColor(...WHITE);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text("Resto d'ici", 14, 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('Plateforme de restauration B2B · Côte d\'Ivoire', 14, 18);
  doc.text('contact@restodici.ci · www.restodici.ci', 14, 23);

  // Document type pill (right)
  doc.setFillColor(...ORANGE);
  doc.roundedRect(W - 60, 7, 48, 14, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title, W - 36, 15.5, { align: 'center' });

  // Subtitle under banner
  if (subtitle) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 36);
  }

  return 40; // y cursor after header
}

function addSectionTitle(doc, text, y) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(14, y, W - 28, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(text.toUpperCase(), 17, y + 5);
  return y + 12;
}

function addInfoBlock(doc, leftLines, rightLines, y) {
  const W = doc.internal.pageSize.getWidth();
  const mid = W / 2;

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...GRAY);
  doc.roundedRect(14, y, W - 28, 26, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);

  leftLines.forEach((line, i) => {
    if (i === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
    }
    doc.text(line, 17, y + 6 + i * 5);
  });

  rightLines.forEach((line, i) => {
    if (i === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
    }
    doc.text(line, mid + 4, y + 6 + i * 5);
  });

  return y + 31;
}

function addFooter(doc, pageNum, totalPages) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(...NAVY);
  doc.rect(0, H - 14, W, 14, 'F');

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Document conforme au Système Comptable OHADA (SYSCOHADA Révisé) · TVA 18% · DGI Côte d\'Ivoire',
    W / 2, H - 8.5, { align: 'center' }
  );
  doc.text(`Page ${pageNum} / ${totalPages}`, W - 14, H - 8.5, { align: 'right' });
  doc.text(`Généré le ${today()}`, 14, H - 8.5);
}

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORT MENSUEL SYSCOHADA
// ═════════════════════════════════════════════════════════════════════════════
export function buildSyscohadaBlob(collabs, factures, compte, monthlyExp) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.getWidth();
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  let y = addPageHeader(
    doc,
    'RAPPORT SYSCOHADA',
    `Rapport mensuel de dépenses — ${mois}`
  );

  // ── Identités ──────────────────────────────────────────────────────────────
  y = addInfoBlock(
    doc,
    [
      "PRESTATAIRE : Resto d'ici",
      'Activité : Restauration collective B2B',
      'NIF : CI-ABJ-2024-001 · RCCM : CI-ABJ-2024-B-001',
      'Abidjan, Côte d\'Ivoire',
    ],
    [
      `CLIENT : ${compte?.raisonSociale || 'Entreprise'}`,
      compte?.secteurActivite ? `Secteur : ${compte.secteurActivite}` : 'Secteur : —',
      `NIF : ${compte?.numeroContribuable || '—'}`,
      `RCCM : ${compte?.numeroRCCM || '—'}`,
    ],
    y
  );

  // ── Section 1 — Budgets collaborateurs ────────────────────────────────────
  y = addSectionTitle(doc, '1. Synthèse budgétaire par collaborateur', y);

  if (collabs.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Aucun collaborateur enregistré', 17, y);
    y += 8;
  } else {
    const collabRows = collabs.map((c, i) => {
      const budget = Number(c.limiteBudget || c.budgetMax || 0);
      const depense = Number(c.depenseActuelle || c.depenses || 0);
      const solde  = Math.max(0, budget - depense);
      const pct    = budget > 0 ? Math.round((depense / budget) * 100) : 0;
      return [
        i + 1,
        c.nom || '—',
        c.poste || '—',
        fcfa(budget),
        fcfa(depense),
        fcfa(solde),
        `${pct} %`,
      ];
    });

    const totalBudget  = collabs.reduce((s, c) => s + Number(c.limiteBudget || 0), 0);
    const totalDepense = collabs.reduce((s, c) => s + Number(c.depenseActuelle || 0), 0);
    const totalSolde   = Math.max(0, totalBudget - totalDepense);
    const totalPct     = totalBudget > 0 ? Math.round((totalDepense / totalBudget) * 100) : 0;

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Collaborateur', 'Poste', 'Budget mensuel', 'Dépensé', 'Solde', 'Taux']],
      body: [
        ...collabRows,
        ['', { content: 'TOTAL', styles: { fontStyle: 'bold' } }, '', fcfa(totalBudget), fcfa(totalDepense), fcfa(totalSolde), `${totalPct} %`],
      ],
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: NAVY },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT },
      footStyles: { fillColor: [230, 235, 242], textColor: NAVY, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 30 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 26, halign: 'right' },
        6: { cellWidth: 16, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Section 2 — Factures ───────────────────────────────────────────────────
  y = addSectionTitle(doc, '2. Détail des factures mensuelles', y);

  if (factures.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Aucune facture émise pour cette période', 17, y);
    y += 8;
  } else {
    const factRows = factures.map((f, i) => {
      const ttc = Number(f.montantTTC || f.montantTotal || 0);
      const ht  = Math.round(ttc / (1 + TVA_RATE));
      const tva = ttc - ht;
      const isPaid = f.statut === 'PAYEE' || f.statut === 'paid';
      return [
        i + 1,
        f.numeroFacture || `FAC-${String(i + 1).padStart(3, '0')}`,
        f.periode || f.mois || '—',
        f.echeance ? new Date(f.echeance).toLocaleDateString('fr-FR') : '—',
        fcfa(ht),
        fcfa(tva),
        fcfa(ttc),
        { content: isPaid ? 'PAYÉE' : 'EN ATTENTE', styles: { textColor: isPaid ? GREEN : RED, fontStyle: 'bold' } },
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Référence', 'Période', 'Échéance', 'Montant HT', 'TVA 18%', 'TTC', 'Statut']],
      body: factRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: NAVY },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
        7: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Section 3 — Récapitulatif fiscal ──────────────────────────────────────
  if (doc.lastAutoTable?.finalY > 220) { doc.addPage(); y = 20; }
  y = addSectionTitle(doc, '3. Récapitulatif fiscal (SYSCOHADA / DGI-CI)', y);

  const totalHT  = Math.round((monthlyExp || 0) / (1 + TVA_RATE));
  const totalTVA = Math.round((monthlyExp || 0) - totalHT);
  const totalTTC = Math.round(monthlyExp || 0);

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Base HT', 'Taux TVA', 'Montant TVA', 'Total TTC']],
    body: [
      ['Restauration collective B2B', fcfa(totalHT), '18 %', fcfa(totalTVA), fcfa(totalTTC)],
      [
        { content: 'TOTAL GÉNÉRAL', colSpan: 1, styles: { fontStyle: 'bold' } },
        { content: fcfa(totalHT), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: '18 %', styles: { halign: 'center' } },
        { content: fcfa(totalTVA), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: fcfa(totalTTC), styles: { fontStyle: 'bold', halign: 'right', textColor: ORANGE } },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 34, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Mention légale ────────────────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRAY);
  doc.text(
    'Conformément au Système Comptable OHADA (SYSCOHADA Révisé) adopté par le Conseil des Ministres de l\'OHADA.',
    14, y
  );
  doc.text(
    'TVA collectée au taux de 18% conformément au Code Général des Impôts de la Côte d\'Ivoire — Article 339 CGI-CI.',
    14, y + 5
  );

  // ── Footer sur toutes les pages ────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  return doc.output('blob');
}

// ═════════════════════════════════════════════════════════════════════════════
// REÇU INDIVIDUEL (facture mensuelle payée ou non)
// ═════════════════════════════════════════════════════════════════════════════
export function buildFactureBlob(facture, compte) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.getWidth();
  const isPaid = facture.statut === 'PAYEE' || facture.statut === 'paid';

  const ttc = Number(facture.montantTTC || facture.montantTotal || 0);
  const ht  = Math.round(ttc / (1 + TVA_RATE));
  const tva = ttc - ht;

  let y = addPageHeader(
    doc,
    isPaid ? 'REÇU PAYÉ' : 'FACTURE',
    `${facture.numeroFacture || 'FACTURE'} · ${facture.periode || ''}`
  );

  // ── Infos facture ─────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);

  const emissionDate = facture.createdAt
    ? new Date(facture.createdAt).toLocaleDateString('fr-FR')
    : today();
  const echeanceDate = facture.echeance
    ? new Date(facture.echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  doc.text(`Date d'émission : ${emissionDate}`, 14, y);
  doc.text(`Date d'échéance : ${echeanceDate}`, W - 14, y, { align: 'right' });
  y += 8;

  // ── Parties ────────────────────────────────────────────────────────────────
  y = addInfoBlock(
    doc,
    [
      "PRESTATAIRE : Resto d'ici",
      'NIF : CI-ABJ-2024-001',
      'RCCM : CI-ABJ-2024-B-001',
      'Abidjan, Côte d\'Ivoire',
    ],
    [
      `CLIENT : ${compte?.raisonSociale || 'Entreprise'}`,
      `NIF : ${compte?.numeroContribuable || facture.nifClient || '—'}`,
      `RCCM : ${compte?.numeroRCCM || facture.rccmClient || '—'}`,
      compte?.adresse || '—',
    ],
    y
  );

  // ── Tableau principal ──────────────────────────────────────────────────────
  y = addSectionTitle(doc, 'Détail de la prestation', y);

  autoTable(doc, {
    startY: y,
    head: [['N°', 'Désignation', 'Période', 'Qté', 'P.U. HT', 'Montant HT']],
    body: [[
      '1',
      'Restauration collective B2B — Repas livrés en entreprise',
      facture.periode || facture.mois || '—',
      '1',
      fcfa(ht),
      fcfa(ht),
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 72 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 5;

  // ── Récapitulatif TVA ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    body: [
      ['', '', { content: 'Total HT', styles: { fontStyle: 'bold', halign: 'right' } }, { content: fcfa(ht), styles: { halign: 'right' } }],
      ['', '', { content: 'TVA (18 %)', styles: { halign: 'right' } }, { content: fcfa(tva), styles: { halign: 'right' } }],
      ['', '', { content: 'TOTAL TTC', styles: { fontStyle: 'bold', fontSize: 9, halign: 'right', textColor: NAVY } }, { content: fcfa(ttc), styles: { fontStyle: 'bold', fontSize: 9, halign: 'right', textColor: isPaid ? GREEN : RED } }],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 22 },
      2: { cellWidth: 48 },
      3: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Statut paiement ────────────────────────────────────────────────────────
  doc.setFillColor(...(isPaid ? GREEN : RED));
  doc.roundedRect(14, y, W - 28, 12, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isPaid ? '✓  FACTURE PAYÉE — Reçu officiel de paiement' : '⏳  EN ATTENTE DE PAIEMENT — Non libératoire',
    W / 2, y + 8,
    { align: 'center' }
  );

  y += 18;

  // ── Conditions de paiement ────────────────────────────────────────────────
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Conditions de paiement : Paiement à 15 jours · Mobile Money (Orange, MTN, Wave) via Novasend', 14, y);
  doc.text('En cas de retard, des pénalités de 1,5 % par mois seront appliquées conformément au CGI-CI.', 14, y + 5);

  y += 15;

  // ── Mention SYSCOHADA ─────────────────────────────────────────────────────
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Document établi conformément au Système Comptable OHADA (SYSCOHADA Révisé) · TVA 18% · CGI-CI Article 339.',
    14, y
  );

  // ── Footer ────────────────────────────────────────────────────────────────
  addFooter(doc, 1, 1);

  return doc.output('blob');
}

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORT FINANCIER GÉRANT (mensuel / trimestriel / annuel)
// ═════════════════════════════════════════════════════════════════════════════
// summary = { totalRevenue, totalExpenses, netProfit, profitMargin }
// expenses = [{ label, montant, date }]  (optionnel)
export function buildFinanceReportBlob(period, restaurantName, summary = {}, expenses = []) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const AMBER = [255, 140, 0];

  const periodLabel = period === 'monthly'    ? 'Mensuel'
                    : period === 'quarterly'  ? 'Trimestriel'
                    : 'Annuel';

  let y = addPageHeader(
    doc,
    'RAPPORT FINANCIER',
    `${periodLabel} — ${restaurantName || "Resto d'ici"} — ${today()}`
  );

  // ── Synthèse en 4 KPI ─────────────────────────────────────────────────────
  y = addSectionTitle(doc, '1. Synthèse financière', y);

  const rev  = Number(summary.totalRevenue   || 0);
  const exp  = Number(summary.totalExpenses  || 0);
  const net  = Number(summary.netProfit      || rev - exp);
  const marg = Number(summary.profitMargin   || (rev > 0 ? Math.round((net / rev) * 100) : 0));
  const tva  = Math.round(rev * TVA_RATE);
  const revHT = Math.round(rev / (1 + TVA_RATE));

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Montant', 'Observation']],
    body: [
      ['Chiffre d\'affaires TTC', fcfa(rev), `Base HT : ${fcfa(revHT)}`],
      ['TVA collectée (18 %)', fcfa(tva), 'Reversement DGI-CI'],
      ['Dépenses totales', fcfa(exp), 'Charges d\'exploitation'],
      [{ content: 'Profit net', styles: { fontStyle: 'bold' } }, { content: fcfa(net), styles: { fontStyle: 'bold', textColor: net >= 0 ? GREEN : RED } }, `Marge : ${marg} %`],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 52, halign: 'right' },
      2: { cellWidth: 60 },
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Barre visuelle marge ───────────────────────────────────────────────────
  const barW = W - 28;
  doc.setFillColor(240, 242, 245);
  doc.roundedRect(14, y, barW, 8, 2, 2, 'F');
  const fillW = Math.max(0, Math.min(marg, 100)) / 100 * barW;
  const fillColor = marg >= 20 ? GREEN : marg >= 10 ? AMBER : RED;
  doc.setFillColor(...fillColor);
  doc.roundedRect(14, y, fillW, 8, 2, 2, 'F');
  doc.setTextColor(...NAVY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`Marge bénéficiaire : ${marg} %`, 17, y + 5.5);
  y += 14;

  // ── Tableau récapitulatif TVA / SYSCOHADA ──────────────────────────────────
  y = addSectionTitle(doc, '2. Récapitulatif fiscal SYSCOHADA (DGI-CI)', y);

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Base HT', 'Taux', 'TVA', 'TTC']],
    body: [
      ['Ventes restauration', fcfa(revHT), '18 %', fcfa(tva), fcfa(rev)],
      ['Charges déductibles', fcfa(exp), '—', '—', fcfa(exp)],
      [
        { content: 'RÉSULTAT NET', styles: { fontStyle: 'bold' } },
        { content: fcfa(revHT - exp), styles: { fontStyle: 'bold', halign: 'right' } },
        '—', '—',
        { content: fcfa(net), styles: { fontStyle: 'bold', halign: 'right', textColor: net >= 0 ? GREEN : RED } },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 64 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Détail des dépenses (si fourni) ───────────────────────────────────────
  if (expenses.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, '3. Détail des dépenses d\'exploitation', y);

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Catégorie', 'Description', 'Date', 'Montant']],
      body: expenses.slice(0, 30).map((e, i) => [
        i + 1,
        e.label || e.categorie || '—',
        e.description || '—',
        e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—',
        fcfa(e.montant),
      ]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: NAVY },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 36 },
        2: { cellWidth: 70 },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Mention légale ─────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRAY);
  doc.text('Document conforme au Système Comptable OHADA (SYSCOHADA Révisé) — TVA 18% — CGI-CI Article 339.', 14, y);
  doc.text(`Rétention légale minimale : 10 ans (Article 17 AUDCG-OHADA) — Généré le ${today()}.`, 14, y + 5);

  // ── Footer sur toutes les pages ────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  return doc.output('blob');
}

// =============================================================================
// BON DE COMMANDE FOURNISSEUR
// =============================================================================
// { num, restaurantNom, restaurantAdresse, fournisseur, lignes, dateLivraison }
// lignes = [{ article, quantite, prixUnit }]
export function buildBonCommandeBlob({ num, restaurantNom, restaurantAdresse, fournisseur, lignes, dateLivraison }) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();

  const totalHT = lignes.reduce((s, l) => s + (Number(l.prixUnit) || 0) * Number(l.quantite || 0), 0);
  const livraisonStr = dateLivraison
    ? new Date(dateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'A definir';

  let y = addPageHeader(doc, 'BON DE COMMANDE', `Reference ${num} - Emis le ${today()}`);

  y = addInfoBlock(
    doc,
    [
      `ACHETEUR : ${restaurantNom}`,
      restaurantAdresse || 'Abidjan, Cote d Ivoire',
      `Livraison souhaitee : ${livraisonStr}`,
    ],
    [
      `FOURNISSEUR : ${fournisseur.nom}`,
      fournisseur.contact   ? `Contact : ${fournisseur.contact}`   : '',
      fournisseur.telephone ? `Tel : ${fournisseur.telephone}`     : '',
      fournisseur.email     ? `Email : ${fournisseur.email}`       : '',
    ].filter(Boolean),
    y
  );

  y = addSectionTitle(doc, 'Detail de la commande', y);

  const tableRows = lignes.map((l, i) => {
    const pu = Number(l.prixUnit) || 0;
    const qt = Number(l.quantite) || 0;
    return [
      i + 1,
      l.article || '-',
      qt,
      pu > 0 ? `${Math.round(pu).toLocaleString('fr-FR')} FCFA` : '-',
      pu > 0 ? `${Math.round(pu * qt).toLocaleString('fr-FR')} FCFA` : '-',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['N', 'Designation', 'Quantite', 'Prix unitaire', 'Total HT']],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 34, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 4;

  if (totalHT > 0) {
    autoTable(doc, {
      startY: y,
      body: [
        ['', '', '',
          { content: 'TOTAL ESTIME (HT)', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `${Math.round(totalHT).toLocaleString('fr-FR')} FCFA`, styles: { fontStyle: 'bold', halign: 'right', textColor: ORANGE } },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 80 }, 2: { cellWidth: 22 }, 3: { cellWidth: 34 }, 4: { cellWidth: 34 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  if (y > 230) { doc.addPage(); y = 20; }
  y += 10;
  const sigW = (W - 28 - 10) / 2;
  [
    { label: 'Responsable achat', x: 14 },
    { label: 'Fournisseur (signature & cachet)', x: 14 + sigW + 10 },
  ].forEach(({ label, x }) => {
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.line(x, y + 20, x + sigW, y + 20);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, y + 25);
  });

  addFooter(doc, 1, 1);
  return doc.output('blob');
}
