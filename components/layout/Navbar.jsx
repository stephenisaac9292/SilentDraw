import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWalletContext } from '../../src/context/WalletContext';
import { Button } from '../retroui/Button';
import { Badge } from '../retroui/Badge';
import { Wallet, Plus, Home } from 'lucide-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const { 
    account, 
    connectWallet, 
    disconnectWallet, 
    isConnecting, 
    switchToSepolia, 
    isCorrectNetwork 
  } = useWalletContext();

  return (
    <nav className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-neon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className="hidden md:block">
              <span className="font-head text-lg tracking-wider">Encrypted Lottery</span>
            </div>
          </Link>

          {/* Navigation Links & Wallet */}
          <div className="flex items-center gap-4">
             

            {/* Create Button - Only show if wallet connected and correct network */}
             
            {/* Wallet Connection Section */}
            <div className="flex items-center gap-3">
              {!account ? (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  size="sm"
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary-hover shadow-neon"
                >
                  <Wallet size={18} />
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Wrong Network Warning */}
                  {!isCorrectNetwork && (
                    <Button
                      onClick={switchToSepolia}
                      variant="destructive"
                      size="sm"
                      className="px-4 py-2 text-sm animate-pulse"
                    >
                      Switch Network
                    </Button>
                  )}
                  
                  {/* Wallet Address Badge */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectWallet}
                    className="flex items-center gap-2 px-4 py-2 border-primary/50 hover:border-primary hover:bg-primary/10 group"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <Badge variant="outline" className="text-xs font-mono border-0 bg-transparent px-0">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </Badge>
                    <span className="hidden group-hover:inline text-xs ml-1">Disconnect</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};