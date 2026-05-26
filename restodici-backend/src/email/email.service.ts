// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

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
}
