// utils/fhevm.js

/**
 * FHEVM v0.9 Initialization with @zama-fhe/relayer-sdk v0.3.0-5 (CDN)
 * 
 * Using CDN bundle approach for web apps per Discord mod recommendation
 * CDN URL: https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs
 * 
 * CRITICAL WORKFLOW:
 * 1. SDK loaded via <script> tag in index.html (creates window.relayerSDK global)
 * 2. Call window.relayerSDK.initSDK() to load WASM
 * 3. Call window.relayerSDK.createInstance() with v0.9 Sepolia config
 */

let fhevmInstance = null;
let isInitialized = false;

/**
 * FHEVM v0.9 Sepolia Configuration (VERIFIED CORRECT)
 * Source: https://docs.zama.ai/protocol/solidity-guides/smart-contract/configure/contract_addresses
 * Confirmed by Zama Discord mod 2025
 */
const SEPOLIA_V09_CONFIG = {
  // ACL_CONTRACT_ADDRESS (FHEVM Host chain - Sepolia)
  aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
  
  // KMS_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain - Sepolia)
  kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
  
  // INPUT_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain - Sepolia)
  inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
  
  // DECRYPTION_ADDRESS (Gateway chain)
  verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
  
  // INPUT_VERIFICATION_ADDRESS (Gateway chain)
  verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
  
  // FHEVM Host chain id (Sepolia)
  chainId: 11155111,
  
  // Gateway chain id (v0.9) - CORRECT value is 10901, not 55815 from old docs
  gatewayChainId: 10901,
  
  // Relayer URL (v0.9) - CORRECT domain is .org, not .cloud from old docs
  relayerUrl: 'https://relayer.testnet.zama.org',
};

/**
 * Wait for SDK to load from CDN (with timeout)
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds (default: 10000)
 * @returns {Promise<void>}
 */
async function waitForSDKLoaded(maxWaitMs = 10000) {
  if (typeof window === 'undefined') {
    throw new Error('Must run in browser environment');
  }
  
  // If already loaded, return immediately
  if (window.relayerSDK && window.relayerSDK.initSDK && window.relayerSDK.createInstance) {
    return;
  }
  
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms
  
  return new Promise((resolve, reject) => {
    const checkSDK = () => {
      if (window.relayerSDK && window.relayerSDK.initSDK && window.relayerSDK.createInstance) {
        resolve();
        return;
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        reject(new Error(
          `FHEVM SDK failed to load within ${maxWaitMs}ms. ` +
          'Make sure this script is in index.html:\n' +
          '<script src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"></script>'
        ));
        return;
      }
      
      setTimeout(checkSDK, checkInterval);
    };
    
    checkSDK();
  });
}

/**
 * Check if SDK is loaded from CDN
 */
function checkSDKLoaded() {
  if (typeof window === 'undefined') {
    throw new Error('Must run in browser environment');
  }
  
  if (!window.relayerSDK) {
    throw new Error(
      'FHEVM SDK not loaded! Add this to index.html:\n' +
      '<script src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"></script>'
    );
  }
  
  // Verify SDK has required methods
  if (!window.relayerSDK.initSDK || !window.relayerSDK.createInstance) {
    throw new Error('FHEVM SDK loaded but missing required methods (initSDK, createInstance)');
  }
}

/**
 * Initialize FHEVM SDK
 * MUST be called before any other FHEVM operations
 * 
 * @returns {Promise<FhevmInstance>}
 */
export async function initFhevm() {
  // Return existing instance if already initialized
  if (fhevmInstance && isInitialized) {
    console.log('✓ FHEVM already initialized, returning existing instance');
    return fhevmInstance;
  }
  
  try {
    console.log('🔧 Initializing FHEVM SDK v0.9 (CDN v0.3.0-5)...');
    
    // Step 0: Wait for SDK to load from CDN (with timeout)
    console.log('  → Waiting for SDK script to load...');
    await waitForSDKLoaded(10000); // Wait up to 10 seconds
    console.log('  ✓ SDK loaded from CDN');
    
    // Step 1: Load WASM (CRITICAL - must be first!)
    console.log('  → Loading TFHE WASM...');
    await window.relayerSDK.initSDK();
    console.log('  ✓ TFHE WASM loaded successfully');
    
    // Step 2: Create instance with Sepolia v0.9 config
    console.log('  → Creating FHEVM instance with v0.9 config...');
    
    const config = {
  ...SEPOLIA_V09_CONFIG,
  // Don't pass window.ethereum during init - SDK will handle it later
  network: 'https://sepolia.infura.io/v3/d05efcb7210a474e8b98308181a49685',
};
    
    console.log('  → Config:', {
      chainId: config.chainId,
      gatewayChainId: config.gatewayChainId,
      relayerUrl: config.relayerUrl,
      hasMetaMask: !!window.ethereum
    });
    
    try {
  fhevmInstance = await window.relayerSDK.createInstance(config);
} catch (error) {
  console.warn('Failed to create instance, retrying...', error);
  // Retry once
  await new Promise(resolve => setTimeout(resolve, 1000));
  fhevmInstance = await window.relayerSDK.createInstance(config);
}
    isInitialized = true;
    
    console.log('  ✓ FHEVM instance created successfully');
    console.log('✅ FHEVM SDK v0.9 initialization complete');
    
    return fhevmInstance;
  } catch (error) {
    console.error('❌ FHEVM initialization failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sdkLoaded: !!window.relayerSDK,
      sdkMethods: window.relayerSDK ? Object.keys(window.relayerSDK) : []
    });
    
    isInitialized = false;
    fhevmInstance = null;
    throw new Error(`FHEVM initialization failed: ${error.message}`);
  }
}

/**
 * Get current FHEVM instance (must call initFhevm first)
 * @throws {Error} If FHEVM not initialized
 */
export function getFhevmInstance() {
  if (!fhevmInstance || !isInitialized) {
    throw new Error('FHEVM not initialized. Call initFhevm() first.');
  }
  return fhevmInstance;
}

/**
 * Encrypt a lottery ticket number for submission
 * 
 * Workflow per SDK docs:
 * 1. Create encrypted input buffer with createEncryptedInput()
 * 2. Add value with appropriate type method (add8 for uint8)
 * 3. Call encrypt() to get handles and proof
 * 
 * @param {string} contractAddress - The lottery contract address
 * @param {string} userAddress - The player's address
 * @param {number} ticketNumber - The chosen lottery number (1-50)
 * @returns {Promise<{handles: string[], inputProof: string}>}
 */
export async function encryptTicketNumber(contractAddress, userAddress, ticketNumber) {
  try {
    console.log(`🔐 Encrypting lottery ticket: number ${ticketNumber}`);
    
    // Validate ticket number range (1-50)
    if (ticketNumber < 1 || ticketNumber > 50) {
      throw new Error('Ticket number must be between 1 and 50');
    }
    
    const instance = getFhevmInstance();
    
    // Step 1: Create encrypted input buffer
    const buffer = instance.createEncryptedInput(contractAddress, userAddress);
    
    // Step 2: Add the ticket number as euint8 (matches contract's externalEuint8)
    buffer.add8(BigInt(ticketNumber));
    
    // Step 3: Encrypt and generate proof
    console.log('  → Encrypting and generating proof...');
    const encryptedData = await buffer.encrypt();
    
    console.log('  ✓ Ticket number encrypted successfully');
    console.log('  → Handle:', encryptedData.handles[0]);
    console.log('  → Proof length:', encryptedData.inputProof.length);
    
    return {
      handles: encryptedData.handles,
      inputProof: encryptedData.inputProof
    };
  } catch (error) {
    console.error('❌ Ticket encryption failed:', error);
    throw new Error(`Ticket encryption failed: ${error.message}`);
  }
}

/**
 * Batch encrypt multiple ticket numbers (for buying multiple tickets at once)
 * 
 * @param {string} contractAddress - The lottery contract address
 * @param {string} userAddress - The player's address
 * @param {number[]} ticketNumbers - Array of chosen lottery numbers (1-50 each)
 * @returns {Promise<Array<{handles: string[], inputProof: string}>>}
 */
export async function encryptMultipleTickets(contractAddress, userAddress, ticketNumbers) {
  try {
    console.log(`🔐 Batch encrypting ${ticketNumbers.length} lottery tickets...`);
    
    const encryptedTickets = [];
    
    for (let i = 0; i < ticketNumbers.length; i++) {
      const ticketNumber = ticketNumbers[i];
      console.log(`  → Encrypting ticket ${i + 1}/${ticketNumbers.length}: ${ticketNumber}`);
      
      const encrypted = await encryptTicketNumber(contractAddress, userAddress, ticketNumber);
      encryptedTickets.push(encrypted);
    }
    
    console.log(`  ✓ All ${ticketNumbers.length} tickets encrypted successfully`);
    return encryptedTickets;
  } catch (error) {
    console.error('❌ Batch ticket encryption failed:', error);
    throw new Error(`Batch encryption failed: ${error.message}`);
  }
}

/**
 * Check if FHEVM is initialized
 */
export function isSDKInitialized() {
  return isInitialized && fhevmInstance !== null;
}

/**
 * Reset FHEVM instance (for testing/debugging purposes)
 */
export function resetFhevmInstance() {
  console.warn('⚠️ Resetting FHEVM instance');
  fhevmInstance = null;
  isInitialized = false;
}