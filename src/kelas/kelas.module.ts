// Kibat Invest — le collier qui relie les pièces de Kelas
import { Module } from '@nestjs/common';
import { KelasController } from './kelas.controller';
import { KelasService } from './kelas.service';

@Module({
  controllers: [KelasController],
  providers: [KelasService],
})
export class KelasModule {}
  
