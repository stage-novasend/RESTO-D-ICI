// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  MOOV_MONEY: 'Moov Money',
  WAVE: 'Wave',
  CARTE_BANCAIRE: 'Carte Bancaire',
  ESPECES: 'Espèces',
  B2B: 'Facturation B2B',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('RESEND_FROM') ||
      "Resto d'ici <onboarding@resend.dev>";

    if (apiKey && apiKey !== 'your-resend-api-key') {
      this.resend = new Resend(apiKey);
      this.logger.log(`Resend configuré — expéditeur : ${this.from}`);
    } else {
      this.logger.warn(
        'RESEND_API_KEY absent ou non configuré — les emails seront uniquement loggés.' +
          ' Ajoutez RESEND_API_KEY dans votre fichier .env',
      );
    }
  }

  private extractLink(html: string): string | null {
    return (
      html.match(/href="(https?:\/\/localhost[^"]+)"/)?.[1] ??
      html.match(/href="(https?:\/\/[^"]+)"/)?.[1] ??
      null
    );
  }

  private logLink(
    options: SendMailOptions,
    status: 'envoyé' | 'échec' | 'log-only',
  ): void {
    const link = this.extractLink(options.html);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`📧 EMAIL [${status.toUpperCase()}]`);
    this.logger.log(`   À      : ${options.to}`);
    this.logger.log(`   Sujet  : ${options.subject}`);
    if (link) this.logger.log(`   🔗 LIEN  : ${link}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    if (!this.resend) {
      this.logLink(options, 'log-only');
      return;
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      // Toujours loguer le lien pour que les tests restent possibles
      this.logLink(options, 'échec');
      this.logger.error(`Resend refus : ${error.message}`);
      throw new Error(error.message);
    }

    // En dev : loguer le lien même si l'email est parti (pratique pour les tests)
    if (isDev) {
      this.logLink(options, 'envoyé');
    } else {
      this.logger.log(
        `Email envoyé via Resend → ${options.to} (id: ${data?.id})`,
      );
    }
  }

  async sendPasswordReset(
    email: string,
    token: string,
    frontendUrl: string,
  ): Promise<void> {
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#11100d,#2B1500);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:#E04E1A;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#fff;margin-bottom:12px;">R</div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Resto d'ici</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#11100d;font-size:20px;margin:0 0 16px;font-weight:700;">Réinitialisation de mot de passe</h2>
              <p style="color:#64574A;font-size:15px;line-height:1.7;margin:0 0 28px;">
                Vous avez demandé une réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
              </p>
              <p style="text-align:center;margin:0 0 32px;">
                <a href="${resetLink}"
                   style="display:inline-block;background:#E04E1A;color:#ffffff;font-size:15px;font-weight:700;
                          text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                  Réinitialiser mon mot de passe
                </a>
              </p>
              <p style="color:#999;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Ce lien est valable pendant <strong>1 heure</strong>. Après ce délai, vous devrez faire une nouvelle demande.
              </p>
              <p style="color:#999;font-size:13px;line-height:1.6;margin:0;">
                Si vous n'avez pas demandé de réinitialisation, ignorez simplement cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#FAF6F0;padding:20px 40px;text-align:center;border-top:1px solid #f0e8df;">
              <p style="color:#C58A55;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Resto d'ici · Plateforme digitale restaurant
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.sendMail({
      to: email,
      subject: "Réinitialisation de votre mot de passe — Resto d'ici",
      html,
    });
  }

  async sendCollaborateurInvitation(
    email: string,
    nomCollaborateur: string,
    nomInviteur: string,
    entreprise: string,
    token: string,
    frontendUrl: string,
  ): Promise<void> {
    const acceptLink = `${frontendUrl}/b2b/invitation/${token}`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#11100d,#2B1500);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:#E04E1A;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#fff;margin-bottom:12px;">R</div>
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Resto d'ici</h1>
            <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:13px;">Espace Entreprise</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#11100d;font-size:20px;margin:0 0 12px;font-weight:700;">Vous avez été invité(e) !</h2>
            <p style="color:#64574A;font-size:15px;line-height:1.7;margin:0 0 8px;">
              Bonjour <strong>${nomCollaborateur}</strong>,
            </p>
            <p style="color:#64574A;font-size:15px;line-height:1.7;margin:0 0 28px;">
              <strong>${nomInviteur}</strong> vous invite à rejoindre l'espace entreprise de <strong>${entreprise}</strong> sur Resto d'ici.
              Cliquez sur le bouton ci-dessous pour créer votre compte et accepter l'invitation.
            </p>
            <p style="text-align:center;margin:0 0 32px;">
              <a href="${acceptLink}"
                 style="display:inline-block;background:#E04E1A;color:#ffffff;font-size:15px;font-weight:700;
                        text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                Accepter l'invitation
              </a>
            </p>
            <p style="color:#999;font-size:13px;line-height:1.6;margin:0 0 8px;">
              Ce lien est valable pendant <strong>7 jours</strong>.
            </p>
            <p style="color:#999;font-size:13px;line-height:1.6;margin:0;">
              Si vous ne connaissez pas ${entreprise}, ignorez cet email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#FAF6F0;padding:20px 40px;text-align:center;border-top:1px solid #f0e8df;">
            <p style="color:#C58A55;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Resto d'ici · Plateforme digitale restaurant
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.sendMail({
      to: email,
      subject: `${nomInviteur} vous invite à rejoindre ${entreprise} sur Resto d'ici`,
      html,
    });
  }

  async sendEmailVerification(
    email: string,
    token: string,
    frontendUrl: string,
  ): Promise<void> {
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vérification de votre email</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#11100d,#2B1500);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:#E04E1A;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#fff;margin-bottom:12px;">R</div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Resto d'ici</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#11100d;font-size:20px;margin:0 0 16px;font-weight:700;">Confirmez votre adresse email</h2>
              <p style="color:#64574A;font-size:15px;line-height:1.7;margin:0 0 28px;">
                Bienvenue sur Resto d'ici ! Pour finaliser la création de votre compte, confirmez votre adresse email en cliquant sur le bouton ci-dessous.
              </p>
              <p style="text-align:center;margin:0 0 32px;">
                <a href="${verifyLink}"
                   style="display:inline-block;background:#E04E1A;color:#ffffff;font-size:15px;font-weight:700;
                          text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                  Vérifier mon email
                </a>
              </p>
              <p style="color:#999;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Ce lien est valable pendant <strong>24 heures</strong>.
              </p>
              <p style="color:#999;font-size:13px;line-height:1.6;margin:0;">
                Si vous n'avez pas créé de compte sur Resto d'ici, ignorez simplement cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#FAF6F0;padding:20px 40px;text-align:center;border-top:1px solid #f0e8df;">
              <p style="color:#C58A55;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Resto d'ici · Plateforme digitale restaurant
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.sendMail({
      to: email,
      subject: "Confirmez votre email — Resto d'ici",
      html,
    });
  }

  async sendReceiptEmail(params: {
    to: string;
    clientNom: string;
    numero: string;
    montantTotal: number;
    modePaiement?: string | null;
    lignes: Array<{ nom: string; quantite: number; prixUnitaire: number }>;
    payeAt?: Date | string | null;
    restaurantNom?: string;
    pdfBuffer?: Buffer;
  }): Promise<void> {
    const {
      to,
      clientNom,
      numero,
      montantTotal,
      modePaiement,
      lignes,
      payeAt,
      restaurantNom,
      pdfBuffer,
    } = params;

    const fcfa = (n: number) =>
      new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
    const dateStr = payeAt
      ? new Date(payeAt).toLocaleString('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';
    const modeLabel =
      PAYMENT_LABELS[modePaiement ?? ''] ?? modePaiement ?? 'Non renseigné';

    const lignesRows = lignes
      .map(
        (l) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8df;font-size:14px;color:#3d2b1f;">${l.nom}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8df;font-size:14px;color:#3d2b1f;text-align:center;">${l.quantite}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8df;font-size:14px;color:#3d2b1f;text-align:right;">${fcfa(l.prixUnitaire)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8df;font-size:14px;font-weight:700;color:#11100d;text-align:right;">${fcfa(l.quantite * l.prixUnitaire)}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Reçu de commande #${numero}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#11100d,#2B1500);padding:36px 40px;text-align:center;">
          <div style="display:inline-block;background:#E04E1A;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#fff;margin-bottom:12px;">R</div>
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Resto d'ici</h1>
          <p style="color:rgba(255,255,255,0.55);margin:4px 0 0;font-size:13px;">Reçu de paiement${restaurantNom ? ' · ' + restaurantNom : ''}</p>
        </td></tr>
        <!-- ORDER NUMBER BADGE -->
        <tr><td style="padding:32px 40px 0;">
          <div style="background:#f8f5f0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#9a7060;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Numéro de commande</p>
            <p style="margin:0;color:#11100d;font-size:24px;font-weight:800;">#${numero}</p>
          </div>
          <!-- META ROW -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="33%" style="vertical-align:top;">
                <p style="margin:0 0 4px;color:#9a7060;font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">Client</p>
                <p style="margin:0;color:#11100d;font-size:14px;font-weight:600;">${clientNom}</p>
              </td>
              <td width="33%" style="vertical-align:top;">
                <p style="margin:0 0 4px;color:#9a7060;font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">Date</p>
                <p style="margin:0;color:#11100d;font-size:14px;font-weight:600;">${dateStr}</p>
              </td>
              <td width="33%" style="vertical-align:top;">
                <p style="margin:0 0 4px;color:#9a7060;font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">Paiement</p>
                <p style="margin:0;color:#11100d;font-size:14px;font-weight:600;">${modeLabel}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- LIGNES TABLE -->
        <tr><td style="padding:0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8df;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#fdf5ef;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9a7060;letter-spacing:0.4px;font-weight:700;text-transform:uppercase;">Article</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;color:#9a7060;letter-spacing:0.4px;font-weight:700;text-transform:uppercase;">Qté</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:#9a7060;letter-spacing:0.4px;font-weight:700;text-transform:uppercase;">P.U.</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:#9a7060;letter-spacing:0.4px;font-weight:700;text-transform:uppercase;">Montant</th>
              </tr>
            </thead>
            <tbody>${lignesRows}</tbody>
          </table>
        </td></tr>
        <!-- TOTAL -->
        <tr><td style="padding:16px 40px 32px;text-align:right;">
          <span style="font-size:13px;color:#9a7060;margin-right:20px;">Total TTC</span>
          <span style="font-size:26px;font-weight:800;color:#C05015;">${fcfa(montantTotal)}</span>
        </td></tr>
        ${
          pdfBuffer
            ? `<tr><td style="padding:0 40px 28px;">
          <p style="color:#64574A;font-size:13px;margin:0;background:#f8f5f0;border-radius:8px;padding:14px 16px;">
            📎 Votre reçu PDF est joint à cet email.
          </p>
        </td></tr>`
            : ''
        }
        <!-- FOOTER -->
        <tr><td style="background:#FAF6F0;padding:20px 40px;text-align:center;border-top:1px solid #f0e8df;">
          <p style="color:#C58A55;font-size:12px;margin:0;">Merci de votre confiance ! · © ${new Date().getFullYear()} Resto d'ici</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    if (!this.resend) {
      this.logLink(
        {
          to,
          subject: `Votre reçu de commande #${numero} — Resto d'ici`,
          html,
        },
        'log-only',
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Votre reçu de commande #${numero} — Resto d'ici`,
      html,
      ...(pdfBuffer
        ? {
            attachments: [
              { filename: `recu-${numero}.pdf`, content: pdfBuffer },
            ],
          }
        : {}),
    });

    if (error) {
      this.logger.error(
        `Échec envoi reçu #${numero} à ${to}: ${error.message}`,
      );
    } else {
      this.logger.log(`Reçu #${numero} envoyé à ${to}`);
    }
  }

  async sendFactureMensuelleEmail(params: {
    to: string;
    raisonSociale: string;
    numeroFacture: string;
    mois: string;
    annee: number;
    montantHT: number;
    tva: number;
    montantTTC: number;
    echeance: string;
  }): Promise<void> {
    const {
      to,
      raisonSociale,
      numeroFacture,
      mois,
      annee,
      montantHT,
      tva,
      montantTTC,
      echeance,
    } = params;
    const fcfa = (n: number) =>
      new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Facture mensuelle ${mois} ${annee}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr><td style="background:linear-gradient(135deg,#11100d,#2B1500);padding:36px 40px;text-align:center;">
          <div style="display:inline-block;background:#E04E1A;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:900;color:#fff;margin-bottom:12px;">R</div>
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Resto d'ici</h1>
          <p style="color:rgba(255,255,255,0.55);margin:4px 0 0;font-size:13px;">Facture mensuelle — Espace Entreprise</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="color:#11100d;font-size:18px;font-weight:700;margin:0 0 8px;">Bonjour ${raisonSociale},</h2>
          <p style="color:#64574A;font-size:14px;line-height:1.7;margin:0 0 28px;">
            Voici votre facture consolidée pour le mois de <strong>${mois} ${annee}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8df;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#fdf5ef;">
              <td style="padding:12px 20px;font-size:12px;color:#9a7060;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Référence</td>
              <td style="padding:12px 20px;font-size:14px;color:#11100d;font-weight:700;text-align:right;">${numeroFacture}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;font-size:13px;color:#64574A;border-top:1px solid #f0e8df;">Montant HT</td>
              <td style="padding:12px 20px;font-size:13px;color:#11100d;border-top:1px solid #f0e8df;text-align:right;">${fcfa(montantHT)}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;font-size:13px;color:#64574A;border-top:1px solid #f0e8df;">TVA (18%)</td>
              <td style="padding:12px 20px;font-size:13px;color:#11100d;border-top:1px solid #f0e8df;text-align:right;">${fcfa(tva)}</td>
            </tr>
            <tr style="background:#fff8f5;">
              <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#11100d;border-top:2px solid #e8c4a0;">Total TTC</td>
              <td style="padding:14px 20px;font-size:18px;font-weight:800;color:#C05015;border-top:2px solid #e8c4a0;text-align:right;">${fcfa(montantTTC)}</td>
            </tr>
          </table>
          <p style="color:#64574A;font-size:13px;background:#fffbf7;border:1px solid #f0e8df;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
            📅 Date d'échéance : <strong>${echeance}</strong>. Règlement à effectuer auprès de votre gestionnaire de compte.
          </p>
          <p style="text-align:center;">
            <a href="#" style="display:inline-block;background:#E04E1A;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:10px;">
              Voir ma facture en ligne
            </a>
          </p>
        </td></tr>
        <tr><td style="background:#FAF6F0;padding:20px 40px;text-align:center;border-top:1px solid #f0e8df;">
          <p style="color:#C58A55;font-size:12px;margin:0;">© ${new Date().getFullYear()} Resto d'ici · Plateforme digitale restaurant</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    if (!this.resend) {
      this.logLink(
        { to, subject: `Facture ${mois} ${annee} — ${numeroFacture}`, html },
        'log-only',
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Votre facture mensuelle ${mois} ${annee} — Resto d'ici`,
      html,
    });

    if (error) {
      this.logger.error(
        `Échec envoi facture ${numeroFacture} à ${to}: ${error.message}`,
      );
    } else {
      this.logger.log(`Facture ${numeroFacture} envoyée à ${to}`);
    }
  }
}
