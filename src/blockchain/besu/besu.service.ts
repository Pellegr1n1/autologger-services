import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

/**
 * Serviço para interação com a rede privada Besu
 * AutoLogger - Rede Privada Besu com IBFT 2.0
 */
@Injectable()
export class BesuService {
  private readonly logger = new Logger(BesuService.name);
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
    
    // Eventos
    'event ServiceRegistered(uint256 indexed serviceId, string indexed vehicleId, address indexed serviceProvider, uint256 timestamp, uint256 cost)',
    'event ServiceVerified(uint256 indexed serviceId, address indexed verifier, uint256 timestamp)',
    'event ServiceUpdated(uint256 indexed serviceId, string description, uint256 newCost)'
  ];

  constructor(private configService: ConfigService) {
    this.initializeBesu().catch(error => {
      this.logger.error('❌ Erro na inicialização do Besu:', error);
    });
  }

  /**
   * Inicializa a conexão com a rede Besu
   */
  private async initializeBesu(): Promise<void> {
    try {
      const rpcUrl = this.configService.get<string>('BESU_RPC_URL', 'http://localhost:8545');
      const privateKey = this.configService.get<string>('BESU_PRIVATE_KEY');
      const contractAddress = this.configService.get<string>('BESU_CONTRACT_ADDRESS');

      this.logger.log(`🔗 Conectando à rede Besu: ${rpcUrl}`);

      // Inicializar provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Verificar se a rede está acessível
      const network = await this.provider.getNetwork();
      this.logger.log(`📡 Rede conectada: Chain ID ${network.chainId}`);

      // Inicializar wallet se chave privada for fornecida
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.logger.log(`🔑 Wallet inicializada: ${this.wallet.address}`);
      }

      // Inicializar contrato se endereço for fornecido
      if (contractAddress && this.wallet) {
        this.contract = new ethers.Contract(contractAddress, this.contractABI, this.wallet);
        this.logger.log(`📄 Contrato inicializado: ${contractAddress}`);
        
        // Verificar se o contrato está implantado
        try {
          const totalServices = await this.contract.totalServices();
          this.logger.log(`✅ Contrato VehicleServiceTracker ativo - Total de serviços: ${totalServices}`);
        } catch (error) {
          this.logger.warn(`⚠️ Contrato não encontrado ou não implantado: ${contractAddress}`);
          this.logger.warn(`⚠️ Erro: ${error.message}`);
        }
      } else {
        this.logger.warn('⚠️ Contrato não inicializado - endereço ou wallet não fornecidos');
      }

      this.logger.log('✅ Serviço Besu inicializado com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar serviço Besu:', error.message);
      throw error;
    }
  }

  /**
   * Registra um hash de evento veicular na blockchain
   * @param hash Hash do evento
   * @param vehicleId ID do veículo
   * @param eventType Tipo do evento
   * @returns Resultado do registro
   */
  async registerHash(
    hash: string,
    vehicleId: string,
    eventType: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      this.logger.log(`📝 Registrando hash: ${hash} para veículo: ${vehicleId}`);

      // Converter hash string para bytes32
      const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(hash));

      // Registrar o hash no contrato
      const tx = await this.contract.registerHash(hash);
      
      this.logger.log(`⏳ Transação enviada: ${tx.hash}`);
      
      // Aguardar confirmação
      const receipt = await tx.wait();
      
      this.logger.log(`✅ Hash registrado com sucesso no bloco: ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      this.logger.error('❌ Erro ao registrar hash:', error.message);
      return {
        success: false,
        error: error.message
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

      const result = await this.contract.getService(serviceId);

      if (result && result.serviceId > 0) {
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
            isVerified: result.isVerified
          }
        };
      }

      return { exists: false };
    } catch (error) {
      this.logger.error('❌ Erro ao verificar serviço:', error.message);
      return { exists: false };
    }
  }

  /**
   * Verifica se um hash foi registrado na blockchain (compatibilidade)
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
    // Para compatibilidade, sempre retorna false pois o contrato não tem verifyHash
    // Em um cenário real, você implementaria a lógica de verificação de hash
    this.logger.warn('⚠️ verifyHash não implementado no contrato VehicleServiceTracker');
    return { exists: false };
  }

  /**
   * Incrementa contador de verificações de um hash
   * @param hash Hash a ser verificado
   * @returns Resultado da verificação
   */
  async verifyAndCount(hash: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract) {
        throw new Error('Contrato não inicializado');
      }

      const hashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(hash));
      const tx = await this.contract.verifyAndCount(hashBytes32);
      
      await tx.wait();
      
      this.logger.log(`✅ Verificação contabilizada: ${tx.hash}`);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      this.logger.error('❌ Erro ao verificar e contar:', error.message);
      return {
        success: false,
        error: error.message
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
      this.logger.error('❌ Erro ao obter hashes do veículo:', error.message);
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
      this.logger.error('❌ Erro ao obter hashes do proprietário:', error.message);
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
        this.logger.warn('⚠️ Contrato não inicializado, tentando inicializar...');
        await this.initializeBesu();
        
        if (!this.contract) {
          throw new Error('Contrato não pôde ser inicializado');
        }
      }

      const [total, verified, balance] = await this.contract.getStats();
      const totalHashes = await this.contract.getRegisteredHashesCount();
      
      this.logger.log(`📊 Total de hashes no contrato: ${Number(totalHashes)}`);
      
      return {
        totalHashes: Number(totalHashes),
        contractBalance: ethers.formatEther(balance)
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter estatísticas do contrato:', error.message);
      return {
        totalHashes: 0,
        contractBalance: '0'
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
        this.logger.warn('⚠️ Provider não inicializado, tentando inicializar...');
        await this.initializeBesu();
        
        if (!this.provider) {
          throw new Error('Provider não pôde ser inicializado');
        }
      }

      const [network, blockNumber, feeData] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getFeeData()
      ]);

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei'),
        networkName: network.name
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter informações da rede:', error.message);
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
        this.logger.warn('⚠️ Provider não inicializado, tentando inicializar...');
        await this.initializeBesu();
        
        if (!this.provider) {
          return false;
        }
      }

      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      return false;
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
        this.logger.warn('⚠️ Contrato não inicializado, tentando inicializar...');
        await this.initializeBesu();
        
        if (!this.contract) {
          throw new Error('Contrato não pôde ser inicializado');
        }
      }

      // Verificar se o hash existe no contrato
      const exists = await this.contract.hashExists(hash);
      this.logger.log(`🔍 Hash ${hash} existe no contrato: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error('❌ Erro ao verificar hash no contrato:', error.message);
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
      this.logger.error('❌ Erro ao obter saldo:', error.message);
      return '0';
    }
  }
}
