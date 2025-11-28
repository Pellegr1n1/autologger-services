import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BesuService } from './besu/besu.service';
import { LoggerService } from '@/common/logger/logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import {
  VehicleService,
  ServiceStatus,
} from '../vehicle/entities/vehicle-service.entity';

export interface BlockchainTransaction {
  hash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  blockNumber?: number;
  gasUsed?: string;
  timestamp?: number;
}

export interface ServiceSubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
  serviceId?: string;
  message?: string;
  blockchainServiceId?: number;
}

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(
    private configService: ConfigService,
    private besuService: BesuService,
    private readonly logger: LoggerService,
    @InjectRepository(VehicleService)
    private vehicleServiceRepository: Repository<VehicleService>,
  ) {
    this.logger.setContext('BlockchainService');
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      try {
        const isConnected = await this.besuService.isConnected();
        if (isConnected) {
          this.logger.log('Rede Besu privada conectada com sucesso');
          return;
        } else {
          this.logger.warn('Rede Besu não está conectada');
        }
      } catch (besuError) {
        this.logger.warn('Erro ao conectar com rede Besu:', besuError.message);
      }

      // Se Besu não estiver disponível, não configurar fallback
      this.logger.warn(
        'Rede blockchain não disponível - serviços não serão registrados na blockchain',
      );
    } catch (error) {
      this.logger.error('Erro ao inicializar serviço blockchain:', error);
    }
  }

  async submitServiceToBlockchain(serviceData: {
    serviceId: string;
    vehicleId: string;
    mileage: number;
    cost: number;
    description: string;
    location?: string;
    type?: string;
  }): Promise<ServiceSubmissionResult> {
    try {
      if (await this.besuService.isConnected()) {
        try {
          // Registrar o serviço diretamente na blockchain
          const result = await this.besuService.registerService({
            vehicleId: serviceData.vehicleId,
            mileage: serviceData.mileage,
            cost: serviceData.cost,
            description: serviceData.description,
            serviceType: serviceData.type || 'MANUTENCAO',
          });

          if (result.success) {
            this.logger.log('Serviço registrado na rede Besu com sucesso');
            return {
              success: true,
              transactionHash: result.transactionHash,
              status: 'SUBMITTED' as const,
              serviceId: serviceData.serviceId,
              message: 'Serviço registrado na blockchain Besu',
              blockchainServiceId: result.serviceId,
            };
          } else {
            throw new Error(result.error || 'Erro desconhecido');
          }
        } catch (besuError) {
          this.logger.error(
            'Erro ao registrar na rede Besu:',
            besuError.message,
          );
          return {
            success: false,
            error: `Falha na rede Besu: ${besuError.message}`,
            status: 'FAILED',
          };
        }
      }

      // Se Besu não estiver disponível, retornar falha
      this.logger.warn(
        'Rede Besu não disponível - serviço não registrado na blockchain',
      );
      return {
        success: false,
        error: 'Rede blockchain não disponível',
        status: 'FAILED',
        message: 'Serviço salvo localmente, mas não registrado na blockchain',
      };
    } catch (error) {
      this.logger.error('Erro ao submeter serviço para blockchain:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED',
      };
    }
  }

  async confirmService(_serviceId: string): Promise<ServiceSubmissionResult> {
    try {
      if (await this.besuService.isConnected()) {
        this.logger.log('Transação Besu automaticamente confirmada');
        return {
          success: true,
          status: 'CONFIRMED',
          message: 'Transações Besu são automaticamente confirmadas',
        };
      }

      // Se Besu não estiver disponível
      this.logger.warn('Rede blockchain não disponível para confirmação');
      return {
        success: false,
        error: 'Rede blockchain não disponível',
        status: 'FAILED',
      };
    } catch (error) {
      this.logger.error('Erro ao confirmar serviço na blockchain:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED',
      };
    }
  }

  async getServiceStatus(serviceId: string): Promise<BlockchainTransaction> {
    try {
      if (await this.besuService.isConnected()) {
        try {
          return {
            hash: serviceId,
            status: 'CONFIRMED',
            timestamp: Date.now(),
          };
        } catch (besuError) {
          this.logger.warn(
            'Erro ao verificar status na rede Besu:',
            besuError.message,
          );
        }
      }

      this.logger.warn('Rede blockchain não disponível para verificar status');
      return {
        hash: serviceId,
        status: 'FAILED',
      };
    } catch (error) {
      this.logger.error(
        'Erro ao obter status do serviço na blockchain:',
        error,
      );
      return {
        hash: serviceId,
        status: 'FAILED',
      };
    }
  }

  /**
   * Verifica serviços na blockchain para validar status real
   * @param services Lista de serviços do banco de dados
   * @returns Serviços com status verificado na blockchain
   */
  private async verifyServicesInBlockchain(services: any[]): Promise<any[]> {
    try {
      const verifiedServices = await Promise.all(
        services.map(async (service) => {
          let blockchainVerified = false;

          if (service.blockchainHash) {
            try {
              // Verificar se o hash existe no contrato
              const hashExists = await this.besuService.verifyHashInContract(
                service.blockchainHash,
              );
              blockchainVerified = hashExists;

              if (hashExists) {
                if (
                  !service.blockchainConfirmedAt ||
                  service.status !== ServiceStatus.CONFIRMED
                ) {
                  await this.vehicleServiceRepository.update(
                    { id: service.id },
                    {
                      blockchainConfirmedAt: new Date(),
                      status: ServiceStatus.CONFIRMED,
                      isImmutable: true,
                      canEdit: false,
                    },
                  );
                  service.blockchainConfirmedAt = new Date();
                  service.status = ServiceStatus.CONFIRMED;
                  this.logger.log(
                    `Serviço ${service.id} atualizado como CONFIRMED (verificado na blockchain)`,
                  );
                }
              } else if (
                !hashExists &&
                service.status === ServiceStatus.CONFIRMED
              ) {
                this.logger.warn(
                  `Hash ${service.blockchainHash} NÃO encontrado na blockchain - marcando como REJECTED para reenvio`,
                );
                await this.vehicleServiceRepository.update(
                  { id: service.id },
                  {
                    status: ServiceStatus.REJECTED,
                    isImmutable: false,
                    canEdit: true,
                  },
                );
                service.status = ServiceStatus.REJECTED;
              }
            } catch (error) {
              this.logger.warn(
                `Erro ao verificar hash ${service.blockchainHash}: ${error.message}`,
              );
              blockchainVerified = false;
            }
          }

          return {
            ...service,
            blockchainVerified,
          };
        }),
      );

      return verifiedServices;
    } catch (error) {
      this.logger.error(
        'Erro ao verificar serviços na blockchain:',
        error.message,
      );
      return services.map((service) => ({
        ...service,
        blockchainVerified: false,
      }));
    }
  }

  /**
   * Força a verificação de todos os serviços na blockchain
   * @returns Lista de serviços com status atualizado
   */
  async forceVerifyAllServices() {
    try {
      this.logger.log(
        'Forçando verificação de todos os serviços na blockchain...',
      );

      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [{ blockchainHash: Not(IsNull()) }],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      // Verificar cada serviço na blockchain
      const verifiedServices = await this.verifyServicesInBlockchain(services);

      this.logger.log(
        `Verificação concluída: ${verifiedServices.length} serviços processados`,
      );
      return verifiedServices;
    } catch (error) {
      this.logger.error(
        'Erro ao forçar verificação de serviços:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Sincroniza status de serviços marcados como falhados/rejeitados que na verdade estão na blockchain
   * Útil quando a blockchain fica offline e serviços ficam marcados incorretamente
   * @returns Resultado da sincronização
   */
  async syncFailedServicesStatus() {
    try {
      this.logger.log(
        'Sincronizando status de serviços falhados/rejeitados com a blockchain...',
      );

      const failedServices = await this.vehicleServiceRepository.find({
        where: [
          {
            blockchainHash: Not(IsNull()),
            status: ServiceStatus.PENDING,
          },
          {
            blockchainHash: Not(IsNull()),
            status: ServiceStatus.REJECTED,
          },
        ],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      this.logger.log(
        `Encontrados ${failedServices.length} serviços para sincronizar`,
      );

      let corrected = 0;
      let notFound = 0;
      const errors: string[] = [];

      for (const service of failedServices) {
        if (!service.blockchainHash || service.blockchainHash === 'pending-hash') {
          continue;
        }

        try {
          // Primeiro, verificar se é uma transação confirmada na blockchain
          let isConfirmed = false;
          
          this.logger.log(
            `Verificando serviço ${service.id} com hash: ${service.blockchainHash.substring(0, 10)}...`,
          );
          
          // Tentar verificar como transação primeiro (mais comum)
          isConfirmed = await this.besuService.isTransactionConfirmed(
            service.blockchainHash,
          );
          
          // Se não for transação confirmada, verificar se é hash de conteúdo no contrato
          if (!isConfirmed) {
            this.logger.log(
              `Hash ${service.blockchainHash.substring(0, 10)}... não é transação confirmada, verificando no contrato...`,
            );
            try {
              isConfirmed = await this.besuService.verifyHashInContract(
                service.blockchainHash,
              );
            } catch (hashError) {
              this.logger.warn(
                `Erro ao verificar hash no contrato: ${hashError.message}`,
              );
              isConfirmed = false;
            }
          }

          if (isConfirmed) {
            await this.vehicleServiceRepository.update(
              { id: service.id },
              {
                status: ServiceStatus.CONFIRMED,
                blockchainConfirmedAt: new Date(),
                isImmutable: true,
                canEdit: false,
              },
            );

            corrected++;
            this.logger.log(
              `✅ Serviço ${service.id} corrigido: PENDING/REJECTED → CONFIRMED (hash: ${service.blockchainHash.substring(0, 10)}...)`,
            );
          } else {
            notFound++;
            this.logger.warn(
              `⚠️  Serviço ${service.id} não encontrado na blockchain (hash: ${service.blockchainHash.substring(0, 10)}...)`,
            );
          }
        } catch (error) {
          const errorMsg = `Erro ao verificar serviço ${service.id}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      const result = {
        success: true,
        total: failedServices.length,
        corrected,
        notFound,
        errors: errors.length,
        message: `Sincronização concluída: ${corrected} serviços corrigidos, ${notFound} não encontrados na blockchain`,
      };

      this.logger.log(
        `Sincronização concluída: ${corrected} corrigidos, ${notFound} não encontrados, ${errors.length} erros`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Erro ao sincronizar status de serviços:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Corrige hashes inválidos (pending-hash) e gera hashes reais
   * @returns Resultado da operação
   */
  async fixInvalidHashes() {
    try {
      this.logger.log('Corrigindo hashes inválidos...');

      // Buscar serviços com hash "pending-hash"
      const services = await this.vehicleServiceRepository.find({
        where: [{ blockchainHash: 'pending-hash' }],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      let successCount = 0;
      let errorCount = 0;

      for (const service of services) {
        try {
          // Gerar hash real baseado nos dados do serviço
          const eventData = {
            serviceId: service.id,
            vehicleId: service.vehicleId,
            type: service.type,
            description: service.description,
            serviceDate: service.serviceDate,
            timestamp: new Date().toISOString(),
          };

          const realHash = ethers.keccak256(
            ethers.toUtf8Bytes(JSON.stringify(eventData)),
          );

          // Atualizar o hash no banco
          await this.vehicleServiceRepository.update(
            { id: service.id },
            { blockchainHash: realHash },
          );

          // Registrar o hash no contrato
          const result = await this.besuService.registerHash(
            realHash,
            service.vehicleId,
            service.type || 'MANUTENCAO',
          );

          if (result.success) {
            successCount++;
            this.logger.log(`Hash corrigido e registrado: ${realHash}`);
          } else {
            errorCount++;
            this.logger.warn(`Falha ao registrar hash corrigido: ${realHash}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Erro ao corrigir hash do serviço ${service.id}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `Correção concluída: ${successCount} sucessos, ${errorCount} erros`,
      );

      return {
        success: true,
        totalProcessed: services.length,
        successCount,
        errorCount,
        message: `Corrigidos ${successCount} de ${services.length} hashes inválidos`,
      };
    } catch (error) {
      this.logger.error('Erro ao corrigir hashes inválidos:', error.message);
      throw error;
    }
  }

  /**
   * Limpa hashes órfãos do contrato (hashes que não existem no banco local)
   * @returns Resultado da operação
   */
  async cleanOrphanHashes() {
    try {
      this.logger.log('Iniciando limpeza de hashes órfãos...');

      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [{ blockchainHash: Not(IsNull()) }],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      this.logger.log(`Serviços encontrados no banco: ${services.length}`);

      const validHashes = new Set(services.map((s) => s.blockchainHash));

      this.logger.log(`Hashes únicos no banco local: ${validHashes.size}`);

      // Obter estatísticas do contrato
      const contractStats = await this.besuService.getContractStats();
      const totalHashesInContract = contractStats.totalHashes;

      this.logger.log(`Total de hashes no contrato: ${totalHashesInContract}`);

      if (totalHashesInContract > validHashes.size) {
        const orphanCount = totalHashesInContract - validHashes.size;
        this.logger.warn(`Detectados ${orphanCount} hashes órfãos no contrato`);

        this.logger.log(
          `Hashes do banco local: ${Array.from(validHashes).join(', ')}`,
        );

        return {
          success: true,
          message: `Detectados ${orphanCount} hashes órfãos no contrato`,
          orphanCount: orphanCount,
        };
      }

      this.logger.log('Nenhum hash órfão detectado');
      return {
        success: true,
        message: 'Nenhum hash órfão detectado',
        orphanCount: 0,
      };
    } catch (error) {
      this.logger.error('Erro ao limpar hashes órfãos:', error.message);
      throw error;
    }
  }

  /**
   * Registra todos os hashes existentes no contrato blockchain
   * @returns Resultado da operação
   */
  async registerAllExistingHashes() {
    try {
      this.logger.log('Registrando todos os hashes existentes no contrato...');

      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [{ blockchainHash: Not(IsNull()) }],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      let successCount = 0;
      let errorCount = 0;

      for (const service of services) {
        try {
          // Verificar se o hash já existe no contrato
          const exists = await this.besuService.verifyHashInContract(
            service.blockchainHash,
          );

          if (!exists) {
            // Registrar o hash no contrato
            const result = await this.besuService.registerHash(
              service.blockchainHash,
              service.vehicleId,
              service.type || 'MANUTENCAO',
            );

            if (result.success) {
              successCount++;
              this.logger.log(`Hash registrado: ${service.blockchainHash}`);
            } else {
              errorCount++;
              this.logger.warn(
                `Falha ao registrar hash: ${service.blockchainHash}`,
              );
            }
          } else {
            this.logger.log(
              `Hash já existe no contrato: ${service.blockchainHash}`,
            );
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Erro ao processar hash ${service.blockchainHash}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `Registro concluído: ${successCount} sucessos, ${errorCount} erros`,
      );

      return {
        success: true,
        totalProcessed: services.length,
        successCount,
        errorCount,
        message: `Registrados ${successCount} de ${services.length} hashes`,
      };
    } catch (error) {
      this.logger.error('Erro ao registrar hashes existentes:', error.message);
      throw error;
    }
  }

  /**
   * Corrige hashes que estão falhando na verificação
   * @returns Resultado da operação
   */
  async fixFailingHashes() {
    try {
      this.logger.log('Corrigindo hashes que estão falhando na verificação...');

      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [{ blockchainHash: Not(IsNull()) }],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      let successCount = 0;
      let errorCount = 0;
      let fixedCount = 0;

      for (const service of services) {
        try {
          // Verificar se o hash existe no contrato
          const exists = await this.besuService.verifyHashInContract(
            service.blockchainHash,
          );

          if (!exists) {
            this.logger.log(
              `Hash não encontrado no contrato, registrando: ${service.blockchainHash}`,
            );

            const result = await this.besuService.registerHash(
              service.blockchainHash,
              service.vehicleId,
              service.type || 'MANUTENCAO',
            );

            if (result.success) {
              await this.vehicleServiceRepository.update(
                { id: service.id },
                {
                  blockchainConfirmedAt: new Date(),
                  status: ServiceStatus.CONFIRMED,
                  isImmutable: true,
                  canEdit: false,
                  confirmedBy: 'blockchain-fix',
                },
              );

              fixedCount++;
              successCount++;
              this.logger.log(
                `Hash corrigido e registrado: ${service.blockchainHash}`,
              );
            } else {
              errorCount++;
              this.logger.warn(
                `Falha ao registrar hash: ${service.blockchainHash}`,
              );
            }
          } else {
            this.logger.log(
              `Hash já existe no contrato: ${service.blockchainHash}`,
            );
            successCount++;
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Erro ao processar hash ${service.blockchainHash}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `Correção concluída: ${fixedCount} hashes corrigidos, ${successCount} sucessos, ${errorCount} erros`,
      );

      return {
        success: true,
        totalProcessed: services.length,
        fixedCount,
        successCount,
        errorCount,
        message: `Corrigidos ${fixedCount} de ${services.length} hashes falhando`,
      };
    } catch (error) {
      this.logger.error('Erro ao corrigir hashes falhando:', error.message);
      throw error;
    }
  }

  /**
   * Verifica e corrige datas incorretas nos serviços
   * @returns Resultado da operação
   */
  async fixIncorrectDates() {
    try {
      this.logger.log('Verificando e corrigindo datas incorretas...');

      // Buscar todos os serviços
      const services = await this.vehicleServiceRepository.find({
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      let correctedCount = 0;
      const currentDate = new Date();
      const oneYearAgo = new Date(
        currentDate.getFullYear() - 1,
        currentDate.getMonth(),
        currentDate.getDate(),
      );
      const oneYearFromNow = new Date(
        currentDate.getFullYear() + 1,
        currentDate.getMonth(),
        currentDate.getDate(),
      );

      for (const service of services) {
        let needsUpdate = false;
        const updates: any = {};

        // Verificar serviceDate
        if (service.serviceDate) {
          const serviceDate = new Date(service.serviceDate);
          if (serviceDate > oneYearFromNow || serviceDate < oneYearAgo) {
            this.logger.warn(
              `Data de serviço suspeita: ${serviceDate} para serviço ${service.id}`,
            );
            updates.serviceDate = service.createdAt;
            needsUpdate = true;
          }
        }

        // Verificar se createdAt está no futuro
        if (service.createdAt) {
          const createdAt = new Date(service.createdAt);
          if (createdAt > currentDate) {
            this.logger.warn(
              `Data de criação no futuro: ${createdAt} para serviço ${service.id}`,
            );
            updates.createdAt = currentDate;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await this.vehicleServiceRepository.update(
            { id: service.id },
            updates,
          );
          correctedCount++;
          this.logger.log(`Datas corrigidas para serviço ${service.id}`);
        }
      }

      this.logger.log(
        `Correção concluída: ${correctedCount} serviços corrigidos`,
      );

      return {
        success: true,
        totalProcessed: services.length,
        correctedCount,
        message: `Corrigidas ${correctedCount} datas incorretas de ${services.length} serviços`,
      };
    } catch (error) {
      this.logger.error('Erro ao corrigir datas:', error.message);
      throw error;
    }
  }

  async getAllServices(userId?: string) {
    try {
      if (await this.besuService.isConnected()) {
        this.logger.log('Serviços gerenciados pela rede Besu');

        const queryBuilder = this.vehicleServiceRepository
          .createQueryBuilder('vehicleService')
          .leftJoinAndSelect('vehicleService.vehicle', 'vehicle')
          .where(
            '(vehicleService.blockchainHash IS NOT NULL OR vehicleService.status IN (:...failedStatuses))',
            {
              failedStatuses: [ServiceStatus.REJECTED, ServiceStatus.EXPIRED],
            },
          )
          .orderBy('vehicleService.createdAt', 'DESC');

        if (userId) {
          queryBuilder.andWhere('vehicle.userId = :userId', { userId });
        }

        const services = await queryBuilder.getMany();

        const rejectedServices = services.filter(
          (s) => s.status === ServiceStatus.REJECTED,
        );
        const expiredServices = services.filter(
          (s) => s.status === ServiceStatus.EXPIRED,
        );
        const servicesWithHash = services.filter((s) => s.blockchainHash);
        const servicesWithoutHash = services.filter((s) => !s.blockchainHash);

        this.logger.log(
          `Encontrados ${services.length} serviços (com hash ou REJECTED/EXPIRED)`,
        );
        this.logger.log(`  - Com hash: ${servicesWithHash.length}`);
        this.logger.log(`  - Sem hash: ${servicesWithoutHash.length}`);
        this.logger.log(`  - REJECTED: ${rejectedServices.length}`);
        this.logger.log(`  - EXPIRED: ${expiredServices.length}`);
        this.logger.log(
          `  - Confirmados: ${services.filter((s) => s.blockchainConfirmedAt).length}`,
        );

        const contractStats = await this.besuService.getContractStats();
        this.logger.log(
          `Total de hashes no contrato: ${contractStats.totalHashes}`,
        );

        const verifiedServices =
          await this.verifyServicesInBlockchain(services);

        const mappedServices = verifiedServices.map((service) => {
          let mappedStatus = 'PENDING';
          let isValidHash = false;

          // Primeiro verificar se o serviço foi rejeitado ou expirado (sempre FAILED)
          const isRejectedOrExpired =
            service.status === ServiceStatus.REJECTED ||
            service.status === ServiceStatus.EXPIRED ||
            service.status === 'rejected' ||
            service.status === 'expired' ||
            String(service.status).toLowerCase() === 'rejected' ||
            String(service.status).toLowerCase() === 'expired';

          if (isRejectedOrExpired) {
            // Serviço rejeitado ou expirado no banco - sempre FAILED
            mappedStatus = 'FAILED';
            this.logger.log(
              `Serviço ${service.id} rejeitado/expirado no banco - Status: FAILED (dbStatus=${service.status})`,
            );
          } else if (service.blockchainHash) {
            isValidHash = true;

            if (service.blockchainVerified) {
              mappedStatus = 'CONFIRMED';
              this.logger.log(`Serviço ${service.id} CONFIRMADO na blockchain`);
            } else {
              if (service.blockchainHash === 'pending-hash') {
                mappedStatus = 'PENDING';
                this.logger.log(
                  `Serviço ${service.id} com hash temporário - aguardando registro`,
                );
              } else {
                mappedStatus = 'FAILED';
                this.logger.log(
                  `Serviço ${service.id} NÃO verificado na blockchain - Status: FAILED (reenvio necessário)`,
                );
              }
            }
          } else {
            // Sem hash blockchain ainda (registro em andamento)
            mappedStatus = 'PENDING';
            this.logger.log(`Serviço ${service.id} sem hash - Status: PENDING`);
          }

          this.logger.log(
            `Serviço ${service.id}: hash=${service.blockchainHash?.substring(0, 10)}..., verified=${service.blockchainVerified}, dbStatus=${service.status}, finalStatus=${mappedStatus}`,
          );
          this.logger.log(
            `Datas do serviço ${service.id}: serviceDate=${service.serviceDate}, createdAt=${service.createdAt}`,
          );

          return {
            id: service.id,
            serviceId: service.id,
            vehicleId: service.vehicleId,
            vehicle: service.vehicle
              ? {
                  brand: service.vehicle.brand,
                  model: service.vehicle.model,
                  plate: service.vehicle.plate,
                  year: service.vehicle.year,
                }
              : null,
            type: service.type,
            category: service.category,
            description: service.description,
            serviceDate: service.serviceDate,
            createdAt: service.createdAt,
            mileage: service.mileage,
            cost: service.cost,
            location: service.location,
            status: mappedStatus,
            blockchainHash: service.blockchainHash,
            transactionHash: service.blockchainHash,
            blockNumber: service.blockchainConfirmedAt ? 1 : undefined, // Placeholder
            gasPrice: '-',
            technician: service.technician,
            warranty: service.warranty,
            notes: service.notes,
            isValidHash: isValidHash,
          };
        });

        const confirmedCount = mappedServices.filter(
          (s) => s.status === 'CONFIRMED',
        ).length;
        const submittedCount = mappedServices.filter(
          (s) => s.status === 'SUBMITTED',
        ).length;
        const pendingCount = mappedServices.filter(
          (s) => s.status === 'PENDING',
        ).length;
        const failedCount = mappedServices.filter(
          (s) => s.status === 'FAILED',
        ).length;

        this.logger.log(
          `Status final: CONFIRMED=${confirmedCount}, SUBMITTED=${submittedCount}, PENDING=${pendingCount}, FAILED=${failedCount}`,
        );

        return mappedServices;
      }

      this.logger.warn('Rede blockchain não disponível para listar serviços');
      return [];
    } catch (error) {
      this.logger.error('Erro ao obter todos os serviços:', error);
      return [];
    }
  }

  /**
   * Reenvia um serviço falhado para a blockchain
   * @param serviceId ID do serviço a ser reenviado
   * @returns Resultado do reenvio
   */
  async resendFailedService(
    serviceId: string,
  ): Promise<ServiceSubmissionResult> {
    try {
      this.logger.log(`Reenviando serviço falhado: ${serviceId}`);

      // Buscar o serviço no banco de dados
      const service = await this.vehicleServiceRepository.findOne({
        where: { id: serviceId },
        relations: ['vehicle'],
      });

      this.logger.log('Serviço encontrado', 'BlockchainService', {
        id: service?.id,
        status: service?.status,
        blockchainHash: service?.blockchainHash,
        isImmutable: service?.isImmutable,
        vehicleId: service?.vehicleId,
        description: service?.description,
      });

      if (!service) {
        this.logger.warn(`Serviço não encontrado: ${serviceId}`);
        return {
          success: false,
          error: 'Serviço não encontrado',
          status: 'FAILED',
        };
      }

      // OTIMIZAÇÃO: Se o serviço já está marcado como REJECTED/EXPIRED, pode reenviar diretamente
      // (não precisa verificar na blockchain, pois já sabemos que falhou)
      const canResendDirectly =
        service.status === ServiceStatus.REJECTED ||
        service.status === ServiceStatus.EXPIRED ||
        !service.blockchainHash ||
        service.blockchainHash === 'pending-hash';

      if (canResendDirectly) {
        this.logger.log(
          `Serviço ${service.id} pode ser reenviado diretamente (status: ${service.status})`,
        );
      } else {
        // Apenas verifica na blockchain se o serviço parece estar confirmado
        // Usa timeout curto (5 segundos) para não travar
        this.logger.log(
          `Verificando se hash está na blockchain (com timeout de 5s)...`,
        );

        try {
          const verificationPromise = this.besuService.verifyHashInContract(
            service.blockchainHash,
          );
          const timeoutPromise = new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout na verificação')), 5000),
          );

          const isInBlockchain = await Promise.race([
            verificationPromise,
            timeoutPromise,
          ]);

          if (isInBlockchain) {
            this.logger.warn(
              `Serviço ${service.id} JÁ ESTÁ na blockchain - Reenvio bloqueado`,
            );
            return {
              success: false,
              error: 'Serviço já está registrado e verificado na blockchain',
              status: 'FAILED',
            };
          }

          this.logger.log(`Hash não encontrado na blockchain - pode reenviar`);
        } catch (error) {
          // Se a verificação falhar ou der timeout, PERMITE reenvio
          // (melhor tentar reenviar do que bloquear por erro de verificação)
          this.logger.warn(
            `Erro/timeout na verificação (${error.message}) - permitindo reenvio por segurança`,
          );
        }
      }

      // Log de tentativas (sem limite - permite reenvios ilimitados)
      const retryCount = await this.getRetryCount(serviceId);
      this.logger.log(`Tentativa de reenvio número ${retryCount + 1}`);

      // Gerar o hash do serviço
      const eventData = {
        serviceId: service.id,
        vehicleId: service.vehicleId,
        type: service.type,
        description: service.description,
        serviceDate: service.serviceDate,
        timestamp: new Date().toISOString(),
      };

      const serviceHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(eventData)),
      );
      this.logger.log(
        `Hash gerado para reenvio do serviço ${service.id}: ${serviceHash}`,
      );

      // Registrar o hash no contrato blockchain
      this.logger.log(`Tentando registrar hash no contrato blockchain...`);
      const hashResult = await this.registerHashInContract(
        serviceHash,
        service.vehicleId,
        service.type || 'MANUTENCAO',
      );

      this.logger.log('Resultado do registro', 'BlockchainService', hashResult);

      if (hashResult.success) {
        // Atualizar o serviço com informações da blockchain
        service.blockchainHash = serviceHash;
        service.status = ServiceStatus.CONFIRMED;
        service.isImmutable = true;
        service.canEdit = false;
        service.blockchainConfirmedAt = new Date();
        service.confirmedBy = 'blockchain-resend';

        await this.vehicleServiceRepository.save(service);

        // Incrementar contador de tentativas
        await this.incrementRetryCount(serviceId);

        this.logger.log(
          `Serviço ${service.id} reenviado e registrado na blockchain com sucesso - Hash: ${serviceHash}`,
        );

        return {
          success: true,
          transactionHash: serviceHash,
          status: 'CONFIRMED',
          message: 'Serviço reenviado e registrado na blockchain com sucesso',
        };
      } else {
        // Incrementar contador de tentativas mesmo em caso de falha
        await this.incrementRetryCount(serviceId);

        // Manter ou atualizar status como rejeitado
        if (service.status !== ServiceStatus.REJECTED) {
          service.status = ServiceStatus.REJECTED;
          await this.vehicleServiceRepository.save(service);
        }

        this.logger.warn(
          `Falha ao reenviar serviço ${service.id}: ${hashResult.error}`,
        );

        return {
          success: false,
          error: hashResult.error || 'Erro ao registrar na blockchain',
          status: 'FAILED',
        };
      }
    } catch (error) {
      this.logger.error('Erro ao reenviar serviço:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED',
      };
    }
  }

  /**
   * Obtém o número de tentativas de reenvio de um serviço
   * @param serviceId ID do serviço
   * @returns Número de tentativas
   */
  private async getRetryCount(serviceId: string): Promise<number> {
    // Por simplicidade, vamos usar um campo no banco ou cache
    // Em uma implementação real, você poderia ter uma tabela separada para tracking
    const service = await this.vehicleServiceRepository.findOne({
      where: { id: serviceId },
      select: ['id', 'notes'], // Usar notes para armazenar retry count temporariamente
    });

    if (!service || !service.notes) return 0;

    const retryMatch = service.notes.match(/retry_count:(\d+)/);
    return retryMatch ? parseInt(retryMatch[1]) : 0;
  }

  /**
   * Incrementa o contador de tentativas de reenvio
   * @param serviceId ID do serviço
   */
  private async incrementRetryCount(serviceId: string): Promise<void> {
    const currentCount = await this.getRetryCount(serviceId);
    const newCount = currentCount + 1;

    await this.vehicleServiceRepository.update(
      { id: serviceId },
      {
        notes: `retry_count:${newCount}`,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Reseta o contador de tentativas de reenvio de um serviço
   * @param serviceId ID do serviço
   */
  async resetRetryCount(
    serviceId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `Resetando contador de tentativas do serviço: ${serviceId}`,
      );

      await this.vehicleServiceRepository.update(
        { id: serviceId },
        {
          notes: 'retry_count:0',
          updatedAt: new Date(),
        },
      );

      return {
        success: true,
        message: 'Contador de tentativas resetado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao resetar contador: ${error.message}`);
      return {
        success: false,
        message: `Erro ao resetar contador: ${error.message}`,
      };
    }
  }

  /**
   * Reseta o contador de todos os serviços falhados
   */
  async resetAllFailedRetries(): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> {
    try {
      this.logger.log(
        `Resetando contadores de todos os serviços rejeitados...`,
      );

      // Buscar todos os serviços rejeitados/expirados
      const failedServices = await this.vehicleServiceRepository.find({
        where: [
          { status: ServiceStatus.REJECTED },
          { status: ServiceStatus.EXPIRED },
        ],
      });

      // Resetar contador de cada um
      await Promise.all(
        failedServices.map((service) =>
          this.vehicleServiceRepository.update(
            { id: service.id },
            { notes: 'retry_count:0', updatedAt: new Date() },
          ),
        ),
      );

      this.logger.log(`Resetados ${failedServices.length} serviços`);

      return {
        success: true,
        count: failedServices.length,
        message: `${failedServices.length} serviços resetados com sucesso`,
      };
    } catch (error) {
      this.logger.error(`Erro ao resetar contadores: ${error.message}`);
      return {
        success: false,
        count: 0,
        message: `Erro ao resetar contadores: ${error.message}`,
      };
    }
  }

  /**
   * Registra um hash diretamente no contrato blockchain
   * @param hash Hash a ser registrado
   * @param vehicleId ID do veículo
   * @param eventType Tipo do evento
   * @returns Resultado do registro
   */
  async registerHashInContract(
    hash: string,
    vehicleId: string,
    eventType: string,
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Log inicial - CRÍTICO para rastreamento no CloudWatch
      this.logger.log(
        `🚀 INICIANDO: Registro de hash no contrato blockchain`,
        'BlockchainService',
        {
          hash: hash.substring(0, 20) + '...',
          vehicleId,
          eventType,
          status: 'INITIATED',
          timestamp: new Date().toISOString(),
        },
      );

      const isConnected = await this.besuService.isConnected();
      this.logger.log(
        `Status da conexão Besu: ${isConnected}`,
        'BlockchainService',
      );

      if (isConnected) {
        try {
          this.logger.log(
            `Chamando besuService.registerHash com timeout de 25s...`,
            'BlockchainService',
          );

          // Adicionar timeout de 25 segundos para não ultrapassar timeout do HTTP (30s)
          const registerPromise = this.besuService.registerHash(
            hash,
            vehicleId,
            eventType,
          );
          const timeoutPromise = new Promise<any>((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout no registro (25s)')),
              25000,
            ),
          );

          const result = await Promise.race([registerPromise, timeoutPromise]);

          this.logger.log(
            `Resultado do besuService.registerHash: ${result.success ? 'SUCESSO' : 'FALHA'}`,
            'BlockchainService',
            {
              success: result.success,
              transactionHash: result.transactionHash
                ? result.transactionHash.substring(0, 16) + '...'
                : null,
              error: result.error,
            },
          );

          if (result.success) {
            // Log explícito de SUCESSO para CloudWatch - CRÍTICO para TCC
            this.logger.log(
              `✅ SUCESSO: Hash registrado no contrato blockchain com sucesso! Transação confirmada.`,
              'BlockchainService',
              {
                transactionHash: result.transactionHash,
                hash: hash.substring(0, 20) + '...',
                vehicleId,
                eventType,
                status: 'CONFIRMED',
                timestamp: new Date().toISOString(),
              },
            );
            return {
              success: true,
              transactionHash: result.transactionHash,
            };
          } else {
            this.logger.warn(
              `Falha ao registrar hash no contrato: ${result.error}`,
              'BlockchainService',
              {
                hash: hash.substring(0, 16) + '...',
                vehicleId,
                error: result.error,
              },
            );
            return {
              success: false,
              error: result.error,
            };
          }
        } catch (besuError) {
          this.logger.error(
            'Erro ao registrar hash na rede Besu:',
            besuError.message,
            'BlockchainService',
            {
              hash: hash.substring(0, 16) + '...',
              vehicleId,
              errorMessage: besuError.message,
            },
          );
          return {
            success: false,
            error: `Falha na rede Besu: ${besuError.message}`,
          };
        }
      }

      // Se Besu não estiver disponível, retornar falha
      this.logger.warn(
        'Rede Besu não disponível - hash não registrado na blockchain',
        'BlockchainService',
        {
          hash: hash.substring(0, 16) + '...',
          vehicleId,
        },
      );
      return {
        success: false,
        error: 'Rede blockchain não disponível',
      };
    } catch (error) {
      this.logger.error(
        'Erro ao registrar hash no contrato:',
        error.message,
        'BlockchainService',
        {
          hash: hash.substring(0, 16) + '...',
          vehicleId,
          errorMessage: error.message,
        },
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getNetworkHealth(): Promise<{
    status: string;
    blockNumber?: number;
    gasPrice?: string;
    network?: string;
    peers?: number;
  }> {
    try {
      if (await this.besuService.isConnected()) {
        try {
          const networkInfo = await this.besuService.getNetworkInfo();
          return {
            status: 'HEALTHY',
            blockNumber: networkInfo.blockNumber,
            gasPrice: networkInfo.gasPrice,
            network: `Besu Chain ID ${networkInfo.chainId}`,
          };
        } catch (besuError) {
          this.logger.warn(
            'Erro ao verificar saúde da rede Besu:',
            besuError.message,
          );
        }
      }

      return {
        status: 'UNHEALTHY',
        blockNumber: 0,
        gasPrice: '0',
        network: 'Besu não disponível',
      };
    } catch (error) {
      this.logger.error('Erro ao verificar saúde da rede:', error);
      return {
        status: 'UNHEALTHY',
        blockNumber: 0,
        gasPrice: '0',
        network: 'Erro de conexão',
      };
    }
  }
}
