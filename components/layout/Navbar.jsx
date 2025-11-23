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
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <span className="font-bold text-lg hidden sm:inline">Encrypted Lottery</span>
            <span className="font-bold text-lg sm:hidden">Lottery</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="hidden sm:flex items-center gap-2"
            >
              <Home size={16} />
              Home
            </Button>

             

            {/* Wallet Connection */}
            {!account ? (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                size="sm"
                className="flex items-center gap-2"
              >
                <Wallet size={16} />
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {!isCorrectNetwork && (
                  <Button
                    onClick={switchToSepolia}
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                  >
                    Switch Network
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="flex items-center gap-2"
                >
                  <Badge variant="outline" className="text-xs">
                    {account.slice(0, 4)}...{account.slice(-4)}
                  </Badge>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};