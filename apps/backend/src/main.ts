import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:4200',
  });
  await app.listen(3000, '0.0.0.0');
  console.log('--------------------------------------------------');
  console.log('🚀 Servidor de la UGR corriendo en puerto 3000');
  console.log('🔓 Interfaz: 0.0.0.0 (Abierto para Docker)');
  console.log('--------------------------------------------------');
}
bootstrap();
