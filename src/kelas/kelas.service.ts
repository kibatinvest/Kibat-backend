// Kibat Invest — KELAS, l'IA coach qui conseille les investisseurs
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class KelasService {
  constructor(private prisma: PrismaService) {}

  // Awa pose une question, Kelas répond avec les VRAIES données de Kibat
  async ask(userId: string, question: string) {
    // On récupère les vraies données pour nourrir la réponse
    const projects = await this.prisma.project.findMany({
      where: { status: 'COLLECTING' },
      select: { name: true, sector: true, goal: true, collected: true, profitShare: true, risks: true },
      take: 10,
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const balance = user ? user.walletBalance.toNumber() : 0;

    // Réponse avec l'IA (si clé API OpenAI présente), sinon réponse intelligente locale
    if (process.env.OPENAI_API_KEY) {
      const contexte = `Tu es Kelas, le coach en investissement de Kibat Invest, plateforme sénégalaise.
L'utilisateur a ${balance} FCFA dans son portefeuille.
Projets en collecte : ${JSON.stringify(projects)}.
Réponds en français simple, chaleureux, max 150 mots. Conseille selon ses moyens.`;

      const rep = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: contexte },
          { role: 'user', content: question },
        ],
        max_tokens: 250,
      }, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      return { answer: rep.data.choices[0].message.content, source: 'kelas-ia' };
    }

    // ─── MODE DÉMO : Kelas répond avec les vrais projets, sans IA externe ───
    const q = question.toLowerCase();
    let answer = '';

    if (q.includes('investir') || q.includes('où') || q.includes('ou ')) {
      const meilleur = projects.sort((a, b) => b.profitShare - a.profitShare)[0];
      answer = meilleur
        ? `👋 Avec balanceFCFAdanstonportefeuille,jeteconseillederegarder«{balance} FCFA dans ton portefeuille, je te conseille de regarder «balanceFCFAdanstonportefeuille,jeteconseillederegarder«{meilleur.name} » (meilleur.sector):iloffre{meilleur.sector}) : il offremeilleur.sector):iloffre{meilleur.profitShare} % des bénéfices et il est encore en collecte ! Tu peux commencer avec juste 1 000 FCFA.`
        : `👋 Aucun projet en collecte pour le moment. Reviens bientôt, de nouveaux projets arrivent !`;
    } else if (q.includes('risque')) {
      answer = `🛡️ Chez Kibat, ton argent est protégé : il reste sous séquestre jusqu'à ce que le projet soit financé, et chaque projet a ses étapes validées avant déblocage. Regarde la section « Risques » sur chaque projet pour les détails.`;
    } else if (q.includes('retirer') || q.includes('retrait')) {
      answer = `💸 Tu peux retirer ton argent vers Orange Money, Wave, MTN MoMo, Moov Money ou ta carte bancaire, à partir de 1 000 FCFA. Va dans « Portefeuille » → « Retirer ».`;
    } else {
      answer = `🤖 Je suis Kelas, ton coach Kibat ! Tu peux me demander : où investir, les risques, comment retirer... Je vois ${projects.length} projets en collecte en ce moment.`;
    }

    return { answer, source: 'kelas-demo' };
  }

  // Les questions suggérées (pour les bulles dans l'app)
  suggestions() {
    return [
      'Où investir avec 5 000 FCFA ?',
      'Quels sont les risques ?',
      'Comment retirer mon argent ?',
      'Quel projet rapporte le plus ?',
    ];
  }
}
