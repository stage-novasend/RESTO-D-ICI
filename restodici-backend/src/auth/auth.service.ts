// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  //  REGISTER — Création compte avec rôle respecté (RG-31, RG-32)
  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Vérifier si l'email existe déjà
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hash du mot de passe (bcrypt cost=12 conforme RG sécurité)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Création utilisateur — rôle fourni OU CLIENT par défaut (RG-31)
    const user = this.userRepository.create({
      email: dto.email,
      password: passwordHash,
      nom: dto.nom,
      telephone: dto.telephone,
      role: dto.role || 'CLIENT', //  Respecte le rôle si fourni
      actif: true, // RG-32: nouveau compte activé par défaut
    });

    await this.userRepository.save(user);

    return { message: 'Compte créé avec succès' };
  }

  //  LOGIN — Génération JWT avec rôle CORRECT dans le payload
  async login(dto: LoginDto): Promise<{
    access_token: string;
    user: { id: string; email: string; role: string; nom: string };
  }> {
    // Trouver l'utilisateur par email
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'nom', 'role', 'password', 'actif'],
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // RG-32: Vérifier que le compte est actif
    if (!user.actif) {
      throw new UnauthorizedException('Compte désactivé. Contactez l\'administrateur.');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    //  Payload JWT avec le VRAI rôle de l'utilisateur (sauvegardé en DB)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role, // ← CRITIQUE: utiliser saved.role, pas une valeur hardcodée
    };

    // Signer le token (24h expiration — RG-35)
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '24h',
      secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-prod',
    });

    // Retourner user sans le mot de passe
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role, // ← Le frontend verra le bon rôle
        nom: user.nom,
      },
    };
  }

  //  GET USER BY ID — Pour les guards et les routes protégées
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, actif: true },
      select: ['id', 'email', 'nom', 'role', 'actif'],
    });
  }

  // UPDATE USER ROLE — Admin uniquement (RG-31)
  async updateRole(userId: string, newRole: string): Promise<User> {
    const validRoles = ['ADMIN', 'GERANT', 'STAFF', 'CLIENT', 'B2B'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Rôle invalide: ${newRole}`);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    user.role = newRole as any;
    return this.userRepository.save(user);
  }
}