// Kibat Invest — le cerveau des paiements (TOUS les moyens de paiement)
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { randomBytes } from 'crypto';

// ✨ Les moyens de paiement officiels de Kibat
export const PROVIDERS = [
  { code: 'orange_money', label: 'Orange Money', emoji: '🟠' },
  { code: 'wave', label: 'Wave', emoji: '🌊' },
  { code: 'mtn_momo', label: 'MTN Mobile Money', emoji: '🟡' },
  { code: 'moov_money', label: 'Moov Money', emoji: '🔵' },
  { code: 'card', label: 'Carte bancaire (Visa/Mastercard)', emoji: '💳' },
];

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // Déposer de l'argent dans son portefeuille Kibat
  async deposit(userId: string, provider: string, amount: number) {
    if (amount < 500) throw new BadRequestException('Dépôt minimum : 500 FCFA');
    if (!PROVIDERS.find(p => p.code === provider))
      throw new BadRequestException(
        'Moyen de paiement inconnu. Valides : ' + PROVIDERS.map(p => p.code).join(', '),
      );

    const reference = 'KIBAT-' + randomBytes(4).toString('hex').toUpperCase();

    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        provider,
        amount,
        reference,
        status: 'PENDING',
      },
    });

    // ─── ORANGE MONEY ───
    if (provider === 'orange_money' && process.env.ORANGE_MONEY_API_KEY) {
      await axios.post(process.env.ORANGE_MONEY_URL!, {
        merchant_key: process.env.ORANGE_MONEY_API_KEY,
        currency: 'XOF',
        order_id: reference,
        amount,
        return_url: process.env.KIBAT_RETURN_URL,
        cancel_url: process.env.KIBAT_CANCEL_URL,
        notif_url: process.env.KIBAT_NOTIF_URL,
      });
    }

    // ─── WAVE ───
    else if (provider === 'wave' && process.env.WAVE_API_KEY) {
      await axios.post('https://api.wave.com/v1/checkout/sessions', {
        amount,
        currency: 'XOF',
        client_reference: reference,
        success_url: process.env.KIBAT_RETURN_URL,
        error_url: process.env.KIBAT_CANCEL_URL,
      }, {
        headers: { Authorization: `Bearer ${process.env.WAVE_API_KEY}` },
      });
    }

    // ─── MTN MOBILE MONEY ───
    else if (provider === 'mtn_momo' && process.env.MTN_MOMO_API_KEY) {
      await axios.post(process.env.MTN_MOMO_URL || 'https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay', {
        amount: String(amount),
        currency: process.env.MTN_CURRENCY || 'XOF',
        externalId: reference,
        payer: { partyIdType: 'MSISDN', partyId: process.env.PAYER_PHONE || '' },
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.MTN_MOMO_API_KEY}`,
          'X-Reference-Id': reference,
          'X-Target-Environment': process.env.MTN_ENV || 'sandbox',
        },
      });
    }

    // ─── MOOV MONEY ───
    else if (provider === 'moov_money' && process.env.MOOV_API_KEY) {
      await axios.post(process.env.MOOV_URL!, {
        apiKey: process.env.MOOV_API_KEY,
        msisdn: process.env.PAYER_PHONE || '',
        amount,
        reference,
        currency: 'XOF',
      });
    }

    // ─── CARTE BANCAIRE (Visa/Mastercard via Stripe) ───
    else if (provider === 'card' && process.env.STRIPE_SECRET_KEY) {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.paymentIntents.create({
        amount: amount * 100, // Stripe compte en centimes
        currency: 'xof',
        metadata: { reference, userId },
      });
    }

    console.log(`💰 [DÉMO] Dépôt de amountFCFAvia{amount} FCFA viaamountFCFAvia{provider} — référence ${reference}`);

    return {
      transactionId: tx.id,
      reference,
      status: 'PENDING',
      message: 'Suivez les instructions sur votre téléphone pour confirmer le paiement',
    };
  }

  // Confirmer un paiement (appelé quand le fournisseur confirme)
  async confirmDeposit(reference: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { reference } });
    if (!tx) throw new NotFoundException('Transaction introuvable');
    if (tx.status === 'SUCCESS') return { already: true };

    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { reference },
        data: { status: 'SUCCESS' },
      }),
      this.prisma.user.update({
        where: { id: tx.userId },
        data: { walletBalance: { increment: tx.amount } },
      }),
    ]);

    return { success: true, message: 'Dépôt confirmé, portefeuille crédité ✅' };
  }

  // Demander un retrait vers n'importe quel moyen de paiement
  async withdraw(userId: string, provider: string, amount: number, phone: string) {
    if (amount < 1000) throw new BadRequestException('Retrait minimum : 1 000 FCFA');
    if (!PROVIDERS.find(p => p.code === provider))
      throw new BadRequestException('Moyen de paiement inconnu');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.walletBalance.toNumber() < amount)
      throw new BadRequestException('Solde insuffisant');

    const reference = 'KIBAT-W-' + randomBytes(4).toString('hex').toUpperCase();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          provider,
          amount,
          reference,
          status: 'PENDING',
        },
      }),
    ]);

    console.log(`💸 [DÉMO] Retrait de amountFCFAvia{amount} FCFA viaamountFCFAvia{provider} (phone)—reˊfeˊrence{phone}) — référencephone)—reˊfeˊrence{reference}`);

    return { reference, status: 'PENDING', message: 'Retrait en cours de traitement' };
  }

  // L'historique des transactions de l'utilisateur
  async myTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // La liste des moyens de paiement (pour l'é de l'app)
  listProviders() {
    return PROVIDERS;
  }
  }
      
