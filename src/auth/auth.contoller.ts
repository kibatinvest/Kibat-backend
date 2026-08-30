// Kibat Invest — contrôleur de connexion par téléphone

import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

import { AuthService } from './auth.service';

// =========================
// DONNÉES POUR ENVOYER OTP
// =========================

class SendOtpDto {
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'Numéro de téléphone invalide',
  })
  phone!: string;
}

// =========================
// DONNÉES POUR VÉRIFIER OTP
// =========================

class VerifyOtpDto {
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'Numéro de téléphone invalide',
  })
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

// =========================
// ROUTES AUTH
// =========================

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
  ) {}

  // POST /api/auth/send-otp
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  // POST /api/auth/verify-otp
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(
      dto.phone,
      dto.code,
    );
  }
}
