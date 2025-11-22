// hooks/useWallet.js
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const signerInstance = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      
      setAccount(accounts[0]);
      setSigner(signerInstance);
      setProvider(browserProvider);
      setChainId(Number(network.chainId));

      // Check if on Sepolia
      if (Number(network.chainId) !== 11155111) {
        alert('Please switch to Sepolia testnet');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) connectWallet();
        });

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { 
    account, 
    signer, 
    provider,
    chainId,
    connectWallet, 
    disconnectWallet, 
    switchToSepolia,
    isConnecting,
    isConnected: !!account,
    isCorrectNetwork: chainId === 11155111
  };
}