// src/auth/auth.service.ts
import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, Role } from './entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { normalizeDeliveryZones } from '../common/utils/delivery-zones.util';
import { encryptField, decryptField } from '../common/crypto/field-encryption';
import { ConfigService } from '@nestjs/config';
import {
  generateSecret as otpGenerateSecret,
  generateURI as otpGenerateURI,
  verifySync as otpVerifySync,
} from 'otplib';
import * as QRCode from 'qrcode';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
    private jwtService: JwtService,
    private emailService: EmailService,
    // ConfigService n'est pas essentiel pour la logique métier (liens/console logs)
    // le rendre optionnel évite les problèmes de résolution lors des tests.
    private configService?: ConfigService,
  ) {}

  private parseRestaurantHours(rawHours?: string) {
    const matches = rawHours?.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    return {
      openingTime: matches?.[1] || '08:00',
      closingTime: matches?.[2] || '22:00',
    };
  }

  // [SÉCURITÉ] Format « <sessionId>.<tokenSecret> » : sessionId indexé (lookup direct),
  // seul le tokenSecret est haché en base (audit §3.4).
  private async attachRefreshToken(user: User): Promise<string> {
    const sessionId = crypto.randomUUID();
    const tokenSecret = crypto.randomBytes(48).toString('hex');
    user.refreshTokenId = sessionId;
    user.refreshToken = await bcrypt.hash(tokenSecret, 8);
    user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
    await this.userRepository.save(user);
    return `${sessionId}.${tokenSecret}`;
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    access_token: string;
    token: string;
    refreshToken: string;
    user: Record<string, any>;
  }> {
    if (!refreshToken) throw new UnauthorizedException('Token de rafraîchissement manquant');

    // Format attendu : « <sessionId>.<tokenSecret> »
    const [sessionId, tokenSecret] = refreshToken.split('.');
    if (!sessionId || !tokenSecret) {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    // Lookup direct par identifiant de session indexé — plus d'itération sur tous les users
    const matchedUser = await this.userRepository.findOne({
      where: { refreshTokenId: sessionId, actif: true },
      relations: ['restaurant'],
    });

    if (
      !matchedUser ||
      !matchedUser.refreshToken ||
      !matchedUser.refreshTokenExpires ||
      matchedUser.refreshTokenExpires <= new Date() ||
      !(await bcrypt.compare(tokenSecret, matchedUser.refreshToken))
    ) {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    const newRefreshToken = await this.attachRefreshToken(matchedUser);
    const response = await this.buildAuthResponse(matchedUser);
    return { ...response, refreshToken: newRefreshToken };
  }

  /** Révoque la session de refresh token (déconnexion). */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const [sessionId] = refreshToken.split('.');
    if (!sessionId) return;
    await this.userRepository.update(
      { refreshTokenId: sessionId },
      {
        refreshToken: undefined,
        refreshTokenId: undefined,
        refreshTokenExpires: undefined,
      },
    );
  }

  private async buildAuthResponse(
    user: User,
    message?: string,
  ): Promise<{
    accessToken: string;
    access_token: string;
    token: string;
    refreshToken: string;
    user: Record<string, any>;
    message?: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.attachRefreshToken(user);

    return {
      accessToken: accessToken,
      access_token: accessToken,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        emailVerified: user.emailVerified ?? false,
        createdAt: user.createdAt,
        adressesSauvegardees: user.adressesSauvegardees ?? [],
        restaurant: user.restaurant
          ? {
              id: user.restaurant.id,
              nom: user.restaurant.nom,
              logo: user.restaurant.logo,
              description: user.restaurant.description,
              adresse: user.restaurant.adresse,
              telephone: user.restaurant.telephone,
              email: user.restaurant.email,
              openingTime: user.restaurant.openingTime,
              closingTime: user.restaurant.closingTime,
              deliveryZones: user.restaurant.deliveryZones,
              latitude: user.restaurant.latitude,
              longitude: user.restaurant.longitude,
            }
          : undefined,
      },
      ...(message ? { message } : {}),
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, actif: true },
      relations: ['restaurant'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return (await this.buildAuthResponse(user)).user;
  }

  async updateProfile(
    userId: string,
    updates: {
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
    },
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, actif: true },
      relations: ['restaurant'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (typeof updates.email === 'string') {
      const email = updates.email.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException('Email requis');
      }

      if (email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email },
        });

        if (existingUser && existingUser.id !== user.id) {
          throw new ConflictException('Email déjà utilisé');
        }
      }

      user.email = email;
    }

    if (typeof updates.nom === 'string') {
      user.nom = updates.nom.trim();
    }

    if (typeof updates.prenom === 'string') {
      user.prenom = updates.prenom.trim();
    }

    if (typeof updates.telephone === 'string') {
      user.telephone = updates.telephone.trim();
    }

    if (Array.isArray((updates as any).adressesSauvegardees)) {
      user.adressesSauvegardees = (updates as any).adressesSauvegardees;
    }

    const savedUser = await this.userRepository.save(user);
    return (await this.buildAuthResponse(savedUser)).user;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Email déjà utilisé');
    }

    // Utiliser password (envoyé par le frontend)
    const passwordToHash = dto.password;
    if (!passwordToHash || passwordToHash.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }

    const passwordHash = await bcrypt.hash(passwordToHash, 12);

    // Déterminer le rôle basé sur le type ou le role directement
    let role = Role.CLIENT;
    let restaurant: Restaurant | null = null;

    // [SÉCURITÉ] Le rôle n'est JAMAIS choisi par le client en dehors des tests :
    // sinon n'importe qui s'inscrirait ADMIN via /auth/register (endpoint public).
    // En dev/prod, le rôle découle exclusivement du `type`. Les rôles privilégiés
    // (ADMIN, STAFF) se créent via le seed ou les endpoints admin/gérant.
    if (dto.role && process.env.NODE_ENV === 'test') {
      role = dto.role;
    } else if (dto.type === 'RESTAURANT') {
      role = Role.GERANT;

      // Vérifier que les données du restaurant sont présentes
      if (!dto.restaurantNom || !dto.adresse) {
        throw new BadRequestException(
          "Pour créer un restaurant, fournissez le nom et l'adresse",
        );
      }

      const { openingTime, closingTime } = this.parseRestaurantHours(
        dto.horaires,
      );

      // Créer le restaurant
      const newRestaurant = this.restaurantRepository.create({
        nom: dto.restaurantNom,
        description: dto.description || '',
        adresse: dto.adresse,
        telephone: dto.restaurantTelephone || dto.telephone || '',
        email: dto.restaurantEmail || dto.email,
        openingTime,
        closingTime,
        deliveryZones: normalizeDeliveryZones(dto.zonesLivraison),
      });
      const savedRestaurant =
        await this.restaurantRepository.save(newRestaurant);
      restaurant = savedRestaurant;
    } else if (dto.type === 'BUSINESS_CLIENT') {
      role = Role.B2B;
    } else {
      role = Role.CLIENT;
    }

    // Créer l'utilisateur
    const user = this.userRepository.create({
      email,
      password: passwordHash,
      nom: dto.nom,
      prenom: dto.prenom || dto.nom, // Utiliser nom comme prenom si non fourni
      role: role,
      telephone: dto.telephone,
      restaurant: restaurant ? { id: restaurant.id } : undefined,
    });

    const savedUser = await this.userRepository.save(user);
    savedUser.restaurant = restaurant ?? undefined;

    // Générer un token de vérification d'email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24h
    savedUser.emailVerificationToken = verificationToken;
    savedUser.emailVerificationExpires = verificationExpires;
    await this.userRepository.save(savedUser);

    // Envoyer l'email de vérification (non bloquant)
    const frontendUrl =
      this.configService?.get('FRONTEND_URL') || 'http://localhost:5173';
    try {
      await this.emailService.sendEmailVerification(
        savedUser.email,
        verificationToken,
        frontendUrl,
      );
    } catch (emailErr) {
      // Ne pas bloquer l'inscription si l'envoi d'email échoue
      this.logger.error(
        `Échec envoi email de vérification : ${(emailErr as Error).message}`,
      );
    }

    // Retourner le token et les infos utilisateur pour la redirection
    return this.buildAuthResponse(
      savedUser,
      'Compte créé avec succès. Vérifiez votre email pour activer votre compte.',
    );
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['restaurant'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Identifiants incorrects');
    }
    if (!user.actif) throw new BadRequestException('Compte désactivé');

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email non vérifié — vérifiez votre boîte mail pour activer votre compte',
      );
    }

    if (user.twoFactorEnabled) {
      // Return a short-lived temp token for 2FA step
      const tempToken = this.jwtService.sign(
        { sub: user.id, type: 'two_factor_pending' },
        { expiresIn: '5m' },
      );
      user.twoFactorTempToken = tempToken;
      user.twoFactorTempTokenExpires = new Date(Date.now() + 5 * 60 * 1000);
      await this.userRepository.save(user);
      return { requiresTwoFactor: true, tempToken };
    }

    return this.buildAuthResponse(user);
  }

  // Password reset request
  async requestPasswordReset(email: string) {
    const userEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: userEmail },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return {
        message: "Si l'email existe, un lien de réinitialisation a été envoyé",
      };
    }

    // NOTE: suppression du blocage si l'email n'est pas vérifié — permettre la réinitialisation

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    const resetRequest = this.passwordResetRepository.create({
      token,
      expiresAt,
      user,
      userId: user.id,
    });

    await this.passwordResetRepository.save(resetRequest);

    // Envoyer l'email de réinitialisation
    const frontendUrl =
      this.configService?.get('FRONTEND_URL') || 'http://localhost:5173';
    try {
      await this.emailService.sendPasswordReset(userEmail, token, frontendUrl);
    } catch (emailErr) {
      this.logger.error(
        `Échec envoi email de réinitialisation : ${(emailErr as Error).message}`,
      );
    }

    return {
      message: "Si l'email existe, un lien de réinitialisation a été envoyé",
    };
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }

    // Find valid reset token
    const resetRequest = await this.passwordResetRepository.findOne({
      where: { token, used: false },
      relations: ['user'],
    });

    if (!resetRequest || resetRequest.expiresAt < new Date()) {
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré',
      );
    }

    // NOTE: suppression des vérifications sur emailVerified — autoriser le reset

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    resetRequest.user.password = passwordHash;
    await this.userRepository.save(resetRequest.user);

    // Mark token as used
    resetRequest.used = true;
    await this.passwordResetRepository.save(resetRequest);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  // Verify email with token
  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (
      !user ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Lien de vérification invalide ou expiré');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await this.userRepository.save(user);

    return { message: 'Email vérifié avec succès', emailVerified: true };
  }

  // Resend verification email
  async resendVerificationEmail(email: string) {
    const userEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: userEmail },
    });

    if (user && !user.emailVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 3600 * 1000); // 24h
      user.emailVerificationToken = token;
      user.emailVerificationExpires = expires;
      await this.userRepository.save(user);

      const frontendUrl =
        this.configService?.get('FRONTEND_URL') || 'http://localhost:5173';
      try {
        await this.emailService.sendEmailVerification(
          user.email,
          token,
          frontendUrl,
        );
      } catch (emailErr) {
        this.logger.error(
          `Échec renvoi email de vérification : ${(emailErr as Error).message}`,
        );
      }
    }

    // Toujours retourner un message neutre pour ne pas révéler si l'email existe
    return { message: 'Email de vérification envoyé' };
  }

  // Change password (authenticated user)
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, actif: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!passwordMatches)
      throw new BadRequestException('Mot de passe actuel incorrect');

    if (!newPassword || newPassword.length < 8)
      throw new BadRequestException(
        'Le nouveau mot de passe doit contenir au moins 8 caractères',
      );

    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);
    return { message: 'Mot de passe modifié avec succès' };
  }

  async setup2FA(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, actif: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const secret = otpGenerateSecret();
    // Chiffré au repos ; le secret en clair ne sert qu'au QR code ci-dessous.
    user.twoFactorSecret = encryptField(secret);
    await this.userRepository.save(user);

    const otpAuthUrl = otpGenerateURI({
      issuer: "Resto d'ici",
      label: user.email,
      secret,
      strategy: 'totp',
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return { secret, qrCodeDataUrl, otpAuthUrl };
  }

  async enable2FA(userId: string, code: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, actif: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (!user.twoFactorSecret)
      throw new BadRequestException("Configurez d'abord la 2FA");

    const verifyResult = otpVerifySync({
      secret: decryptField(user.twoFactorSecret) ?? '',
      token: code,
      strategy: 'totp',
    });
    if (!verifyResult.valid)
      throw new BadRequestException(
        "Code invalide. Vérifiez l'heure de votre téléphone.",
      );

    // Generate 8 backup codes
    const plainCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );
    const hashedCodes = await Promise.all(
      plainCodes.map((c) => bcrypt.hash(c, 8)),
    );

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedCodes;
    await this.userRepository.save(user);

    return {
      message: '2FA activée avec succès',
      twoFactorEnabled: true,
      backupCodes: plainCodes,
    };
  }

  async disable2FA(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, actif: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await this.userRepository.save(user);
    return { message: '2FA désactivée', twoFactorEnabled: false };
  }

  async verifyTwoFactorLogin(tempToken: string, code: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Session expirée, reconnectez-vous');
    }
    if (payload.type !== 'two_factor_pending')
      throw new UnauthorizedException('Token invalide');

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, actif: true },
      relations: ['restaurant'],
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Verify TOTP code
    if (
      user.twoFactorSecret &&
      otpVerifySync({
        secret: decryptField(user.twoFactorSecret) ?? '',
        token: code,
        strategy: 'totp',
      }).valid
    ) {
      user.twoFactorTempToken = undefined;
      user.twoFactorTempTokenExpires = undefined;
      await this.userRepository.save(user);
      return this.buildAuthResponse(user);
    }

    // Verify backup codes
    if (user.twoFactorBackupCodes?.length) {
      for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
        const match = await bcrypt.compare(
          code.toUpperCase(),
          user.twoFactorBackupCodes[i],
        );
        if (match) {
          // Remove used backup code
          user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(
            (_, idx) => idx !== i,
          );
          user.twoFactorTempToken = undefined;
          user.twoFactorTempTokenExpires = undefined;
          await this.userRepository.save(user);
          return this.buildAuthResponse(user);
        }
      }
    }

    throw new UnauthorizedException('Code invalide ou expiré');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredTokens() {
    const now = new Date();
    await this.userRepository
      .createQueryBuilder()
      .update()
      .set({ twoFactorTempToken: undefined, twoFactorTempTokenExpires: undefined })
      .where('twoFactorTempTokenExpires IS NOT NULL AND twoFactorTempTokenExpires < :now', { now })
      .execute();

    await this.userRepository
      .createQueryBuilder()
      .update()
      .set({
        refreshToken: undefined,
        refreshTokenId: undefined,
        refreshTokenExpires: undefined,
      })
      .where('refreshTokenExpires IS NOT NULL AND refreshTokenExpires < :now', { now })
      .execute();
  }
}
