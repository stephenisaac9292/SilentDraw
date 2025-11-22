const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🚀 Deploying EncryptedLottery contract to Sepolia...");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH! Get Sepolia ETH from faucet: https://sepoliafaucet.com");
  }
  
  console.log("\n📝 Deploying contract...");
  
  // Get contract factory
  const EncryptedLottery = await hre.ethers.getContractFactory("EncryptedLottery");
  
  // Deploy contract
  const encryptedLottery = await EncryptedLottery.deploy();
  
  console.log("⏳ Waiting for deployment transaction...");
  await encryptedLottery.waitForDeployment();
  
  const address = await encryptedLottery.getAddress();
  
  console.log("\n✅ EncryptedLottery deployed successfully!");
  console.log("📍 Contract address:", address);
  console.log("🔗 View on Etherscan:", `https://sepolia.etherscan.io/address/${address}`);
  
  // Save contract address to config file
  const config = {
    contractAddress: address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address
  };
  
  // Ensure src/utils directory exists
  const utilsDir = path.join(__dirname, '..', 'src', 'utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  
  const configPath = path.join(utilsDir, 'contractConfig.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log("💾 Contract config saved to:", configPath);
  
  console.log("\n📋 Next steps:");
  console.log("1. Update your .env file:");
  console.log(`   VITE_CONTRACT_ADDRESS=${address}`);
  console.log("\n2. Update src/utils/contract.js:");
  console.log(`   const DEPLOYED_CONTRACT_ADDRESS = "${address}";`);
  console.log("\n3. Wait ~30 seconds for Etherscan indexing");
  console.log("\n4. Verify contract (optional):");
  console.log("   npx hardhat verify --network sepolia", address);
  console.log("\n5. Start your app: npm run dev");
  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });