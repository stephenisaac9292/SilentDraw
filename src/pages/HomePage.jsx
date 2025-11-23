import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '@/context/WalletContext';
import { useLotteries } from '../hooks/useLotteries';
import { Card, CardContent } from '../../components/retroui/Card';
import { Button } from '../../components/retroui/Button';
import { Badge } from '../../components/retroui/Badge';
import { LotteryCard } from '../../components/lottery/LotteryCard';
import { LoadingSpinner } from '../../components/retroui/common/LoadingSpinner';
import { initFhevm } from '@/utils/fhevm';
import { Plus, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const HomePage = () => {
  const navigate = useNavigate();
  const { account, signer, connectWallet, isConnecting, switchToSepolia, isCorrectNetwork } = useWalletContext();
  const [fhevmReady, setFhevmReady] = useState(false);
  const [fhevmError, setFhevmError] = useState(null);
  const [filterMode, setFilterMode] = useState('active');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { lotteries, loading, error } = useLotteries(
    signer,
    refreshTrigger,
    filterMode,
    account
  );

  useEffect(() => {
    const initializeFhevm = async () => {
      try {
        console.log('🔧 Initializing FHEVM on home page...');
        await initFhevm();
        setFhevmReady(true);
        console.log('✅ FHEVM ready');
      } catch (error) {
        console.error('❌ FHEVM initialization failed:', error);
        setFhevmError(error.message);
      }
    };

    initializeFhevm();
  }, []);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success('Refreshing lotteries...');
  };

  const activeLotteries = lotteries.filter(l => {
    const now = Date.now() / 1000;
    return l.isActive && now < l.endTime;
  });

  const endedLotteries = lotteries.filter(l => {
    const now = Date.now() / 1000;
    return !l.isActive || now >= l.endTime;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Encrypted Lottery</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Provably fair, fully private lottery on FHEVM
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {!account ? (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <Wallet size={16} />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              ) : (
                <>
                  {!isCorrectNetwork && (
                    <Button
                      onClick={switchToSepolia}
                      variant="destructive"
                      className="w-full sm:w-auto text-sm"
                    >
                      Switch to Sepolia
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate('/create')}
                    className="w-full sm:w-auto flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Create Lottery
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex gap-2 mt-4">
            {account && (
              <Badge variant="outline" className="text-xs">
                {account.slice(0, 6)}...{account.slice(-4)}
              </Badge>
            )}
            {fhevmReady && (
              <Badge variant="default" className="text-xs">
                FHEVM Ready
              </Badge>
            )}
            {fhevmError && (
              <Badge variant="destructive" className="text-xs">
                FHEVM Error
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* FHEVM Error Alert */}
        {fhevmError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">FHEVM Initialization Failed</h3>
                <p className="text-sm text-muted-foreground mb-3">{fhevmError}</p>
                <Button 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Network Warning */}
        {account && !isCorrectNetwork && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm mb-1">Wrong Network</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Please switch to Sepolia testnet to use the lottery
                  </p>
                  <Button 
                    onClick={switchToSepolia}
                    size="sm"
                    variant="destructive"
                  >
                    Switch to Sepolia
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filterMode === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('active')}
          >
            Active ({activeLotteries.length})
          </Button>
          <Button
            variant={filterMode === 'ended' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('ended')}
          >
            Ended ({endedLotteries.length})
          </Button>
          <Button
            variant={filterMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('all')}
          >
            All ({lotteries.length})
          </Button>
          {account && (
            <Button
              variant={filterMode === 'my-lotteries' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode('my-lotteries')}
            >
              My Lotteries
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="ml-auto"
          >
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <LoadingSpinner size={40} />
            <p className="text-muted-foreground">Loading lotteries...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <AlertCircle size={48} className="mx-auto mb-3 text-destructive" />
              <h3 className="font-medium mb-2">Failed to Load Lotteries</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh}>Try Again</Button>
            </CardContent>
          </Card>
        )}

        {/* Lottery Grid */}
        {!loading && !error && lotteries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {lotteries.map((lottery) => (
              <LotteryCard key={lottery.id} lottery={lottery} />
            ))}
          </div>
        )}

        {/* Empty State */}
{!loading && !error && lotteries.length === 0 && (
  <Card>
    <CardContent className="p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {filterMode === 'active' ? 'No Active Lotteries' : 
           filterMode === 'ended' ? 'No Ended Lotteries' :
           filterMode === 'my-lotteries' ? 'You Haven\'t Created Any Lotteries' :
           'No Lotteries Yet'}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {filterMode === 'my-lotteries' 
            ? 'Be the first to create an encrypted lottery!'
            : 'Be the first to create a lottery on the platform!'}
        </p>
        {account && isCorrectNetwork && (
          <Button onClick={() => navigate('/create')}>
            Create First Lottery
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
)}
    </main>
    </div>
  );
};