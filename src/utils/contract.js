// utils/contract.js
import { ethers } from "ethers";
import contractArtifact from '../../artifacts/contracts/EncryptedLottery.sol/EncryptedLottery.json'

/**
 * ✅ Official deployed contract address
 *    Make sure this matches your latest `npx hardhat run scripts/deploy.js --network sepolia` output.
 */
const DEPLOYED_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // 🔴 REPLACE AFTER DEPLOYMENT

/**
 * Returns the contract address from the environment or hardcoded constant.
 */
export const getContractAddress = () => {
  return (
    import.meta.env.VITE_CONTRACT_ADDRESS ||
    DEPLOYED_CONTRACT_ADDRESS ||
    null
  );
};

/**
 * ✅ Returns a connected Ethers Contract instance
 * using the **up-to-date ABI** from Hardhat artifacts.
 */
export const getContract = (signerOrProvider) => {
  const address = getContractAddress();
  if (!address) {
    console.error("❌ No contract address found.");
    return null;
  }
  
  if (!signerOrProvider) {
    console.warn("⚠️ No signer or provider passed to getContract()");
    return null;
  }
  
  // 🔥 Use the ABI directly from Hardhat's compiled artifact
  return new ethers.Contract(address, contractArtifact.abi, signerOrProvider);
};

/**
 * Optional async helper if you ever need to load from a JSON config.
 */
export const getContractAddressAsync = async () => {
  try {
    const config = await import("./contractConfig.json");
    return config.default?.contractAddress || config.contractAddress;
  } catch (err) {
    console.warn("Failed to load contractConfig.json:", err.message);
    return getContractAddress();
  }
};