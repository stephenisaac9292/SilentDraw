// utils/decryption.js

/**
 * FHEVM v0.9 Public Decryption Workflow (Self-Relaying)
 * 
 * CRITICAL v0.9 WORKFLOW:
 * 1. Contract marks ciphertext as publicly decryptable: FHE.makePubliclyDecryptable()
 * 2. Client fetches ciphertext handles from contract
 * 3. Client calls instance.publicDecrypt(handles) - returns PublicDecryptResults object
 * 4. Client submits cleartext + decryptionProof back to contract
 * 5. Contract verifies with FHE.checkSignatures()
 * 
 * Docs: https://docs.zama.org/protocol/relayer-sdk-guides/fhevm-relayer/decryption/public-decryption
 */

import { getFhevmInstance } from './fhevm';

/**
 * Decrypt lottery winning number using FHEVM v0.9 public decryption
 * 
 * @param {string} winningNumberHandle - Ciphertext handle for winning number (bytes32 hex string)
 * @returns {Promise<PublicDecryptResults>} - Full decryption result with proof
 */
export async function decryptWinningNumber(winningNumberHandle) {
  try {
    console.log('🔓 Decrypting winning number...');
    console.log(`  → Handle: ${winningNumberHandle}`);
    
    if (!winningNumberHandle || typeof winningNumberHandle !== 'string') {
      throw new Error('Invalid winning number handle');
    }
    
    // Validate handle format (must be 32-byte hex string)
    const cleanHandle = winningNumberHandle.startsWith('0x') ? winningNumberHandle.slice(2) : winningNumberHandle;
    if (cleanHandle.length !== 64) {
      throw new Error(`Invalid handle length: ${winningNumberHandle} (expected 64 hex chars)`);
    }
    
    console.log('  ✓ Handle validation passed');
    
    // Get FHEVM instance
    const instance = getFhevmInstance();
    
    // Call SDK public decrypt method with single handle
    console.log('  → Calling instance.publicDecrypt()...');
    const results = await instance.publicDecrypt([winningNumberHandle]);
    
    console.log('  ✓ Decryption successful');
    console.log('  → Winning number:', results.clearValues[winningNumberHandle]);
    
    // Verify we got the value
    if (!results.clearValues || !results.clearValues[winningNumberHandle]) {
      throw new Error('Failed to decrypt winning number');
    }
    
    // Verify proof exists
    if (!results.decryptionProof || results.decryptionProof === '0x') {
      throw new Error('Decryption proof missing from results');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Winning number decryption failed:', error);
    throw new Error(`Failed to decrypt winning number: ${error.message}`);
  }
}

/**
 * Decrypt all lottery tickets using FHEVM v0.9 public decryption
 * 
 * Per SDK docs: instance.publicDecrypt(handles) returns PublicDecryptResults:
 * {
 *   clearValues: Record<handle, bigint | boolean | hex>,
 *   abiEncodedClearValues: `0x${string}`,
 *   decryptionProof: `0x${string}`
 * }
 * 
 * @param {string[]} ticketHandles - Array of ticket ciphertext handles (bytes32 hex strings)
 * @returns {Promise<PublicDecryptResults>} - Full decryption result object with proof
 */
export async function decryptLotteryTickets(ticketHandles) {
  try {
    console.log('🔓 Starting v0.9 public decryption for tickets...');
    console.log(`  → Tickets to decrypt: ${ticketHandles.length}`);
    
    if (!ticketHandles || ticketHandles.length === 0) {
      throw new Error('No ticket handles provided for decryption');
    }
    
    // Validate handle format (must be 32-byte hex strings)
    for (const handle of ticketHandles) {
      if (!handle || typeof handle !== 'string') {
        throw new Error(`Invalid handle format: ${handle}`);
      }
      // Remove 0x prefix if present for validation
      const cleanHandle = handle.startsWith('0x') ? handle.slice(2) : handle;
      if (cleanHandle.length !== 64) {
        throw new Error(`Invalid handle length: ${handle} (expected 64 hex chars)`);
      }
    }
    
    console.log('  ✓ Handle validation passed');
    
    // Get FHEVM instance
    const instance = getFhevmInstance();
    
    // Call SDK public decrypt method
    console.log('  → Calling instance.publicDecrypt()...');
    const results = await instance.publicDecrypt(ticketHandles);
    
    console.log('  ✓ Decryption successful');
    console.log('  → Results structure:', {
      hasClearValues: !!results.clearValues,
      hasAbiEncoded: !!results.abiEncodedClearValues,
      hasProof: !!results.decryptionProof,
      clearValuesCount: Object.keys(results.clearValues || {}).length,
      proofLength: results.decryptionProof?.length
    });
    
    // Log individual decrypted ticket numbers
    if (results.clearValues) {
      Object.entries(results.clearValues).forEach(([handle, value]) => {
        console.log(`    Ticket ${handle.slice(0, 10)}... → Number ${value}`);
      });
    }
    
    // Verify we got all expected values
    if (!results.clearValues || Object.keys(results.clearValues).length !== ticketHandles.length) {
      throw new Error(
        `Incomplete decryption: expected ${ticketHandles.length} tickets, got ${Object.keys(results.clearValues || {}).length}`
      );
    }
    
    // Verify proof exists
    if (!results.decryptionProof || results.decryptionProof === '0x') {
      throw new Error('Decryption proof missing from results');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Ticket decryption failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      ticketHandles
    });
    throw new Error(`Failed to decrypt tickets: ${error.message}`);
  }
}

/**
 * Format decrypted ticket numbers for display
 * Converts SDK PublicDecryptResults.clearValues object to array matching ticket order
 * 
 * @param {Object} clearValues - clearValues from PublicDecryptResults (maps handles to bigints)
 * @param {string[]} handleOrder - Array of handles in the correct order
 * @returns {number[]} - Array of ticket numbers as regular numbers
 */
export function formatDecryptedTickets(clearValues, handleOrder) {
  if (!clearValues || !handleOrder) {
    throw new Error('Invalid clearValues or handle order');
  }
  
  console.log('📊 Formatting decrypted ticket numbers...');
  console.log('  → Handles order:', handleOrder.length);
  console.log('  → Clear values count:', Object.keys(clearValues).length);
  
  // Convert object to array in correct order
  const ticketNumbers = handleOrder.map((handle, index) => {
    const value = clearValues[handle];
    
    if (value === undefined) {
      console.warn(`⚠️ No value found for handle ${handle}, using 0`);
      return 0;
    }
    
    // Convert BigInt to Number for display
    const numValue = typeof value === 'bigint' ? Number(value) : (value || 0);
    console.log(`  → Ticket ${index}: Number ${numValue}`);
    
    return numValue;
  });
  
  console.log('  ✓ Tickets formatted:', ticketNumbers);
  return ticketNumbers;
}

/**
 * Extract ciphertext handles from contract response
 * Handles can come in various formats from ethers.js
 * 
 * @param {Array} ciphertexts - Array of ciphertext responses from contract
 * @returns {string[]} - Array of handle strings (with 0x prefix)
 */
export function extractHandles(ciphertexts) {
  console.log('🔍 Extracting handles from contract data...');
  
  const handles = ciphertexts.map((ct, index) => {
    let handle;
    
    // Handle different response formats
    if (typeof ct === 'string') {
      handle = ct;
    } else if (ct.data) {
      handle = ct.data;
    } else if (ct._hex) {
      handle = ct._hex;
    } else {
      handle = ct.toString();
    }
    
    // Ensure 0x prefix
    if (!handle.startsWith('0x')) {
      handle = '0x' + handle;
    }
    
    console.log(`  → Handle ${index}: ${handle}`);
    return handle;
  });
  
  console.log(`  ✓ Extracted ${handles.length} handles`);
  return handles;
}

/**
 * Validate that all handles are properly formatted
 */
export function validateHandles(handles) {
  for (const handle of handles) {
    if (!handle || typeof handle !== 'string') {
      throw new Error(`Invalid handle: ${handle}`);
    }
    
    const cleanHandle = handle.startsWith('0x') ? handle.slice(2) : handle;
    if (cleanHandle.length !== 64) {
      throw new Error(`Invalid handle length: ${handle}`);
    }
  }
  
  return true;
}

/**
 * Extract winning number from decryption results
 * @param {Object} clearValues - clearValues from PublicDecryptResults
 * @param {string} handle - The handle for the winning number
 * @returns {number} - The winning number as a regular number
 */
export function extractWinningNumber(clearValues, handle) {
  const value = clearValues[handle];
  if (value === undefined) {
    throw new Error('Winning number not found in decryption results');
  }
  return typeof value === 'bigint' ? Number(value) : value;
}