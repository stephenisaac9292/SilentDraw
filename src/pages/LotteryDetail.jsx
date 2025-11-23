import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWalletContext } from '@/context/WalletContext';
import { useContract } from '@/hooks/useContract';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/retroui/Card';
import { Button } from '../../components/retroui/Button';
import { Badge } from '../../components/retroui/Badge';
import { BuyTicketModal } from '../../components/lottery/BuyTicketModal';
import { LotteryResults } from '../../components/lottery/LotteryResults';
import { LoadingSpinner } from '../../components/retroui/common/LoadingSpinner';
import { toast } from 'sonner';
import { ArrowLeft, Clock, User, RefreshCw, Ticket } from 'lucide-react';
import { ethers } from 'ethers';

/**
 * Lottery Detail Page - Mobile Responsive
 */
export const LotteryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, signer } = useWalletContext();
  const contractHook = useContract(signer);
  const { 
    contract, 
    getLottery, 
    buyTicket, 
    drawWinningNumber, 
    computeWinners,
    claimPrize,
    getPlayerTickets,
    getWinningTicketIds,
    decryptAndSubmitResults 
  } = contractHook;

  const [lottery, setLottery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerTickets, setPlayerTickets] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [purchaseEvents, setPurchaseEvents] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [winningTicketIds, setWinningTicketIds] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchLotteryData = async () => {
    if (!contract || !signer) {
      console.log('⏸️ Waiting for contract/signer to be ready...');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`📡 Fetching lottery ${id}...`);
      
      const lotteryData = await getLottery(id);
      
      if (!lotteryData) {
        console.error('Lottery data is null');
        toast.error('Lottery not found');
        navigate('/');
        return;
      }

      const playerTicketIds = account ? await getPlayerTickets(id, account) : [];
      
      let winningIds = [];
      try {
        winningIds = await getWinningTicketIds(id);
        winningIds = winningIds.map(n => Number(n));
        console.log('🏆 Fetched winning ticket IDs:', winningIds);
      } catch (error) {
        console.log('ℹ️ No winning tickets yet (results not submitted)');
      }
      
      const lotteryState = {
        id: Number(id),
        ticketPrice: lotteryData.ticketPrice,
        startTime: Number(lotteryData.startTime),
        endTime: Number(lotteryData.endTime),
        maxTickets: Number(lotteryData.maxTickets),
        ticketCount: Number(lotteryData.ticketCount),
        isDrawn: lotteryData.isDrawn,
        isActive: lotteryData.isActive,
        creator: lotteryData.creator,
        prizePool: lotteryData.prizePool
      };
      
      setLottery(lotteryState);
      setPlayerTickets(playerTicketIds.map(id => Number(id)));
      setWinningTicketIds(winningIds);
      
      try {
        const filter = contract.filters.TicketPurchased(id);
        const events = await contract.queryFilter(filter);
        setPurchaseEvents(events);
        console.log(`📊 Fetched ${events.length} ticket purchase event(s)`);
      } catch (error) {
        console.error('Failed to fetch purchase events:', error);
      }
      
      console.log('✅ Lottery data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to fetch lottery:', error);
      toast.error('Failed to load lottery');
      navigate('/');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (contract && signer) {
      fetchLotteryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, contract, signer, refreshKey]);

  useEffect(() => {
    if (!contract || !lottery || !lottery.isActive) return;

    const now = Date.now() / 1000;
    const isLotteryExpired = now >= lottery.endTime;
    
    if (isLotteryExpired) {
      console.log('⏹️ Lottery expired, not setting up event listener');
      return;
    }

    console.log('👂 Setting up real-time event listener for TicketPurchased...');
    
    const filter = contract.filters.TicketPurchased(id);
    
    const handlePurchaseEvent = async (lotteryId, ticketId, player, event) => {
      console.log('🔔 New ticket purchased!', { 
        lotteryId: lotteryId.toString(), 
        ticketId: ticketId.toString(),
        player 
      });
      
      try {
        const events = await contract.queryFilter(filter);
        setPurchaseEvents(events);
        console.log(`📊 Updated to ${events.length} purchase event(s)`);
        
        // Refresh lottery data to update ticket count
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Failed to fetch updated purchase events:', error);
      }
    };
    
    contract.on(filter, handlePurchaseEvent);

    return () => {
      console.log('🛑 Removing event listener');
      contract.off(filter, handlePurchaseEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, lottery?.id, lottery?.isActive, lottery?.endTime]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
  };

  const handleBuyTicket = async (ticketNumber) => {
    if (!contract) {
      toast.error('Contract not ready, please refresh');
      return;
    }

    if (currentTime >= lottery.endTime) {
      toast.error('This lottery has ended. No more tickets can be purchased.');
      return;
    }

    if (!lottery.isActive) {
      toast.error('This lottery is closed. No more tickets can be purchased.');
      return;
    }

    if (lottery.maxTickets > 0 && lottery.ticketCount >= lottery.maxTickets) {
      toast.error('This lottery is full. All tickets have been sold.');
      return;
    }

    try {
      await buyTicket(id, ticketNumber, account, lottery.ticketPrice);
      toast.success('Ticket purchased successfully!');
      
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Ticket purchase failed:', error);
    }
  };

  const handleDrawWinningNumber = async () => {
    if (!contract) {
      toast.error('Contract not ready, please refresh');
      return;
    }

    const toastId = toast.loading('Drawing winning number...');
    try {
      await drawWinningNumber(id);
      toast.success('Winning number drawn! You can now compute winners.', { id: toastId });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Draw failed:', error);
      toast.error('Failed to draw winning number: ' + error.message, { id: toastId });
    }
  };

  const handleComputeWinners = async () => {
    if (!contract) {
      toast.error('Contract not ready, please refresh');
      return;
    }

    const toastId = toast.loading('Computing winners...');
    try {
      await computeWinners(id);
      toast.success('Winners computed! Ready for decryption.', { id: toastId });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Compute winners failed:', error);
      toast.error('Failed to compute winners: ' + error.message, { id: toastId });
    }
  };

  const handleDecrypt = async () => {
    if (!contract) {
      toast.error('Contract not ready, please refresh');
      return;
    }

    if (isDecrypting) {
      toast.warning('Decryption already in progress...');
      return;
    }

    const toastId = toast.loading('Decrypting results...');
    setIsDecrypting(true);

    try {
      console.log('🔓 Starting decryption from UI...');
      
      const results = await decryptAndSubmitResults(id);
      
      console.log('✅ Decryption completed, results:', results);
      
      toast.success(`Winners found: ${results.winnerCount} ticket(s) won!`, {
        id: toastId,
        duration: 5000
      });
      
      console.log('🔄 Refreshing lottery data to display results...');
      await fetchLotteryData();
      
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      
      let errorMessage = 'Failed to decrypt results';
      
      if (error.message.includes('not initialized')) {
        errorMessage = 'FHEVM not ready. Please refresh the page.';
      } else if (error.message.includes('Invalid handle')) {
        errorMessage = 'Lottery not properly prepared. Try running computeWinners again.';
      } else if (error.message.includes('proof')) {
        errorMessage = 'Verification failed. The decryption may have been tampered with.';
      } else if (error.message.includes('publicly decryptable')) {
        errorMessage = 'Lottery not ready for decryption. Ensure winners are computed first.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: toastId, duration: 7000 });
      
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleClaimPrize = async () => {
    if (!contract) {
      toast.error('Contract not ready, please refresh');
      return;
    }

    const toastId = toast.loading('Claiming prize...');
    try {
      await claimPrize(id);
      toast.success('Prize claimed successfully!', { id: toastId });
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Claim prize failed:', error);
      toast.error('Failed to claim prize: ' + error.message, { id: toastId });
    }
  };

  if (loading || !contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <LoadingSpinner size={40} />
        <p className="text-muted-foreground text-center">
          {!contract ? 'Initializing contract...' : 'Loading lottery...'}
        </p>
      </div>
    );
  }

  if (!lottery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Lottery not found</p>
            <Button onClick={() => navigate('/')} className="mt-4 w-full sm:w-auto">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLotteryExpired = currentTime >= lottery.endTime;
  const isCreator = account && account.toLowerCase() === lottery.creator.toLowerCase();
  const hasPlayerTickets = playerTickets.length > 0;
  const playerHasWinningTicket = playerTickets.some(ticketId => 
    winningTicketIds.includes(ticketId)
  );

  const timeRemaining = () => {
    const diff = lottery.endTime - currentTime;

    if (diff <= 0) return 'Lottery ended';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = Math.floor(diff % 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
    return `${seconds}s remaining`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 -ml-2 sm:ml-0"
          size="sm"
        >
          <ArrowLeft size={16} />
          <span className="text-sm sm:text-base">Back</span>
        </Button>

        {lottery.isActive && !isLotteryExpired && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>

      <Card className="mb-6 sm:mb-8">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2">
                Lottery #{lottery.id}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <User size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{lottery.creator.slice(0, 6)}...{lottery.creator.slice(-4)}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant={lottery.isActive && !isLotteryExpired ? 'default' : 'secondary'}>
                {lottery.isActive && !isLotteryExpired ? 'Active' : 'Ended'}
              </Badge>
              {lottery.isDrawn && (
                <Badge variant="outline">
                  Drawn
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Ticket Price</p>
              <p className="font-medium">{ethers.formatEther(lottery.ticketPrice)} ETH</p>
            </div>
            <div>
              <p className="text-muted-foreground">Prize Pool</p>
              <p className="font-medium">{ethers.formatEther(lottery.prizePool)} ETH</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tickets Sold</p>
              <p className="font-medium">
                {lottery.ticketCount}
                {lottery.maxTickets > 0 && ` / ${lottery.maxTickets}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Your Tickets</p>
              <p className="font-medium">{playerTickets.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm pt-2 border-t">
            <Clock size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
            <span>{timeRemaining()}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {lottery.isActive && !isLotteryExpired && (
          <BuyTicketModal
            lottery={lottery}
            onBuyTicket={handleBuyTicket}
            account={account}
          />
        )}

        {isCreator && isLotteryExpired && lottery.isActive && !lottery.isDrawn && (
          <Card className="bg-accent lg:col-span-2">
            <CardContent className="p-4 sm:p-6">
              <p className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">
                Lottery has ended - Draw winning number
              </p>
              <Button onClick={handleDrawWinningNumber} className="w-full">
                Draw Winning Number
              </Button>
            </CardContent>
          </Card>
        )}

        {isCreator && lottery.isDrawn && lottery.ticketCount > 0 && winningTicketIds.length === 0 && (
          <Card className="bg-accent lg:col-span-2">
            <CardContent className="p-4 sm:p-6 space-y-3">
              <p className="font-medium text-sm sm:text-base">
                Winning number drawn - Compute winners and decrypt results
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleComputeWinners} className="flex-1">
                  Compute Winners
                </Button>
                <Button onClick={handleDecrypt} disabled={isDecrypting} className="flex-1">
                  {isDecrypting ? 'Decrypting...' : 'Decrypt Results'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <LotteryResults
          lottery={lottery}
          isCreator={isCreator}
          onDecrypt={handleDecrypt}
          onClaimPrize={handleClaimPrize}
          purchaseEvents={purchaseEvents}
          isDecrypting={isDecrypting}
          winningTicketIds={winningTicketIds}
          playerTickets={playerTickets}
          playerHasWinningTicket={playerHasWinningTicket}
        />
      </div>
    </div>
  );
};