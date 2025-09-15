
const PrivateKeyProvider = require("@truffle/hdwallet-provider");

// AutoLogger Service Accounts
const mainAccount = "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3";
const serviceProviderAccount = "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f";
const vehicleOwnerAccount = "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63";

const mainProvider = new PrivateKeyProvider(mainAccount, "http://127.0.0.1:8545");
const serviceProvider = new PrivateKeyProvider(serviceProviderAccount, "http://127.0.0.1:8545");
const vehicleOwner = new PrivateKeyProvider(vehicleOwnerAccount, "http://127.0.0.1:8545");

module.exports = {
  networks: {
    development: {
      provider: mainProvider,
      host: "127.0.0.1",
      port: 8545,
      network_id: "2024",  // AutoLogger Chain ID
      gas: 8000000,
      gasPrice: 0,
      from: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57" // Main account address
    },
    besu: {
      provider: mainProvider,
      host: "127.0.0.1",
      port: 8545,
      network_id: "2024",
      gas: 8000000,
      gasPrice: 0,
      from: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
    },
    // Test networks for different accounts
    serviceProvider: {
      provider: serviceProvider,
      host: "127.0.0.1",
      port: 8545,
      network_id: "2024",
      gas: 8000000,
      gasPrice: 0,
      from: "0xf17f52151EbEF6C7334FAD080c5704D77216b732"
    },
    vehicleOwner: {
      provider: vehicleOwner,
      host: "127.0.0.1",
      port: 8545,
      network_id: "2024",
      gas: 8000000,
      gasPrice: 0,
      from: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73"
    }
  },

  mocha: {
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },

  // Plugin for contract verification
  plugins: [
    'truffle-plugin-verify'
  ]
};