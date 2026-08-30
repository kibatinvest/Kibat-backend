// Kibat Invest — cerveau de l'authentification
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // =========================
  // ÉTAPE 1 : ENVOYER L'OTP
  // =========================

  async sendOtp(phone: string) {
    if (!phone || !/^\+?[0-9]{8,15}$/.test(phone)) {
      throw new BadRequestException('Numéro de téléphone invalide');
    }

    // Génération d'un code à 6 chiffres
    const code = String(randomInt(100000, 1000000));

    // Enregistrement du code dans la base
    await this.prisma.otpCode.create({
      data: {
        phone,
        code,
      },
    });

    // Envoi réel du SMS si une API SMS est configurée
    if (process.env.SMS_API_KEY && process.env.SMS_API_URL) {
      await axios.post(process.env.SMS_API_URL, {
        apiKey: process.env.SMS_API_KEY,
        to: phone,
        message: `Kibat Invest : votre code de connexion est ${code}`,
      });
    }

    // Mode démo : le code apparaît dans les logs du serveur
    console.log(`📱 [DÉMO] Code SMS pour ${phone} : ${code}`);

    return {
      sent: true,
      message: 'Code de confirmation envoyé',
    };
  }

  // =========================
  // ÉTAPE 2 : VÉRIFIER L'OTP
  // =========================

  async verifyOtp(phone: string, code: string) {
    if (!phone || !code) {
      throw new BadRequestException(
        'Numéro de téléphone et code requis',
      );
    }

    // Recherche du dernier code correspondant
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        code,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp) {
      throw new UnauthorizedException('Code invalide');
    }

    // Le code expire après 10 minutes
    const expiration =
      Date.now() - otp.createdAt.getTime() > 10 * 60 * 1000;

    if (expiration) {
      throw new UnauthorizedException('Code expiré');
    }

    // Chercher l'utilisateur
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    // Créer le compte s'il n'existe pas
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
        },
      });
    }

    // Créer le ticket JWT
    const token = this.jwt.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    // Supprimer le code utilisé
    await this.prisma.otpCode.delete({
      where: {
        id: otp.id,
      },
    });

    console.log(`✅ Connexion réussie pour ${phone}`);

    return {
      token,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        walletBalance: user.walletBalance.toString(),
        isPro: user.isPro,
      },
    };
  }
    }
