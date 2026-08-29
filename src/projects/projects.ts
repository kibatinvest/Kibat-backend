// Kibat Invest — le standard qui reçoit les demandes sur les projets
import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { IsInt, MinLength, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';

class CreateProjectDto {
  @IsString() @MinLength(3)
  name!: string;

  @IsString()
  sector!: string;

  @IsString()
  place!: string;

  @IsString() @MinLength(10)
  description!: string;

  @IsInt() @Min(50000)
  goal!: number;

  @IsInt() @Min(1) @Max(100)
  profitShare!: number;

  @IsOptional() @IsString()
  emoji?: string;
}

class InvestDto {
  @IsString()
  projectId!: string;

  @IsInt() @Min(1000)
  amount!: number;
}

@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  // Voir tous les projets (libre, sans ticket)
  @Get()
  list() {
    return this.projects.list();
  }

  // Voir le détail d'un projet (libre)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.projects.getOne(id);
  }

  // Créer un projet (réservé aux gestionnaires avec ticket)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.projects.create(req.user.id, req.user.role, dto);
  }

  // Investir dans un projet (avec ticket)
  @UseGuards(JwtAuthGuard)
  @Post('invest')
  invest(@Request() req: any, @Body() dto: InvestDto) {
    return this.projects.invest(req.user.id, dto.projectId, dto.amount);
  }
        }
  
