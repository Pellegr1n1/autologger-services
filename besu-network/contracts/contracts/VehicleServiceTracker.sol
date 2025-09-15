// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VehicleServiceTracker
 * @dev Contrato para rastrear serviços de veículos na rede Besu
 * @author AutoLogger Team
 * @notice Este contrato permite registrar e consultar serviços de manutenção veicular
 */
contract VehicleServiceTracker {
    
    // Estrutura para armazenar informações do serviço
    struct ServiceRecord {
        uint256 serviceId;
        string vehicleId;
        uint256 mileage;
        uint256 cost;
        string description;
        string serviceType;
        uint256 timestamp;
        address serviceProvider;
        bool isVerified;
    }
    
    // Eventos emitidos pelo contrato
    event ServiceRegistered(
        uint256 indexed serviceId,
        string indexed vehicleId,
        address indexed serviceProvider,
        uint256 timestamp,
        uint256 cost
    );
    
    event ServiceVerified(
        uint256 indexed serviceId,
        address indexed verifier,
        uint256 timestamp
    );
    
    event ServiceUpdated(
        uint256 indexed serviceId,
        string description,
        uint256 newCost
    );
    
    // Mapeamentos
    mapping(uint256 => ServiceRecord) public services;
    mapping(string => uint256[]) public vehicleServices;
    mapping(address => uint256[]) public providerServices;
    mapping(string => bool) public registeredHashes;
    
    // Contadores
    uint256 public totalServices;
    uint256 public nextServiceId;
    uint256 public totalHashes;
    
    // Endereço do administrador
    address public admin;
    
    // Modificadores
    modifier onlyAdmin() {
        require(msg.sender == admin, "Apenas o administrador pode executar esta funcao");
        _;
    }
    
    modifier serviceExists(uint256 _serviceId) {
        require(services[_serviceId].serviceId != 0, "Servico nao encontrado");
        _;
    }
    
    modifier notVerified(uint256 _serviceId) {
        require(!services[_serviceId].isVerified, "Servico ja foi verificado");
        _;
    }
    
    // Construtor
    constructor() {
        admin = msg.sender;
        totalServices = 0;
        nextServiceId = 1;
        totalHashes = 0;
    }
    
    /**
     * @dev Registra um novo serviço de veículo
     * @param _vehicleId ID do veículo
     * @param _mileage Quilometragem do veículo
     * @param _cost Custo do serviço
     * @param _description Descrição do serviço
     * @param _serviceType Tipo do serviço (MANUTENCAO, REPARO, etc.)
     * @return serviceId ID do serviço registrado
     */
    function registerService(
        string memory _vehicleId,
        uint256 _mileage,
        uint256 _cost,
        string memory _description,
        string memory _serviceType
    ) external returns (uint256 serviceId) {
        
        serviceId = nextServiceId;
        
        services[serviceId] = ServiceRecord({
            serviceId: serviceId,
            vehicleId: _vehicleId,
            mileage: _mileage,
            cost: _cost,
            description: _description,
            serviceType: _serviceType,
            timestamp: block.timestamp,
            serviceProvider: msg.sender,
            isVerified: false
        });
        
        // Adicionar às listas de rastreamento
        vehicleServices[_vehicleId].push(serviceId);
        providerServices[msg.sender].push(serviceId);
        
        // Incrementar contadores
        totalServices++;
        nextServiceId++;
        
        // Emitir evento
        emit ServiceRegistered(
            serviceId,
            _vehicleId,
            msg.sender,
            block.timestamp,
            _cost
        );
        
        return serviceId;
    }
    
    /**
     * @dev Verifica um serviço
     * @param _serviceId ID do serviço
     */
    function verifyService(uint256 _serviceId) 
        external 
        serviceExists(_serviceId)
        notVerified(_serviceId)
    {
        services[_serviceId].isVerified = true;
        
        emit ServiceVerified(
            _serviceId,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Atualiza informações de um serviço
     * @param _serviceId ID do serviço
     * @param _newDescription Nova descrição
     * @param _newCost Novo custo
     */
    function updateService(
        uint256 _serviceId,
        string memory _newDescription,
        uint256 _newCost
    ) external serviceExists(_serviceId) {
        require(
            msg.sender == services[_serviceId].serviceProvider || msg.sender == admin,
            "Apenas o provedor do servico ou admin pode atualizar"
        );
        
        services[_serviceId].description = _newDescription;
        services[_serviceId].cost = _newCost;
        
        emit ServiceUpdated(
            _serviceId,
            _newDescription,
            _newCost
        );
    }
    
    /**
     * @dev Obtém informações de um serviço
     * @param _serviceId ID do serviço
     * @return record Informações do serviço
     */
    function getService(uint256 _serviceId) 
        external 
        view 
        serviceExists(_serviceId)
        returns (ServiceRecord memory record) 
    {
        return services[_serviceId];
    }
    
    /**
     * @dev Obtém todos os serviços de um veículo
     * @param _vehicleId ID do veículo
     * @return serviceIds Array de IDs dos serviços
     */
    function getVehicleServices(string memory _vehicleId) 
        external 
        view 
        returns (uint256[] memory serviceIds) 
    {
        return vehicleServices[_vehicleId];
    }
    
    /**
     * @dev Obtém todos os serviços de um provedor
     * @param _provider Endereço do provedor
     * @return serviceIds Array de IDs dos serviços
     */
    function getProviderServices(address _provider) 
        external 
        view 
        returns (uint256[] memory serviceIds) 
    {
        return providerServices[_provider];
    }
    
    /**
     * @dev Obtém estatísticas do contrato
     * @return total Total de serviços
     * @return verified Total de serviços verificados
     * @return balance Saldo do contrato
     */
    function getStats() 
        external 
        view 
        returns (uint256 total, uint256 verified, uint256 balance) 
    {
        uint256 verifiedCount = 0;
        for (uint256 i = 1; i < nextServiceId; i++) {
            if (services[i].isVerified) {
                verifiedCount++;
            }
        }
        
        return (totalServices, verifiedCount, address(this).balance);
    }
    
    /**
     * @dev Registra um hash no contrato
     * @param _hash Hash a ser registrado
     */
    function registerHash(string memory _hash) external {
        require(!registeredHashes[_hash], "Hash ja registrado");
        registeredHashes[_hash] = true;
        totalHashes++;
    }
    
    /**
     * @dev Conta o número de hashes registrados
     * @return Número de hashes registrados
     */
    function getRegisteredHashesCount() external view returns (uint256) {
        return totalHashes;
    }
    
    /**
     * @dev Verifica se um hash existe no contrato
     * @param _hash Hash a ser verificado
     * @return True se o hash existe
     */
    function hashExists(string memory _hash) external view returns (bool) {
        return registeredHashes[_hash];
    }
    
    /**
     * @dev Transfere administração do contrato
     * @param _newAdmin Novo endereço do administrador
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Endereco do novo admin invalido");
        admin = _newAdmin;
    }
    
    /**
     * @dev Permite receber ETH
     */
    receive() external payable {
        // Contrato pode receber ETH
    }
    
    /**
     * @dev Permite ao admin sacar ETH
     * @param _amount Quantidade a ser sacada
     */
    function withdraw(uint256 _amount) external onlyAdmin {
        require(address(this).balance >= _amount, "Saldo insuficiente");
        payable(admin).transfer(_amount);
    }
}
