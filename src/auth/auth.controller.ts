// Kibat Invest — le standard qui reçoit les demandes de connexion
import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { AuthService } from './auth.service';

class SendOtpDto {
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  phone!: string;
}

class VerifyOtpDto extends SendOtpDto {
  @IsString()
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }
            }
