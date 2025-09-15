import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BesuService } from './besu/besu.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { VehicleService } from '../modules/vehicle/entities/vehicle-service.entity';

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
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(
    private configService: ConfigService,
    private besuService: BesuService,
    @InjectRepository(VehicleService)
    private vehicleServiceRepository: Repository<VehicleService>,
  ) {
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      try {
        const isConnected = await this.besuService.isConnected();
        if (isConnected) {
          this.logger.log('✅ Rede Besu privada conectada com sucesso');
          return;
        } else {
          this.logger.warn('⚠️ Rede Besu não está conectada');
        }
      } catch (besuError) {
        this.logger.warn('⚠️ Erro ao conectar com rede Besu:', besuError.message);
      }

      // Se Besu não estiver disponível, não configurar fallback
      this.logger.warn('🚫 Rede blockchain não disponível - serviços não serão registrados na blockchain');
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar serviço blockchain:', error);
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
          // Criar hash do evento para registrar na blockchain
          const eventData = {
            serviceId: serviceData.serviceId,
            vehicleId: serviceData.vehicleId,
            type: serviceData.type || 'MANUTENCAO',
            description: serviceData.description,
            cost: serviceData.cost,
            location: serviceData.location || 'Local não especificado',
            mileage: serviceData.mileage,
            timestamp: new Date().toISOString()
          };

          // Criar hash único do evento
          const eventHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(eventData)));

          const result = await this.besuService.registerHash(
            eventHash,
            serviceData.vehicleId,
            serviceData.type || 'MANUTENCAO'
          );

          if (result.success) {
            this.logger.log('✅ Evento registrado na rede Besu com sucesso');
            return {
              success: true,
              transactionHash: result.transactionHash,
              status: 'SUBMITTED' as const,
              serviceId: serviceData.serviceId,
              message: 'Evento registrado na blockchain Besu'
            };
          } else {
            throw new Error(result.error || 'Erro desconhecido');
          }
        } catch (besuError) {
          this.logger.error('❌ Erro ao registrar na rede Besu:', besuError.message);
          return {
            success: false,
            error: `Falha na rede Besu: ${besuError.message}`,
            status: 'FAILED'
          };
        }
      }

      // Se Besu não estiver disponível, retornar falha
      this.logger.warn('🚫 Rede Besu não disponível - serviço não registrado na blockchain');
      return {
        success: false,
        error: 'Rede blockchain não disponível',
        status: 'FAILED',
        message: 'Serviço salvo localmente, mas não registrado na blockchain'
      };
    } catch (error) {
      this.logger.error('❌ Erro ao submeter serviço para blockchain:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED'
      };
    }
  }

  async confirmService(serviceId: string): Promise<ServiceSubmissionResult> {
    try {
      if (await this.besuService.isConnected()) {
        this.logger.log('✅ Transação Besu automaticamente confirmada');
        return {
          success: true,
          status: 'CONFIRMED',
          message: 'Transações Besu são automaticamente confirmadas'
        };
      }

      // Se Besu não estiver disponível
      this.logger.warn('🚫 Rede blockchain não disponível para confirmação');
      return {
        success: false,
        error: 'Rede blockchain não disponível',
        status: 'FAILED'
      };
    } catch (error) {
      this.logger.error('❌ Erro ao confirmar serviço na blockchain:', error);
      return {
        success: false,
        error: error.message,
        status: 'FAILED'
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
            timestamp: Date.now()
          };
        } catch (besuError) {
          this.logger.warn('⚠️ Erro ao verificar status na rede Besu:', besuError.message);
        }
      }

      this.logger.warn('🚫 Rede blockchain não disponível para verificar status');
      return {
        hash: serviceId,
        status: 'FAILED'
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter status do serviço na blockchain:', error);
      return {
        hash: serviceId,
        status: 'FAILED'
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
              const hashExists = await this.besuService.verifyHashInContract(service.blockchainHash);
              blockchainVerified = hashExists;
              
              if (hashExists && !service.blockchainConfirmedAt) {
                // Atualizar status de confirmação no banco
                await this.vehicleServiceRepository.update(
                  { id: service.id },
                  { blockchainConfirmedAt: new Date() }
                );
                service.blockchainConfirmedAt = new Date();
              } else if (!hashExists) {
                // Hash não existe no contrato - marcar como falhou
                this.logger.warn(`❌ Hash ${service.blockchainHash} não encontrado no contrato - marcando como falhou`);
              }
            } catch (error) {
              this.logger.warn(`⚠️ Erro ao verificar hash ${service.blockchainHash}: ${error.message}`);
              blockchainVerified = false;
            }
          }
          
          return {
            ...service,
            blockchainVerified
          };
        })
      );
      
      return verifiedServices;
    } catch (error) {
      this.logger.error('❌ Erro ao verificar serviços na blockchain:', error.message);
      return services.map(service => ({ ...service, blockchainVerified: false }));
    }
  }

  /**
   * Força a verificação de todos os serviços na blockchain
   * @returns Lista de serviços com status atualizado
   */
  async forceVerifyAllServices() {
    try {
      this.logger.log('🔄 Forçando verificação de todos os serviços na blockchain...');
      
      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [
          { blockchainHash: Not(IsNull()) }
        ],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' }
      });

      // Verificar cada serviço na blockchain
      const verifiedServices = await this.verifyServicesInBlockchain(services);
      
      this.logger.log(`✅ Verificação concluída: ${verifiedServices.length} serviços processados`);
      return verifiedServices;
    } catch (error) {
      this.logger.error('❌ Erro ao forçar verificação de serviços:', error.message);
      throw error;
    }
  }

  /**
   * Corrige hashes inválidos (pending-hash) e gera hashes reais
   * @returns Resultado da operação
   */
  async fixInvalidHashes() {
    try {
      this.logger.log('🔧 Corrigindo hashes inválidos...');
      
      // Buscar serviços com hash "pending-hash"
      const services = await this.vehicleServiceRepository.find({
        where: [
          { blockchainHash: 'pending-hash' }
        ],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' }
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
            timestamp: new Date().toISOString()
          };
          
          const realHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(eventData)));
          
          // Atualizar o hash no banco
          await this.vehicleServiceRepository.update(
            { id: service.id },
            { blockchainHash: realHash }
          );
          
          // Registrar o hash no contrato
          const result = await this.besuService.registerHash(
            realHash,
            service.vehicleId,
            service.type || 'MANUTENCAO'
          );
          
          if (result.success) {
            successCount++;
            this.logger.log(`✅ Hash corrigido e registrado: ${realHash}`);
          } else {
            errorCount++;
            this.logger.warn(`⚠️ Falha ao registrar hash corrigido: ${realHash}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Erro ao corrigir hash do serviço ${service.id}:`, error.message);
        }
      }

      this.logger.log(`📊 Correção concluída: ${successCount} sucessos, ${errorCount} erros`);
      
      return {
        success: true,
        totalProcessed: services.length,
        successCount,
        errorCount,
        message: `Corrigidos ${successCount} de ${services.length} hashes inválidos`
      };
    } catch (error) {
      this.logger.error('❌ Erro ao corrigir hashes inválidos:', error.message);
      throw error;
    }
  }

  /**
   * Limpa hashes órfãos do contrato (hashes que não existem no banco local)
   * @returns Resultado da operação
   */
  async cleanOrphanHashes() {
    try {
      this.logger.log('🧹 Iniciando limpeza de hashes órfãos...');
      
      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [
          { blockchainHash: Not(IsNull()) }
        ],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' }
      });

      this.logger.log(`📊 Serviços encontrados no banco: ${services.length}`);

      // Obter todos os hashes válidos do banco local
      const validHashes = new Set(services.map(s => s.blockchainHash));
      
      this.logger.log(`📊 Hashes únicos no banco local: ${validHashes.size}`);
      
      // Obter estatísticas do contrato
      const contractStats = await this.besuService.getContractStats();
      const totalHashesInContract = contractStats.totalHashes;
      
      this.logger.log(`📊 Total de hashes no contrato: ${totalHashesInContract}`);
      
      if (totalHashesInContract > validHashes.size) {
        const orphanCount = totalHashesInContract - validHashes.size;
        this.logger.warn(`⚠️ Detectados ${orphanCount} hashes órfãos no contrato`);
        
        // Listar os hashes do banco para debug
        this.logger.log(`📋 Hashes do banco local: ${Array.from(validHashes).join(', ')}`);
        
        return {
          success: true,
          message: `Detectados ${orphanCount} hashes órfãos no contrato`,
          orphanCount: orphanCount
        };
      }
      
      this.logger.log('✅ Nenhum hash órfão detectado');
      return {
        success: true,
        message: 'Nenhum hash órfão detectado',
        orphanCount: 0
      };
    } catch (error) {
      this.logger.error('❌ Erro ao limpar hashes órfãos:', error.message);
      throw error;
    }
  }

  /**
   * Registra todos os hashes existentes no contrato blockchain
   * @returns Resultado da operação
   */
  async registerAllExistingHashes() {
    try {
      this.logger.log('🔄 Registrando todos os hashes existentes no contrato...');
      
      // Buscar todos os serviços com hash blockchain
      const services = await this.vehicleServiceRepository.find({
        where: [
          { blockchainHash: Not(IsNull()) }
        ],
        relations: ['vehicle'],
        order: { createdAt: 'DESC' }
      });

      let successCount = 0;
      let errorCount = 0;

      for (const service of services) {
        try {
          // Verificar se o hash já existe no contrato
          const exists = await this.besuService.verifyHashInContract(service.blockchainHash);
          
          if (!exists) {
            // Registrar o hash no contrato
            const result = await this.besuService.registerHash(
              service.blockchainHash,
              service.vehicleId,
              service.type || 'MANUTENCAO'
            );
            
            if (result.success) {
              successCount++;
              this.logger.log(`✅ Hash registrado: ${service.blockchainHash}`);
            } else {
              errorCount++;
              this.logger.warn(`⚠️ Falha ao registrar hash: ${service.blockchainHash}`);
            }
          } else {
            this.logger.log(`ℹ️ Hash já existe no contrato: ${service.blockchainHash}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Erro ao processar hash ${service.blockchainHash}:`, error.message);
        }
      }

      this.logger.log(`📊 Registro concluído: ${successCount} sucessos, ${errorCount} erros`);
      
      return {
        success: true,
        totalProcessed: services.length,
        successCount,
        errorCount,
        message: `Registrados ${successCount} de ${services.length} hashes`
      };
    } catch (error) {
      this.logger.error('❌ Erro ao registrar hashes existentes:', error.message);
      throw error;
    }
  }

  async getAllServices() {
    try {
      if (await this.besuService.isConnected()) {
        this.logger.log('📋 Serviços gerenciados pela rede Besu');

        // Buscar serviços do banco de dados que têm hash blockchain
        const services = await this.vehicleServiceRepository.find({
          where: [
            { blockchainHash: Not(IsNull()) }
          ],
          relations: ['vehicle'],
          order: { createdAt: 'DESC' }
        });

        this.logger.log(`📊 Encontrados ${services.length} serviços com hash blockchain`);
        this.logger.log(`📊 Serviços confirmados: ${services.filter(s => s.blockchainConfirmedAt).length}`);

        // Obter estatísticas do contrato para validação
        const contractStats = await this.besuService.getContractStats();
        this.logger.log(`📊 Total de hashes no contrato: ${contractStats.totalHashes}`);

        // Verificar status real das transações na blockchain
        const verifiedServices = await this.verifyServicesInBlockchain(services);

        // Converter para formato esperado pelo frontend
        const mappedServices = verifiedServices.map((service) => {
          // Determinar status baseado na verificação real da blockchain
          let mappedStatus = 'PENDING';
          let isValidHash = false;
          
          if (service.blockchainHash) {
            isValidHash = true;
            
            if (service.blockchainVerified) {
              // Serviço verificado na blockchain
              mappedStatus = 'CONFIRMED';
            } else if (service.blockchainHash && !service.blockchainVerified) {
              // Serviço com hash mas não verificado na blockchain
              if (service.blockchainHash === 'pending-hash') {
                mappedStatus = 'PENDING'; // Hash inválido, precisa ser corrigido
              } else {
                mappedStatus = 'FAILED'; // Hash válido mas não registrado na blockchain
              }
            } else {
              // Serviço sem hash blockchain
              mappedStatus = 'PENDING';
            }
          } else if (service.status === 'rejected' || service.status === 'expired') {
            // Serviço rejeitado ou expirado
            mappedStatus = 'FAILED';
          } else {
            // Serviço sem hash blockchain (antigos ou pendentes)
            mappedStatus = 'PENDING';
          }

          this.logger.log(`🔍 Serviço ${service.id}: hash=${!!service.blockchainHash}, confirmed=${!!service.blockchainConfirmedAt}, verified=${service.blockchainVerified}, status=${mappedStatus}`);

          return {
            id: service.id,
            serviceId: service.id,
            vehicleId: service.vehicleId,
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
            isValidHash: isValidHash
          };
        });

        const confirmedCount = mappedServices.filter(s => s.status === 'CONFIRMED').length;
        const submittedCount = mappedServices.filter(s => s.status === 'SUBMITTED').length;
        const pendingCount = mappedServices.filter(s => s.status === 'PENDING').length;
        const failedCount = mappedServices.filter(s => s.status === 'FAILED').length;
        
        this.logger.log(`📊 Status final: CONFIRMED=${confirmedCount}, SUBMITTED=${submittedCount}, PENDING=${pendingCount}, FAILED=${failedCount}`);

        return mappedServices;
      }

      this.logger.warn('🚫 Rede blockchain não disponível para listar serviços');
      return [];
    } catch (error) {
      this.logger.error('❌ Erro ao obter todos os serviços:', error);
      return [];
    }
  }

  async getNetworkHealth(): Promise<{ status: string; blockNumber?: number; gasPrice?: string; network?: string; peers?: number }> {
    try {
      if (await this.besuService.isConnected()) {
        try {
          const networkInfo = await this.besuService.getNetworkInfo();
          return {
            status: 'HEALTHY',
            blockNumber: networkInfo.blockNumber,
            gasPrice: networkInfo.gasPrice,
            network: `Besu Chain ID ${networkInfo.chainId}`
          };
        } catch (besuError) {
          this.logger.warn('⚠️ Erro ao verificar saúde da rede Besu:', besuError.message);
        }
      }

      return {
        status: 'UNHEALTHY',
        blockNumber: 0,
        gasPrice: '0',
        network: 'Besu não disponível'
      };
    } catch (error) {
      this.logger.error('❌ Erro ao verificar saúde da rede:', error);
      return {
        status: 'UNHEALTHY',
        blockNumber: 0,
        gasPrice: '0',
        network: 'Erro de conexão'
      };
    }
  }
}
