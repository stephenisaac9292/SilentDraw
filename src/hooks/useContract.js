// hooks/useContract.js
import { useState, useEffect } from 'react';
import { getContract } from '../utils/contract';
import { encryptTicketNumber, isSDKInitialized } from '../utils/fhevm';
import { 
  decryptWinningNumber,
  decryptLotteryTickets, 
  formatDecryptedTickets, 
  extractHandles,
  validateHandles,
  extractWinningNumber
} from '../utils/decryption';

export function useContract(signer) {
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (signer) {
      const contractInstance = getContract(signer);
      setContract(contractInstance);
    }
  }, [signer]);

  /**
   * Create a new lottery
   */
  const createLottery = async (ticketPrice, durationMinutes, maxTickets = 0) => {
    if (!contract) throw new Error('Contract not initialized');
    
    console.log('🎰 Creating lottery...', { ticketPrice, durationMinutes, maxTickets });
    
    const tx = await contract.createLottery(ticketPrice, durationMinutes, maxTickets);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find(log => {
      try {
        return contract.interface.parseLog(log)?.name === 'LotteryCreated';
      } catch {
        return false;
      }
    });
    
    const lotteryId = event ? contract.interface.parseLog(event).args.lotteryId : null;
    
    console.log('✅ Lottery created with ID:', lotteryId);
    return { lotteryId, receipt };
  };

  /**
   * Buy an encrypted lottery ticket
   */
  const buyTicket = async (lotteryId, ticketNumber, userAddress, ticketPrice) => {
    if (!contract) throw new Error("Contract not initialized");
    if (!isSDKInitialized()) throw new Error("FHEVM SDK not initialized. Please refresh.");
  
    console.log("🎫 Buying ticket...", { lotteryId, ticketNumber, userAddress });
  
    const contractAddress = await contract.getAddress();
    const encrypted = await encryptTicketNumber(contractAddress, userAddress, ticketNumber);
  
    const toHex = (data) => {
      if (!data) throw new Error("Missing data to hexify");
      if (typeof data === "string" && data.startsWith("0x")) return data;
      if (data instanceof Uint8Array)
        return (
          "0x" +
          Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")
        );
      throw new Error("Unsupported data type for toHex(): " + typeof data);
    };
  
    const toFixed32 = (hex) => {
      if (!hex.startsWith("0x")) throw new Error("Missing 0x prefix");
      const clean = hex.slice(2);
      if (clean.length > 64) return "0x" + clean.slice(0, 64);
      return "0x" + clean.padEnd(64, "0");
    };
  
    const handleHex = toFixed32(toHex(encrypted.handles[0]));
    const proofHex = toHex(encrypted.inputProof);
    const lotteryIdNum = BigInt(lotteryId);
  
    const tx = await contract.buyTicket(lotteryIdNum, handleHex, proofHex, {
      value: ticketPrice
    });
    const receipt = await tx.wait();
  
    console.log("✅ Ticket purchased successfully");
    return receipt;
  };
  
  /**
   * Draw the winning number (after lottery ends)
   */
  const drawWinningNumber = async (lotteryId) => {
  if (!contract) {
    toast.error('Contract Not Ready', {
      description: 'Please refresh the page and try again'
    });
    return;
  }
  
  console.log('🎲 Drawing winning number...', lotteryId);
  
  try {
    const tx = await contract.drawWinningNumber(lotteryId);
    const receipt = await tx.wait();
    
    console.log('✅ Winning number drawn - marked for public decryption');
    return receipt;
  } catch (error) {
    console.error('[Draw Error]:', error);
    
    // User-friendly error messages
    if (error.message?.includes('No tickets sold')) {
      throw new Error('Cannot draw - no tickets have been sold yet');
    } else if (error.message?.includes('Lottery not ended')) {
      throw new Error('The lottery is still running. Please wait for it to end.');
    } else if (error.message?.includes('Already drawn')) {
      throw new Error('Winning number has already been drawn for this lottery');
    } else if (error.code === 4001) {
      throw new Error('Transaction cancelled');
    } else if (error.code === -32603) {
      throw new Error('Transaction failed. Please check if the lottery has ended.');
    } else {
      throw new Error('Failed to draw winning number. Please try again.');
    }
  }
};

  /**
   * Compute winners by marking tickets for decryption
   */
  const computeWinners = async (lotteryId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    console.log('🔍 Computing winners...', lotteryId);
    
    const tx = await contract.computeWinners(lotteryId);
    const receipt = await tx.wait();
    
    console.log('✅ Winners computed - tickets marked for public decryption');
    return receipt;
  };

  /**
   * Claim prize for winning tickets
   */
  const claimPrize = async (lotteryId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    console.log('💰 Claiming prize...', lotteryId);
    
    const tx = await contract.claimPrize(lotteryId);
    const receipt = await tx.wait();
    
    console.log('✅ Prize claimed successfully');
    return receipt;
  };

  /**
   * Refund tickets if lottery fails
   */
  const refundTickets = async (lotteryId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    console.log('💸 Requesting refund...', lotteryId);
    
    const tx = await contract.refundTickets(lotteryId);
    const receipt = await tx.wait();
    
    console.log('✅ Refund processed successfully');
    return receipt;
  };

  /**
   * Get lottery details
   */
  const getLottery = async (lotteryId) => {
    if (!contract) {
      console.warn('⚠️ Contract not ready yet');
      return null;
    }
    return await contract.getLottery(lotteryId);
  };

  /**
   * Get player's tickets for a lottery
   */
  const getPlayerTickets = async (lotteryId, address) => {
    if (!contract) {
      console.warn('⚠️ Contract not ready yet');
      return [];
    }
    return await contract.getPlayerTickets(lotteryId, address);
  };

  /**
   * Get winning ticket IDs (after results submitted)
   */
  const getWinningTicketIds = async (lotteryId) => {
    if (!contract) {
      console.warn('⚠️ Contract not ready yet');
      return [];
    }
    return await contract.getWinningTicketIds(lotteryId);
  };

  /**
   * Get all active lotteries
   */
  const getActiveLotteries = async () => {
    if (!contract) {
      console.warn('⚠️ Contract not ready yet');
      return [];
    }
    return await contract.getActiveLotteries();
  };

  /**
   * FHEVM v0.9 Public Decryption - Lottery Winner Detection
   * 
   * Workflow:
   * 1. Decrypt winning number
   * 2. Decrypt all ticket numbers
   * 3. Submit both with proofs to contract
   * 4. Contract identifies winners by comparing encrypted data
   */
  const decryptAndSubmitResults = async (lotteryId) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      console.log('🔓 Starting FHEVM v0.9 lottery decryption workflow...');
      console.log(`  → Lottery ID: ${lotteryId}`);
      
      // STEP 1: Get lottery info to know ticket count
      console.log('\n📡 Step 1: Fetching lottery info...');
      const lottery = await contract.getLottery(lotteryId);
      const ticketCount = Number(lottery.ticketCount);
      console.log(`  → Ticket count: ${ticketCount}`);
      
      if (ticketCount === 0) {
        throw new Error('No tickets sold in this lottery');
      }
      
      // STEP 2: Fetch winning number handle
      console.log('\n🎲 Step 2: Fetching winning number handle...');
      const winningNumberHandle = await contract.getWinningNumberHandle(lotteryId);
      console.log(`  ✓ Got winning number handle: ${winningNumberHandle}`);
      
      // STEP 3: Decrypt winning number
      console.log('\n🔐 Step 3: Decrypting winning number...');
      const winningNumberResults = await decryptWinningNumber(winningNumberHandle);
      const winningNumber = extractWinningNumber(
        winningNumberResults.clearValues, 
        winningNumberHandle
      );
      console.log(`  ✓ Winning number decrypted: ${winningNumber}`);
      
      // STEP 4: Fetch all ticket handles
      console.log('\n📡 Step 4: Fetching all ticket handles...');
      const rawTicketHandles = [];
      
      for (let i = 0; i < ticketCount; i++) {
        console.log(`  → Fetching ticket ${i}...`);
        const handle = await contract.getTicketHandle(lotteryId, i);
        rawTicketHandles.push(handle);
      }
      
      const ticketHandles = extractHandles(rawTicketHandles);
      console.log('  ✓ All ticket handles fetched');
      validateHandles(ticketHandles);
      console.log('  ✓ All handles validated');
      
      // STEP 5: Decrypt all tickets
      console.log('\n🔐 Step 5: Decrypting all tickets...');
      const ticketResults = await decryptLotteryTickets(ticketHandles);
      console.log('  ✓ All tickets decrypted');
      
      const ticketNumbers = formatDecryptedTickets(
        ticketResults.clearValues, 
        ticketHandles
      );
      console.log('  → Ticket numbers:', ticketNumbers);
      
      // STEP 6: Submit results to contract
      console.log('\n📤 Step 6: Submitting results to contract...');
      
      const ethers = await import('ethers');
      
      // Encode winning number as uint8
      const winningNumberEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint8'], 
        [winningNumber]
      );
      
      // Use the SDK's encoded tickets (already in correct format)
      const ticketsEncoded = ticketResults.abiEncodedClearValues;
      
      console.log('  → Submitting with proofs...');
      const tx = await contract.submitResults(
        lotteryId,
        winningNumberEncoded,
        winningNumberResults.decryptionProof,
        ticketsEncoded,
        ticketResults.decryptionProof
      );
      
      console.log('  → Waiting for confirmation...');
      const receipt = await tx.wait();
      
      console.log('  ✓ Transaction confirmed!');
      console.log(`  → Gas used: ${receipt.gasUsed.toString()}`);
      
      // Get winning tickets from contract
      const winningTicketIds = await getWinningTicketIds(lotteryId);
      const winnerCount = winningTicketIds.length;
      
      console.log('\n✅ FHEVM v0.9 lottery workflow complete!');
      console.log(`🎰 Winning number: ${winningNumber}`);
      console.log(`🏆 Winners found: ${winnerCount}`);
      console.log(`🎫 Winning ticket IDs:`, winningTicketIds.map(id => Number(id)));
      
      return {
        winningNumber,
        ticketNumbers,
        winningTicketIds: winningTicketIds.map(id => Number(id)),
        winnerCount
      };
      
    } catch (error) {
      console.error('\n❌ Lottery decryption workflow failed:', error);
      
      if (error.message.includes('Invalid handle')) {
        throw new Error('Invalid ciphertext handles. Ensure lottery is drawn and computeWinners() was called.');
      } else if (error.message.includes('not initialized')) {
        throw new Error('FHEVM SDK not initialized. Please refresh.');
      } else if (error.message.includes('Failed to decrypt')) {
        throw new Error('Decryption failed. Ensure winning number and tickets are publicly decryptable.');
      } else if (error.message.includes('checkSignatures') || error.message.includes('0x6475522d')) {
        console.error('\n🔍 Signature verification debug:');
        console.error('  - Handle order mismatch OR');
        console.error('  - Type mismatch in encoding');
        throw new Error('Signature verification failed. See console for details.');
      } else {
        throw new Error(`Decryption workflow failed: ${error.message}`);
      }
    }
  };

  return {
    contract,
    createLottery,
    buyTicket,
    drawWinningNumber,
    computeWinners,
    claimPrize,
    refundTickets,
    getLottery,
    getPlayerTickets,
    getWinningTicketIds,
    getActiveLotteries,
    decryptAndSubmitResults
  };
}