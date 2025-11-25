// hooks/useLotteries.js
import { useState, useEffect } from 'react';
import { useContract } from './useContract';

/**
 * ✅ Fetches ALL lotteries (active + ended + drawn)
 * Allows filtering/sorting in UI components
 * 
 * @param {object} signer - Ethers signer
 * @param {number} refreshTrigger - Counter to trigger refetch
 * @param {string} filterMode - 'all' | 'active' | 'ended' | 'my-lotteries'
 * @param {string} userAddress - Current user's address (for 'my-lotteries' filter)
 */
export function useLotteries(signer, refreshTrigger = 0, filterMode = 'all', userAddress = null) {
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const contractHook = useContract(signer);
  const { contract, getActiveLotteries, getLottery } = contractHook;

  const fetchLotteries = async () => {
    // Don't fetch if no signer
    if (!signer) {
      console.log('⏸️ No signer, skipping lottery fetch');
      setLoading(false);
      setLotteries([]);
      return;
    }

    // Don't fetch if contract not ready
    if (!contract) {
      console.log('⏸️ Contract not ready yet, skipping lottery fetch');
      setLoading(false);
      setLotteries([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching lotteries from blockchain...');
      
      // Fetch lottery count from contract
      const lotteryCount = await contract.lotteryCount();
      const totalLotteries = Number(lotteryCount);
      
      if (totalLotteries === 0) {
        console.log('  ✓ No lotteries found on blockchain');
        setLotteries([]);
        return;
      }
      
      console.log(`  → Found ${totalLotteries} lottery/lotteries on blockchain`);

      // Fetch all lotteries
      const lotteriesData = await Promise.all(
        Array.from({ length: totalLotteries }, (_, i) => i).map(async (id) => {
          try {
            console.log(`  → Fetching lottery ${id}...`);
            const lottery = await getLottery(id);
            
            if (!lottery) {
              console.warn(`  ⚠️ Lottery ${id} returned null`);
              return null;
            }
            
            // Check if lottery exists (deleted lotteries will have exists = false)
            const exists = await contract.pollExists ? await contract.pollExists(id) : true;
            
            if (!exists) {
              console.log(`  → Lottery ${id} was deleted, skipping`);
              return null;
            }
            
            // Calculate if lottery is expired
            const now = Date.now() / 1000;
            const isLotteryExpired = now >= Number(lottery.endTime);
            
            // Get winning ticket IDs if results are submitted
            let winningTickets = [];
            if (lottery.isDrawn && !lottery.isActive) {
              try {
                winningTickets = await contract.getWinningTicketIds(id);
                winningTickets = winningTickets.map(n => Number(n));
              } catch {
                // Results not submitted yet
              }
            }
            
            return {
              id: Number(id),
              ticketPrice: lottery.ticketPrice,
              startTime: Number(lottery.startTime),
              endTime: Number(lottery.endTime),
              maxTickets: Number(lottery.maxTickets),
              ticketCount: Number(lottery.ticketCount),
              isDrawn: lottery.isDrawn,
              isActive: lottery.isActive,
              creator: lottery.creator,
              prizePool: lottery.prizePool,
              isExpired: isLotteryExpired,
              winningTickets,
              hasWinners: winningTickets.length > 0
            };
          } catch (lotteryError) {
            console.error(`  ❌ Failed to fetch lottery ${id}:`, lotteryError.message);
            return null;
          }
        })
      );
      
      // Filter out any failed or deleted lotteries
      let validLotteries = lotteriesData.filter(l => l !== null);
      
      // Apply filtering based on filterMode
      if (filterMode === 'active') {
        validLotteries = validLotteries.filter(l => l.isActive && !l.isExpired);
        console.log(`  → Filtered to ${validLotteries.length} active lottery/lotteries`);
      } else if (filterMode === 'ended') {
        validLotteries = validLotteries.filter(l => !l.isActive || l.isExpired);
        console.log(`  → Filtered to ${validLotteries.length} ended lottery/lotteries`);
      } else if (filterMode === 'my-lotteries' && userAddress) {
        validLotteries = validLotteries.filter(
          l => l.creator.toLowerCase() === userAddress.toLowerCase()
        );
        console.log(`  → Filtered to ${validLotteries.length} lottery/lotteries created by you`);
      }
      
      // Sort: Active lotteries first, then by end time (newest first)
      validLotteries.sort((a, b) => {
        // Active lotteries always come first
        if (a.isActive && !a.isExpired && (b.isExpired || !b.isActive)) return -1;
        if (b.isActive && !b.isExpired && (a.isExpired || !a.isActive)) return 1;
        
        // Within same status, sort by end time (newest first)
        return b.endTime - a.endTime;
      });
      
      console.log(`✅ Successfully fetched and sorted ${validLotteries.length} lottery/lotteries`);
      
      setLotteries(validLotteries);
    } catch (error) {
      console.error('❌ Failed to fetch lotteries:');
      setError(error.message);
      setLotteries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotteries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, refreshTrigger, contract, filterMode, userAddress]);

  return { 
    lotteries, 
    loading, 
    error,
    refetch: fetchLotteries 
  };
}