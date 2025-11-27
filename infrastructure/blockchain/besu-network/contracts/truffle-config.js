const HDWalletProvider = require('@truffle/hdwallet-provider');

const privateKey = 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
const accountAddress = '0x627306090abaB3A6e1400e9345bC60c78a8BEf57';

module.exports = {
  networks: {
    development: {
      provider: () => new HDWalletProvider({
        privateKeys: [privateKey],
        providerOrUrl: 'http://127.0.0.1:8545',
      }),
      network_id: "2024",
      gas: 6721975,
      gasPrice: 0,
      from: accountAddress,
      networkCheckTimeout: 60000,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    production: {
      provider: () => new HDWalletProvider({
        privateKeys: [privateKey],
        providerOrUrl: 'http://besu.autologger-dev.local:8545',
      }),
      network_id: "2024",
      gas: 6721975,
      gasPrice: 0,
      from: accountAddress,
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