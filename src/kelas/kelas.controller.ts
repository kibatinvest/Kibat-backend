// Kibat Invest — le standard qui reçoit les questions pour Kelas
import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KelasService } from './kelas.service';

class AskDto {
  @IsString() @MinLength(2)
  question!: string;
}

@Controller('kelas')
export class KelasController {
  constructor(private kelas: KelasService) {}

  // Poser une question à Kelas (ticket exigé)
  @UseGuards(JwtAuthGuard)
  @Post('ask')
  ask(@Request() req: any, @Body() dto: AskDto) {
    return this.kelas.ask(req.user.id, dto.question);
  }

  // Les questions suggérées (pour les bulles de l'app)
  @Get('suggestions')
  suggestions() {
    return this.kelas.suggestions();
  }
}
