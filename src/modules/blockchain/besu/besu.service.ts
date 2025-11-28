import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { LoggerService } from '@/common/logger/logger.service';

/**
 * Serviço para interação com a rede privada Besu
 * AutoLogger - Rede Privada Besu com IBFT 2.0
 */
@Injectable()
export class BesuService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  // ABI do contrato VehicleServiceTracker
  private readonly contractABI = [
    // Funções principais
    'function registerService(string memory _vehicleId, uint256 _mileage, uint256 _cost, string memory _description, string memory _serviceType) external returns (uint256 serviceId)',
    'function verifyService(uint256 _serviceId) external',
    'function updateService(uint256 _serviceId, string memory _newDescription, uint256 _newCost) external',
    'function getService(uint256 _serviceId) external view returns (tuple(uint256 serviceId, string vehicleId, uint256 mileage, uint256 cost, string description, string serviceType, uint256 timestamp, address serviceProvider, bool isVerified) record)',
    'function getVehicleServices(string memory _vehicleId) external view returns (uint256[] memory serviceIds)',
    'function getProviderServices(address _provider) external view returns (uint256[] memory serviceIds)',
    'function getStats() external view returns (uint256 total, uint256 verified, uint256 balance)',
    'function registerHash(string memory _hash) external',
    'function hashExists(string memory _hash) external view returns (bool)',
    'function getRegisteredHashesCount() external view returns (uint256)',
    'function totalServices() external view returns (uint256)',
    'function nextServiceId() external view returns (uint256)',
    'function admin() external view returns (address)',
    'function transferAdmin(address _newAdmin) external',
    'function withdraw(uint256 _amount) external',

    // Eventos
    'event ServiceRegistered(uint256 indexed serviceId, string indexed vehicleId, address indexed serviceProvider, uint256 timestamp, uint256 cost)',
    'event ServiceVerified(uint256 indexed serviceId, address indexed verifier, uint256 timestamp)',
    'event ServiceUpdated(uint256 indexed serviceId, string description, uint256 newCost)',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('BesuService');
  }

  /**
   * Inicializa o serviço Besu (deve ser chamado após a construção)
   */
  async onModuleInit(): Promise<void> {
    this.initializeBesu().catch((error) => {
      this.logger.error(
        'Erro na inicialização do Besu (não bloqueante)',
        error.stack,
        'BesuService',
        {
          errorMessage: error.message,
          note: 'Backend continuará funcionando, mas operações blockchain podem falhar',
        },
      );
    });
  }

  /**
   * Inicializa a conexão com a rede Besu
   */
  private async initializeBesu(): Promise<void> {
    const startTime = Date.now();

    try {
      const rpcUrl = this.configService.get<string>(
        'BESU_RPC_URL',
        'http://localhost:8545',
      );
      const privateKey = this.configService.get<string>('BESU_PRIVATE_KEY');
      const contractAddress = this.configService.get<string>(
        'BESU_CONTRACT_ADDRESS',
      );

      this.logger.log('Iniciando conexão com rede Besu', 'BesuService', {
        rpcUrl,
        hasPrivateKey: !!privateKey,
        hasContractAddress: !!contractAddress,
      });

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      try {
        const detectedNetwork = await Promise.race([
          this.provider.getNetwork(),
          new Promise<any>((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout detectando chainId (10s)')),
              10000,
            ),
          ),
        ]);

        const realChainId = Number(detectedNetwork.chainId);
        this.logger.log('ChainId detectado da rede Besu', 'BesuService', {
          chainId: realChainId,
          networkName: detectedNetwork.name,
        });

        const network = ethers.Network.from({
          chainId: realChainId,
          name: 'besu-private',
        });

        this.provider = new ethers.JsonRpcProvider(rpcUrl, network, {
          staticNetwork: network,
        });

        // Verificar conexão
        const blockNumber = await Promise.race([
          this.provider.getBlockNumber(),
          new Promise<any>((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout conectando ao Besu (10s)')),
              10000,
            ),
          ),
        ]);

        this.logger.log('Conectado à rede Besu', 'BesuService', {
          chainId: realChainId.toString(),
          blockNumber,
          rpcUrl,
        });
      } catch (networkError) {
        // Se falhar, tentar sem staticNetwork (fallback)
        this.logger.warn(
          'Falha ao detectar chainId, usando provider sem staticNetwork...',
          'BesuService',
          {
            error: networkError.message,
          },
        );
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        const blockNumber = await this.provider.getBlockNumber();
        const network = await this.provider.getNetwork();
        this.logger.log('Conectado à rede Besu (fallback)', 'BesuService', {
          chainId: network.chainId.toString(),
          blockNumber,
          rpcUrl,
        });
      }

      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.logger.log('Wallet inicializada', 'BesuService', {
          address: this.wallet.address,
        });
      }

      if (contractAddress && this.wallet) {
        this.contract = new ethers.Contract(
          contractAddress,
          this.contractABI,
          this.wallet,
        );

        try {
          const totalServices = await this.contract.totalServices();
          const duration = Date.now() - startTime;

          this.logger.log(
            'Contrato VehicleServiceTracker ativo',
            'BesuService',
            {
              contractAddress,
              totalServices: totalServices.toString(),
              duration: `${duration}ms`,
            },
          );
        } catch (error) {
          this.logger.warn(
            'Contrato não encontrado ou não implantado',
            'BesuService',
            {
              contractAddress,
              errorMessage: error.message,
            },
          );
        }
      } else {
        this.logger.warn('Contrato não inicializado', 'BesuService', {
          hasContractAddress: !!contractAddress,
          hasWallet: !!this.wallet,
        });
      }

      const totalDuration = Date.now() - startTime;
      this.logger.log('Serviço Besu inicializado com sucesso', 'BesuService', {
        duration: `${totalDuration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.warn(
        'Erro ao inicializar serviço Besu (não bloqueante)',
        'BesuService',
        {
          errorMessage: error.message,
          duration: `${duration}ms`,
          note: 'Backend continuará funcionando. Operações blockchain podem falhar até o Besu estar disponível.',
        },
      );
      // Não lançar erro - permite que o backend inicie mesmo sem Besu
    }
  }

  /**
   * Registra um serviço de veículo na blockchain
   * @param serviceData Dados do serviço
   * @returns Resultado do registro
   */
  async registerService(serviceData: {
    vehicleId: string;
    mileage: number;
    cost: number;
    description: string;
    serviceType: string;
  }): Promise<{
    success: boolean;
    transactionHash?: string;
    serviceId?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      this.logger.log(
        'Iniciando registro de serviço na blockchain',
        'BesuService',
        {
          vehicleId: serviceData.vehicleId,
          serviceType: serviceData.serviceType,
          mileage: serviceData.mileage,
          cost: serviceData.cost,
        },
      );

      const tx = await this.contract.registerService(
        serviceData.vehicleId,
        serviceData.mileage,
        serviceData.cost,
        serviceData.description,
        serviceData.serviceType,
      );

      this.logger.debug('Transação enviada para a rede', 'BesuService', {
        txHash: tx.hash,
        vehicleId: serviceData.vehicleId,
      });

      const waitPromise = tx.wait();
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout aguardando mineração (20s)')),
          20000,
        ),
      );

      try {
        const receipt = await Promise.race([waitPromise, timeoutPromise]);
        const duration = Date.now() - startTime;

        const event = receipt.logs.find((log) => {
          try {
            const parsed = this.contract.interface.parseLog(log);
            return parsed?.name === 'ServiceRegistered';
          } catch {
            return false;
          }
        });

        let serviceId: number | undefined;
        if (event) {
          const parsed = this.contract.interface.parseLog(event);
          serviceId = Number(parsed?.args.serviceId);
        }

        // Log explícito de SUCESSO para CloudWatch - CRÍTICO para TCC
        this.logger.log(
          `✅ SUCESSO: Serviço registrado na blockchain com sucesso! Transação confirmada e minerada.`,
          'BesuService',
          {
            transactionHash: tx.hash,
            serviceId: serviceId?.toString() || 'N/A',
            vehicleId: serviceData.vehicleId,
            serviceType: serviceData.serviceType,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            duration: `${duration}ms`,
            status: 'CONFIRMED',
            timestamp: new Date().toISOString(),
          },
        );

        this.logger.logBlockchainTransaction(
          'registerService',
          tx.hash,
          'success',
          {
            vehicleId: serviceData.vehicleId,
            serviceId,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            duration: `${duration}ms`,
            serviceType: serviceData.serviceType,
          },
        );

        return {
          success: true,
          transactionHash: tx.hash,
          serviceId,
        };
      } catch (timeoutError) {
        const duration = Date.now() - startTime;

        this.logger.error(
          'Timeout ao aguardar confirmação da transação',
          timeoutError instanceof Error
            ? timeoutError.stack
            : String(timeoutError),
          'BesuService',
          {
            txHash: tx.hash,
            vehicleId: serviceData.vehicleId,
            duration: `${duration}ms`,
            timeout: '20s',
          },
        );

        this.logger.logBlockchainTransaction(
          'registerService',
          tx.hash,
          'timeout',
          {
            vehicleId: serviceData.vehicleId,
            duration: `${duration}ms`,
            error: 'Timeout aguardando mineração',
          },
        );

        // Monitor assíncrono para confirmação tardia
        tx.wait()
          .then((receipt) => {
            this.logger.logBlockchainTransaction(
              'registerService',
              tx.hash,
              'late_success',
              {
                vehicleId: serviceData.vehicleId,
                blockNumber: receipt.blockNumber,
                note: 'Confirmada após timeout',
              },
            );
          })
          .catch(() => {
            this.logger.logBlockchainTransaction(
              'registerService',
              tx.hash,
              'failed',
              {
                vehicleId: serviceData.vehicleId,
                error: 'Transação nunca foi confirmada',
              },
            );
          });

        return {
          success: false,
          error:
            'Timeout aguardando confirmação da transação (20s). A rede pode estar lenta ou não está minerando.',
          serviceId: undefined,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        'Erro ao registrar serviço na blockchain',
        error.stack,
        'BesuService',
        {
          vehicleId: serviceData.vehicleId,
          errorMessage: error.message,
          duration: `${duration}ms`,
        },
      );

      this.logger.logBlockchainTransaction('registerService', null, 'failed', {
        vehicleId: serviceData.vehicleId,
        error: error.message,
        duration: `${duration}ms`,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Registra um hash de evento veicular na blockchain (método legado)
   * @param hash Hash do evento
   * @param vehicleId ID do veículo
   * @param eventType Tipo do evento
   * @returns Resultado do registro
   */
  async registerHash(
    hash: string,
    vehicleId: string,
    eventType: string,
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      this.logger.log('Registrando hash na blockchain', 'BesuService', {
        hash: hash.substring(0, 16) + '...',
        vehicleId,
        eventType,
      });

      const tx = await this.contract.registerHash(hash);

      this.logger.debug('Transação de hash enviada', 'BesuService', {
        txHash: tx.hash,
        vehicleId,
      });

      const waitPromise = tx.wait();
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout aguardando mineração (20s)')),
          20000,
        ),
      );

      try {
        const receipt = await Promise.race([waitPromise, timeoutPromise]);
        const duration = Date.now() - startTime;

        // Verificar se a transação foi bem-sucedida (status === 1)
        if (receipt.status !== 1) {
          throw new Error(
            `Transação falhou na blockchain. Status: ${receipt.status}`,
          );
        }

        // Log explícito de SUCESSO para CloudWatch
        this.logger.log(
          `✅ SUCESSO: Hash registrado na blockchain com sucesso! Transação confirmada e minerada.`,
          'BesuService',
          {
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            vehicleId,
            eventType,
            hash: hash.substring(0, 16) + '...',
            duration: `${duration}ms`,
            status: 'CONFIRMED',
            receiptStatus: receipt.status,
          },
        );

        this.logger.logBlockchainTransaction(
          'registerHash',
          tx.hash,
          'success',
          {
            vehicleId,
            eventType,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            duration: `${duration}ms`,
          },
        );

        return {
          success: true,
          transactionHash: tx.hash,
        };
      } catch {
        const duration = Date.now() - startTime;

        this.logger.warn('Timeout ao aguardar confirmação', 'BesuService', {
          txHash: tx.hash,
          vehicleId,
          duration: `${duration}ms`,
        });

        this.logger.logBlockchainTransaction(
          'registerHash',
          tx.hash,
          'timeout',
          {
            vehicleId,
            eventType,
            duration: `${duration}ms`,
          },
        );

        // Monitor assíncrono
        tx.wait()
          .then((receipt) => {
            this.logger.logBlockchainTransaction(
              'registerHash',
              tx.hash,
              'late_success',
              {
                vehicleId,
                blockNumber: receipt.blockNumber,
              },
            );
          })
          .catch(() => {
            this.logger.logBlockchainTransaction(
              'registerHash',
              tx.hash,
              'failed',
              {
                vehicleId,
                error: 'Nunca confirmada',
              },
            );
          });

        return {
          success: false,
          error:
            'Timeout aguardando confirmação da transação (20s). A rede pode estar lenta ou não está minerando.',
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Erro ao registrar hash', error.stack, 'BesuService', {
        vehicleId,
        eventType,
        errorMessage: error.message,
        duration: `${duration}ms`,
      });

      this.logger.logBlockchainTransaction('registerHash', null, 'failed', {
        vehicleId,
        eventType,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifica se um serviço existe na blockchain
   * @param serviceId ID do serviço a ser verificado
   * @returns Informações do serviço
   */
  async verifyService(serviceId: number): Promise<{
    exists: boolean;
    info?: {
      serviceId: number;
      vehicleId: string;
      mileage: number;
      cost: number;
      description: string;
      serviceType: string;
      timestamp: number;
      serviceProvider: string;
      isVerified: boolean;
    };
  }> {
    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      this.logger.debug('Verificando serviço na blockchain', 'BesuService', {
        serviceId,
      });

      const result = await this.contract.getService(serviceId);

      if (result && result.serviceId > 0) {
        this.logger.debug('Serviço encontrado', 'BesuService', {
          serviceId,
          vehicleId: result.vehicleId,
          isVerified: result.isVerified,
        });

        return {
          exists: true,
          info: {
            serviceId: Number(result.serviceId),
            vehicleId: result.vehicleId,
            mileage: Number(result.mileage),
            cost: Number(result.cost),
            description: result.description,
            serviceType: result.serviceType,
            timestamp: Number(result.timestamp),
            serviceProvider: result.serviceProvider,
            isVerified: result.isVerified,
          },
        };
      }

      this.logger.debug('Serviço não encontrado', 'BesuService', { serviceId });
      return { exists: false };
    } catch (error) {
      this.logger.error(
        'Erro ao verificar serviço',
        error.stack,
        'BesuService',
        {
          serviceId,
          errorMessage: error.message,
        },
      );
      return { exists: false };
    }
  }

  /**
   * Verifica se um hash foi registrado na blockchain
   * @param hash Hash a ser verificado
   * @returns Informações do hash
   */
  async verifyHash(hash: string): Promise<{
    exists: boolean;
    info?: {
      owner: string;
      timestamp: number;
      vehicleId: string;
      eventType: string;
      verificationCount: number;
    };
  }> {
    try {
      const exists = await this.verifyHashInContract(hash);

      if (exists) {
        this.logger.log(
          `Hash ${hash.substring(0, 10)}... encontrado na blockchain`,
        );
        return {
          exists: true,
          info: {
            owner: '',
            timestamp: Date.now() / 1000,
            vehicleId: '',
            eventType: '',
            verificationCount: 0,
          },
        };
      } else {
        this.logger.log(
          `Hash ${hash.substring(0, 10)}... não encontrado na blockchain`,
        );
        return { exists: false };
      }
    } catch (error) {
      this.logger.error('Erro ao verificar hash:', error.message);
      return { exists: false };
    }
  }

  /**
   * Incrementa contador de verificações de um hash
   * @param hash Hash a ser verificado
   * @returns Resultado da verificação
   */
  async verifyAndCount(
    hash: string,
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(hash));
      const tx = await this.contract.verifyAndCount(hashBytes32);

      await tx.wait();

      this.logger.log(`Verificação contabilizada: ${tx.hash}`);

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar e contar:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtém todos os hashes de um veículo
   * @param vehicleId ID do veículo
   * @returns Array de hashes
   */
  async getVehicleHashes(vehicleId: string): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      const hashes = await this.contract.getVehicleHashes(vehicleId);
      return hashes;
    } catch (error) {
      this.logger.error('Erro ao obter hashes do veículo:', error.message);
      return [];
    }
  }

  /**
   * Obtém todos os hashes de um proprietário
   * @param ownerAddress Endereço do proprietário
   * @returns Array de hashes
   */
  async getOwnerHashes(ownerAddress: string): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      const hashes = await this.contract.getOwnerHashes(ownerAddress);
      return hashes;
    } catch (error) {
      this.logger.error('Erro ao obter hashes do proprietário:', error.message);
      return [];
    }
  }

  /**
   * Obtém estatísticas do contrato
   * @returns Estatísticas do contrato
   */
  async getContractStats(): Promise<{
    totalHashes: number;
    contractBalance: string;
  }> {
    try {
      if (!this.contract) {
        this.logger.warn('Contrato não inicializado, tentando inicializar...');
        await this.initializeBesu();

        if (!this.contract) {
          throw new Error('Contrato não pôde ser inicializado');
        }
      }

      const [, , balance] = await this.contract.getStats();
      const totalHashes = await this.contract.getRegisteredHashesCount();

      this.logger.log(`Total de hashes no contrato: ${Number(totalHashes)}`);

      return {
        totalHashes: Number(totalHashes),
        contractBalance: ethers.formatEther(balance),
      };
    } catch (error) {
      this.logger.error(
        'Erro ao obter estatísticas do contrato:',
        error.message,
      );
      return {
        totalHashes: 0,
        contractBalance: '0',
      };
    }
  }

  /**
   * Obtém informações da rede Besu
   * @returns Informações da rede
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
    networkName: string;
  }> {
    try {
      if (!this.provider) {
        this.logger.warn('Provider não inicializado, tentando inicializar...');
        await this.initializeBesu();

        if (!this.provider) {
          throw new Error('Provider não pôde ser inicializado');
        }
      }

      const [network, blockNumber, feeData] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
      ]);

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei'),
        networkName: network.name,
      };
    } catch (error) {
      this.logger.error('Erro ao obter informações da rede:', error.message);
      throw error;
    }
  }

  /**
   * Verifica se o serviço está conectado à rede
   * @returns Status da conexão
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.provider) {
        this.logger.warn('Provider não inicializado, tentando inicializar...');
        await this.initializeBesu();

        if (!this.provider) {
          return false;
        }
      }

      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Diagnóstico completo da rede Besu
   */
  async diagnoseNetwork(): Promise<{
    connected: boolean;
    blockNumber?: number;
    chainId?: string;
    mining?: boolean;
    peerCount?: number;
    pendingTransactions?: number;
    gasPrice?: string;
    lastBlockTime?: number;
    contractAddress?: string;
    contractDeployed?: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const result: any = { connected: false, issues };

    try {
      // 1. Verificar conexão
      result.connected = await this.isConnected();
      if (!result.connected) {
        issues.push('Não foi possível conectar à rede Besu');
        return result;
      }

      await this.checkBlockNumber(result, issues);

      await this.checkChainId(result, issues);

      await this.checkGasPrice(result, issues);

      await this.checkContract(result, issues);

      await this.checkBlockTime(result, issues);

      await this.checkMiningActivity(result, issues);

      if (result.contractDeployed) {
        await this.testContractFunctionality(result, issues);
      }

      this.logDiagnosisResults(issues);

      return result;
    } catch (error) {
      issues.push(`Erro geral no diagnóstico: ${error.message}`);
      return result;
    }
  }

  private async checkBlockNumber(result: any, issues: string[]): Promise<void> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      result.blockNumber = blockNumber;
      this.logger.log(`Bloco atual: ${blockNumber}`);

      if (blockNumber === 0) {
        issues.push('Blockchain no bloco 0');
      }
    } catch (error) {
      issues.push(`Erro ao obter número do bloco: ${error.message}`);
    }
  }

  private async checkChainId(result: any, issues: string[]): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      result.chainId = network.chainId.toString();
      this.logger.log(`Chain ID: ${result.chainId}`);
    } catch (error) {
      issues.push(`Erro ao obter Chain ID: ${error.message}`);
    }
  }

  private async checkGasPrice(result: any, issues: string[]): Promise<void> {
    try {
      const feeData = await this.provider.getFeeData();
      result.gasPrice = ethers.formatUnits(feeData.gasPrice || 0, 'gwei');
      this.logger.log(`Gas Price: ${result.gasPrice} Gwei`);
    } catch {
      issues.push(`Erro ao obter Gas Price`);
    }
  }

  private async checkContract(result: any, issues: string[]): Promise<void> {
    if (!this.contract) {
      issues.push('Contrato não inicializado');
      return;
    }

    try {
      result.contractAddress = await this.contract.getAddress();
      const code = await this.provider.getCode(result.contractAddress);
      result.contractDeployed = code !== '0x';

      if (result.contractDeployed) {
        this.logger.log(`Contrato implantado em: ${result.contractAddress}`);
      } else {
        issues.push(`Contrato não implantado`);
      }
    } catch (error) {
      issues.push(`Erro ao verificar contrato: ${error.message}`);
    }
  }

  private async checkBlockTime(result: any, issues: string[]): Promise<void> {
    try {
      const latestBlock = await this.provider.getBlock('latest');
      const previousBlock = await this.provider.getBlock(
        latestBlock.number - 1,
      );

      if (latestBlock && previousBlock) {
        result.lastBlockTime = latestBlock.timestamp - previousBlock.timestamp;
        this.logger.log(`Tempo entre blocos: ${result.lastBlockTime}s`);

        if (result.lastBlockTime > 30) {
          issues.push(`Rede lenta - ${result.lastBlockTime}s entre blocos`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Não foi possível calcular tempo entre blocos: ${error.message}`,
      );
    }
  }

  private async checkMiningActivity(
    result: any,
    issues: string[],
  ): Promise<void> {
    try {
      const initialBlockNumber = await this.provider.getBlockNumber();
      result.blockNumber = initialBlockNumber;

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const finalBlockNumber = await this.provider.getBlockNumber();
      const blocksMined = finalBlockNumber - initialBlockNumber;

      result.mining = blocksMined > 0;
      result.blocksMinedDuringCheck = blocksMined;

      if (blocksMined === 0) {
        try {
          const latestBlock = await this.provider.getBlock('latest');
          const now = Math.floor(Date.now() / 1000);
          const timeSinceLastBlock = now - latestBlock.timestamp;

          result.lastBlockTimestamp = latestBlock.timestamp;
          result.timeSinceLastBlock = timeSinceLastBlock;

          if (timeSinceLastBlock > 60) {
            const minutes = Math.floor(timeSinceLastBlock / 60);
            const seconds = timeSinceLastBlock % 60;
            if (minutes > 0) {
              issues.push(
                `Blockchain parada - último bloco minerado há ${minutes}m ${seconds}s`,
              );
            } else {
              issues.push(
                `Blockchain parada - último bloco minerado há ${timeSinceLastBlock}s`,
              );
            }
          } else {
            issues.push('Blockchain parada - não está minerando blocos');
          }
        } catch {
          issues.push('Blockchain parada - não está minerando blocos');
        }
      } else {
        this.logger.log(
          `Blockchain está minerando: ${blocksMined} bloco(s) em 5s`,
          'BesuService',
        );
      }
    } catch (error) {
      issues.push(`Erro ao verificar atividade de mineração: ${error.message}`);
    }
  }

  private async testContractFunctionality(
    result: any,
    issues: string[],
  ): Promise<void> {
    if (!this.contract) {
      return;
    }

    try {
      const totalServices = await this.contract.totalServices();
      result.contractTestPassed = true;
      this.logger.log(
        `Teste de contrato passou: totalServices = ${totalServices.toString()}`,
        'BesuService',
      );
    } catch (error) {
      issues.push(`Contrato não funcional: ${error.message}`);
      result.contractTestPassed = false;
      result.contractError = error.message;
    }
  }

  private logDiagnosisResults(issues: string[]): void {
    if (issues.length === 0) {
      this.logger.log('Rede Besu está saudável', 'BesuService', {
        status: 'healthy',
      });
    } else {
      this.logger.warn('Problemas encontrados na rede Besu', 'BesuService', {
        issuesCount: issues.length,
        issues: issues,
      });
    }
  }

  /**
   * Verifica se um hash existe no contrato
   * @param hash Hash a ser verificado
   * @returns True se o hash existe no contrato
   */
  async verifyHashInContract(hash: string): Promise<boolean> {
    try {
      if (!this.contract) {
        this.logger.warn('Contrato não inicializado, tentando inicializar...');
        await this.initializeBesu();

        if (!this.contract) {
          throw new Error('Contrato não pôde ser inicializado');
        }
      }

      const exists = await this.contract.hashExists(hash);

      this.logger.log(
        `Hash ${hash.substring(0, 10)}... existe no contrato: ${exists}`,
      );

      return exists;
    } catch (error) {
      this.logger.error('Erro ao verificar hash no contrato:', error.message);
      return false;
    }
  }

  /**
   * Verifica se uma transação foi confirmada na blockchain
   * @param txHash Hash da transação
   * @returns True se a transação foi confirmada e bem-sucedida
   */
  async isTransactionConfirmed(txHash: string): Promise<boolean> {
    try {
      if (!this.provider) {
        await this.initializeBesu();
      }

      if (!this.provider) {
        this.logger.warn(
          `Provider não disponível para verificar transação ${txHash.substring(0, 10)}...`,
        );
        return false;
      }

      // Tentar obter o receipt da transação
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (receipt) {
        // Receipt encontrado - verificar status
        const isSuccess = receipt.status === 1;
        this.logger.log(
          `Transação ${txHash.substring(0, 10)}... encontrada: status=${receipt.status}, block=${receipt.blockNumber}`,
        );
        return isSuccess;
      }

      // Se não encontrou receipt, tentar verificar se a transação existe
      const tx = await this.provider.getTransaction(txHash);
      if (tx) {
        this.logger.log(
          `Transação ${txHash.substring(0, 10)}... existe mas ainda não foi minerada`,
        );
        return false; // Transação existe mas não foi confirmada ainda
      }

      return false;
    } catch (error) {
      // Se der erro "not found", a transação não existe
      if (
        error.message?.includes('not found') ||
        error.message?.includes('does not exist')
      ) {
        this.logger.warn(
          `Transação ${txHash.substring(0, 10)}... não encontrada na blockchain`,
        );
      } else {
        this.logger.error(
          `Erro ao verificar transação ${txHash.substring(0, 10)}...: ${error.message}`,
        );
      }
      return false;
    }
  }

  /**
   * Obtém saldo de uma conta
   * @param address Endereço da conta
   * @returns Saldo em ETH
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error('Erro ao obter saldo:', error.message);
      return '0';
    }
  }
}
