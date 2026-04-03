import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    arc: {
      type: "http",
      url: "https://arc-testnet.drpc.org",
      chainId: 2878,
      accounts: ["3a017f96062571d0a04edbe33e4495d3df61de972e5b926372c7bdfa4d9a779d"],
    },
  },
};

export default config;