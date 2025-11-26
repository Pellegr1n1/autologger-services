module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "2024", // Chain ID do seu genesis
      gas: 6721975,
      gasPrice: 0,
      from: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57", // Conta com balance no genesis
      networkCheckTimeout: 60000,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    // Para produção (quando usar Service Discovery)
    production: {
      host: "besu.autologger-dev.local",
      port: 8545,
      network_id: "2024",
      gas: 6721975,
      gasPrice: 0,
      from: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
      networkCheckTimeout: 120000,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "berlin"
      }
    }
  },

  mocha: {
    timeout: 100000
  },

  plugins: []
};