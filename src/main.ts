import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { BesuService } from './modules/blockchain/besu/besu.service';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  app.use(cookieParser());

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const storageType = process.env.STORAGE_TYPE || 'local';
  if (storageType.toLowerCase() === 'local') {
    app.use(
      '/uploads',
      express.static(path.join(process.cwd(), 'storage', 'uploads')),
    );
  }

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

  logger.log(`AutoLogger API rodando na porta ${port}`);
  logger.log(`Swagger disponível em: http://localhost:${port}/api`);
  logger.log(`Arquivos estáticos em: http://localhost:${port}/uploads`);
  logger.log(`CORS configurado para: ${corsOrigins.join(', ')}`);
  logger.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);

  checkBlockchainHealth(app, logger).catch((error) => {
    logger.warn('Erro ao verificar blockchain em background', 'Bootstrap', {
      error: error.message,
    });
  });
}

/**
 * Verifica a saúde da blockchain durante a inicialização
 */
async function checkBlockchainHealth(
  app: any,
  logger: LoggerService,
): Promise<void> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    logger.log('Verificando saúde da blockchain...', 'Bootstrap');

    let besuService: BesuService;
    try {
      besuService = app.get(BesuService);
    } catch (error) {
      logger.warn(
        'BesuService não disponível - verificação de blockchain ignorada',
        'Bootstrap',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return;
    }

    const diagnosis = await Promise.race([
      besuService.diagnoseNetwork(),
      new Promise<any>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout na verificação de saúde (5s)')),
          5000,
        ),
      ),
    ]);

    // Logar resultados da verificação
    if (!diagnosis.connected) {
      logger.error('Blockchain não conectada', null, 'Bootstrap', {
        status: 'disconnected',
      });
    } else if (diagnosis.issues && diagnosis.issues.length > 0) {
      const hasCriticalIssues = diagnosis.issues.some(
        (issue: string) =>
          issue.includes('parada') || issue.includes('não está minerando'),
      );

      if (hasCriticalIssues) {
        logger.error('Blockchain parada', null, 'Bootstrap', {
          status: 'critical',
          connected: true,
          mining: diagnosis.mining || false,
          blockNumber: diagnosis.blockNumber,
          chainId: diagnosis.chainId,
          contractDeployed: diagnosis.contractDeployed,
          timeSinceLastBlock: diagnosis.timeSinceLastBlock,
          issuesCount: diagnosis.issues.length,
        });
      } else {
        logger.warn('Blockchain com problemas', 'Bootstrap', {
          status: 'unhealthy',
          connected: true,
          mining: diagnosis.mining,
          blockNumber: diagnosis.blockNumber,
          chainId: diagnosis.chainId,
          contractDeployed: diagnosis.contractDeployed,
          issuesCount: diagnosis.issues.length,
        });
      }

      diagnosis.issues.forEach((issue: string) => {
        const isCritical =
          issue.includes('parada') || issue.includes('não está minerando');
        if (isCritical) {
          logger.error(`  ${issue}`, null, 'Bootstrap');
        } else {
          logger.warn(`  ${issue}`, 'Bootstrap');
        }
      });
    } else {
      logger.log('✅ Blockchain saudável e pronta para uso', 'Bootstrap', {
        status: 'healthy',
        connected: true,
        mining: diagnosis.mining !== false,
        blockNumber: diagnosis.blockNumber,
        chainId: diagnosis.chainId,
        contractDeployed: diagnosis.contractDeployed,
        contractAddress: diagnosis.contractAddress,
        gasPrice: diagnosis.gasPrice,
        lastBlockTime: diagnosis.lastBlockTime
          ? `${diagnosis.lastBlockTime}s`
          : undefined,
        blocksMinedDuringCheck: diagnosis.blocksMinedDuringCheck,
      });
    }
  } catch (error) {
    logger.warn(
      'Não foi possível verificar a saúde da blockchain durante a inicialização',
      'Bootstrap',
      {
        error: error instanceof Error ? error.message : String(error),
        note: 'A aplicação continuará funcionando, mas problemas na blockchain podem causar falhas em operações que dependem dela',
      },
    );
  }
}
bootstrap();
