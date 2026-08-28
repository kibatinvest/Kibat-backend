// Kibat Invest — le cerveau de la connexion
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
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

  // ÉTAPE 1 : envoyer un code à 6 chiffres par SMS
  async sendOtp(phone: string) {
    const code = String(randomInt(100000, 999999));
    await this.prisma.otpCode.create({ data: { phone, code } });

    // Envoi du SMS via l'API (mode démo : le code s'affiche dans les logs)
    if (process.env.SMS_API_KEY) {
      await axios.post(process.env.SMS_API_URL!, {
        apiKey: process.env.SMS_API_KEY,
        to: phone,
        message: `Kibat Invest : votre code est ${code}`,
      });
    }
    console.log(`📱 [DÉMO] Code SMS pour phone:{phone} :phone:{code}`);
    return { sent: true };
  }

  // ÉTAPE 2 : vérifier le code et donner le ticket de connexion
  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, code },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('Code invalide');
    if (Date.now() - otp.createdAt.getTime() > 10 * 60_000)
      throw new UnauthorizedException('Code expiré');

    // Créer le compte s'il n'existe pas encore
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({ data: { phone } });
    }

    const token = this.jwt.sign({
      sub: user.id, phone: user.phone, role: user.role,
    });
    return { token, isNewUser: !user.createdAt };
  }
}
