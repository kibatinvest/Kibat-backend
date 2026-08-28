// Kibat Invest — le cerveau des projets agricoles
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // Tout le monde peut voir la liste des projets
  async list(status?: string) {
    return this.prisma.project.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, sector: true, emoji: true, place: true,
        description: true, goal: true, collected: true, profitShare: true,
        status: true, risks: true, collectEndsAt: true,
      },
    });
  }

  // Le détail d'un projet + ses étapes validées
  async getOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { milestones: { orderBy: { index: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  // Un gestionnaire crée un projet (réservé aux ROLE=MANAGER)
  async create(userId: string, role: string, data: {
    name: string; sector: string; place: string; description: string;
    goal: number; profitShare: number; emoji?: string;
  }) {
    if (role !== 'MANAGER') throw new ForbiddenException('Réservé aux gestionnaires');
    if (data.goal < 50_000) throw new BadRequestException('Objectif minimum : 50 000 FCFA');
    if (data.profitShare < 1 || data.profitShare > 100)
      throw new BadRequestException('Part des bénéfices entre 1 et 100 %');

    return this.prisma.project.create({
      data: {
        name: data.name,
        sector: data.sector,
        place: data.place,
        description: data.description,
        goal: data.goal,
        profitShare: data.profitShare,
        emoji: data.emoji || '🌱',
        managerId: userId,
      },
    });
  }

  // Investir dans un projet (vérifie le statut et l'argent du portefeuille)
  async invest(userId: string, projectId: string, amount: number) {
    if (amount < 1000) throw new BadRequestException('Investissement minimum : 1 000 FCFA');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.walletBalance.toNumber() < amount)
      throw new BadRequestException('Solde insuffisant dans votre portefeuille');

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status !== 'COLLECTING')
      throw new BadRequestException('Ce projet ne collecte plus de fonds');

    const commission = Math.ceil(amount * project.commissionRate);

    // On débite le portefeuille et on enregistre l'investissement
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: amount } },
    });

    await this.prisma.investment.create({
      data: { userId, projectId, amount, status: 'ESCROWED' },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        collected: { increment: amount },
        commissionAmount: { increment: commission },
      },
    });

    // Si l'objectif est atteint → la collecte se termine
    const updated = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (updated && updated.collected >= updated.goal) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'FUNDED' },
      });
    }

    return { success: true, message: 'Investissement placé sous séquestre ✅' };
  }
              }
    
