import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS com variáveis de ambiente
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'];
    
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Configurar validação global
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Configurar arquivos estáticos
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('AutoLogger API')
    .setDescription('API para gerenciamento de veículos e serviços')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚗 AutoLogger API rodando na porta ${port}`);
  console.log(`📚 Swagger disponível em: http://localhost:${port}/api`);
  console.log(`📁 Arquivos estáticos em: http://localhost:${port}/uploads`);
  console.log(`🌐 CORS configurado para: ${corsOrigins.join(', ')}`);
}
bootstrap();