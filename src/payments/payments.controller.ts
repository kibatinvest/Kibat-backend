// Kibat Invest — le standard qui reçoit les demandes de paiement
import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { IsIn, IsInt, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService, PROVIDERS } from './payments.service';

class DepositDto {
  @IsIn(PROVIDERS.map(p => p.code))
  provider!: string;

  @IsInt() @Min(500)
  amount!: number;
}

class WithdrawDto {
  @IsIn(PROVIDERS.map(p => p.code))
  provider!: string;

  @IsInt() @Min(1000)
  amount!: number;

  @IsString()
  phone!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  // La liste des moyens de paiement (pour l'écran de l'app)
  @Get('providers')
  providers() {
    return this.payments.listProviders();
  }

  // L'historique des transactions de l'utilisateur
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  transactions(@Request() req: any) {
    return this.payments.myTransactions(req.user.id);
  }

  // Déposer de l'argent (Orange Money, Wave, MTN, Moov, carte)
  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  deposit(@Request() req: any, @Body() dto: DepositDto) {
    return this.payments.deposit(req.user.id, dto.provider, dto.amount);
  }

  // Retirer vers son moyen de paiement
  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  withdraw(@Request() req: any, @Body() dto: WithdrawDto) {
    return this.payments.withdraw(req.user.id, dto.provider, dto.amount, dto.phone);
  }

  // Confirmation d'un paiement (appelé par Orange/Wave/MTN/Stripe)
  @Post('confirm/:reference')
  confirm(@Param('reference') reference: string) {
    return this.payments.confirmDeposit(reference);
  }
  }
              
