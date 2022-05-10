const HDWalletProvider = require('@truffle/hdwallet-provider');

require('babel-register');
require('babel-polyfill');
require('dotenv').config();
const privateKeys = process.env.PRIVATE_KEYS || ""

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",
     port: 7545,       
     network_id: "*", //Match any network ID
   },
   kovan: {
     provider: function(){
        return new HDWalletProvider(
          privateKeys.split(","), //Private keys
          `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`//URL to an Ethereum node
        )
     },
     gas: 5000000,
     gasPrice: 20000000000,
     network_id: 42
   }
 },
 contracts_directory: './src/contracts/',
 contracts_build_directory: './src/abis/',
 compilers: {
  solc: {
   optimizer: {
     enabled: true,
     runs: 200
   },
  }
 }
}