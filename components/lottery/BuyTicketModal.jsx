import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../retroui/Card';
import { Button } from '../retroui/Button';
import { Input } from '../retroui/Input';
import { toast } from 'sonner';
import { Ticket } from 'lucide-react';

/**
 * Buy Ticket Modal Component
 */
export const BuyTicketModal = ({ lottery, onBuyTicket, account }) => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    const number = parseInt(ticketNumber);

    if (!ticketNumber || isNaN(number)) {
      toast.error('Please enter a valid number');
      return;
    }

    if (number < 1 || number > 50) {
      toast.error('Number must be between 1 and 50');
      return;
    }

    setIsPurchasing(true);

    try {
      await onBuyTicket(number);
      setTicketNumber('');
    } catch (error) {
      console.error('Purchase failed:', error);
      
      let errorMessage = 'Failed to purchase ticket';
      
      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds';
      } else if (error.message?.includes('Lottery is full')) {
        errorMessage = 'All tickets sold out';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePurchase();
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Ticket size={20} />
          Buy Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="ticket-number" className="text-sm font-medium">
            Choose your lucky number (1-50)
          </label>
          <Input
            id="ticket-number"
            type="number"
            min="1"
            max="50"
            placeholder="Enter number..."
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isPurchasing || !account}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            Your number will be encrypted and kept secret until the draw
          </p>
        </div>

        <Button
          onClick={handlePurchase}
          disabled={isPurchasing || !account || !ticketNumber}
          className="w-full"
        >
          {isPurchasing ? 'Purchasing...' : !account ? 'Connect Wallet' : 'Buy Ticket'}
        </Button>

        {!account && (
          <p className="text-xs text-center text-muted-foreground">
            Connect your wallet to participate
          </p>
        )}
      </CardContent>
    </Card>
  );
};