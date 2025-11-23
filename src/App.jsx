import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '../components/retroui/Sonner';
import { WalletProvider } from './context/WalletContext';
import { ErrorBoundary } from '../components/retroui/common/ErrorBoundary';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { CreateLotteryPage } from './pages/CreateLotteryPage';
import { LotteryDetail } from './pages/LotteryDetail';
import { initFhevm } from './utils/fhevm';
import { LoadingSpinner } from '../components/retroui/common/LoadingSpinner';

/**
 * Main App Component with FHEVM Initialization
 * 
 * CRITICAL: We initialize FHEVM SDK on app mount and block rendering
 * until initialization completes. This ensures all child components
 * can safely use encryption/decryption functions without race conditions.
 */
function App() {
  const [fhevmReady, setFhevmReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 Initializing FHEVM SDK...');
        await initFhevm();
        setFhevmReady(true);
        console.log('✅ FHEVM SDK ready - App can now render');
      } catch (error) {
        console.error('❌ FHEVM initialization failed:', error);
        setInitError(error.message);
      }
    };

    initialize();
  }, []);

  // Show loading screen while FHEVM initializes
  // This prevents child components from trying to use FHEVM before it's ready
  if (!fhevmReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <LoadingSpinner size={48} />
        <div className="text-center">
          <h2 className="font-head text-2xl mb-2">Initializing FHEVM SDK...</h2>
          <p className="text-muted-foreground">
            Loading encryption libraries for secure lottery
          </p>
          {initError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg max-w-md">
              <p className="text-destructive font-medium">Initialization Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{initError}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Only render app once FHEVM is fully initialized
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <WalletProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/create" element={<CreateLotteryPage />} />
                <Route path="/lottery/:id" element={<LotteryDetail />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" />
        </WalletProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;