import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext';
import { useContract } from '../hooks/useContract';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/retroui/Card';
import { Button } from '../components/retroui/Button';
import { Input } from '../components/retroui/Input';
import { LoadingSpinner } from '../components/retroui/common/LoadingSpinner';
import { toast } from 'sonner';
import { ArrowLeft, Ticket } from 'lucide-react';
import { ethers } from 'ethers';

export const CreateLotteryPage = () => {
  const navigate = useNavigate();
  const { account, signer, isCorrectNetwork } = useWalletContext();
  const { createLottery } = useContract(signer);

  const [formData, setFormData] = useState({
    ticketPrice: '0.01',
    durationMinutes: '60',
    maxTickets: '0',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const price = parseFloat(formData.ticketPrice);
    const duration = parseInt(formData.durationMinutes);
    const maxTickets = parseInt(formData.maxTickets);

    if (isNaN(price) || price <= 0) {
      toast.error('Ticket price must be greater than 0');
      return false;
    }

    if (price < 0.001) {
      toast.error('Minimum ticket price is 0.001 ETH');
      return false;
    }

    if (isNaN(duration) || duration < 1) {
      toast.error('Duration must be at least 1 minute');
      return false;
    }

    if (isNaN(maxTickets) || maxTickets < 0) {
      toast.error('Max tickets must be 0 (unlimited) or a positive number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('Please switch to Sepolia network');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading('Creating lottery...');

    try {
      const ticketPriceWei = ethers.parseEther(formData.ticketPrice);
      const duration = parseInt(formData.durationMinutes);
      const maxTickets = parseInt(formData.maxTickets);

      console.log('📝 Creating lottery with:', {
        ticketPrice: formData.ticketPrice + ' ETH',
        duration: duration + ' minutes',
        maxTickets: maxTickets === 0 ? 'unlimited' : maxTickets
      });

      const { lotteryId } = await createLottery(
        ticketPriceWei,
        duration,
        maxTickets
      );

      toast.success(`Lottery created successfully! ID: ${lotteryId}`, { id: toastId });

      setTimeout(() => {
        navigate(`/lottery/${lotteryId}`);
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to create lottery:', error);

      let errorMessage = 'Failed to create lottery';

      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: toastId });
      setIsCreating(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please connect your wallet to create a lottery</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 -ml-2"
          size="sm"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Ticket size={20} className="text-primary" />
              </div>
              <div>
                <CardTitle>Create New Lottery</CardTitle>
                <CardDescription>
                  Set up an encrypted lottery with customizable parameters
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ticket Price */}
              <div className="space-y-2">
                <label htmlFor="ticketPrice" className="text-sm font-medium">
                  Ticket Price (ETH) *
                </label>
                <Input
                  id="ticketPrice"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.01"
                  value={formData.ticketPrice}
                  onChange={(e) => handleChange('ticketPrice', e.target.value)}
                  disabled={isCreating}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Price per ticket in ETH (minimum 0.001 ETH)
                </p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium">
                  Duration (Minutes) *
                </label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  placeholder="60"
                  value={formData.durationMinutes}
                  onChange={(e) => handleChange('durationMinutes', e.target.value)}
                  disabled={isCreating}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  How long the lottery will run (minimum 1 minute)
                </p>
              </div>

              {/* Max Tickets */}
              <div className="space-y-2">
                <label htmlFor="maxTickets" className="text-sm font-medium">
                  Maximum Tickets (Optional)
                </label>
                <Input
                  id="maxTickets"
                  type="number"
                  min="0"
                  placeholder="0 (unlimited)"
                  value={formData.maxTickets}
                  onChange={(e) => handleChange('maxTickets', e.target.value)}
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for unlimited tickets, or specify a maximum number
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="bg-accent p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">How It Works</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• All ticket numbers are encrypted using FHEVM</li>
                  <li>• No one can see the numbers until after the draw</li>
                  <li>• Winning number is generated on-chain after lottery ends</li>
                  <li>• Winners are identified using homomorphic operations</li>
                  <li>• Prize pool is split equally among all winners</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isCreating || !isCorrectNetwork}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <LoadingSpinner size={16} className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Lottery'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={isCreating}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </div>

              {!isCorrectNetwork && (
                <p className="text-sm text-destructive text-center">
                  Please switch to Sepolia network to create a lottery
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {formData.ticketPrice && formData.durationMinutes && (
          <Card className="mt-6 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket Price:</span>
                <span className="font-medium">{formData.ticketPrice} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">
                  {formData.durationMinutes} minute{parseInt(formData.durationMinutes) !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Tickets:</span>
                <span className="font-medium">
                  {formData.maxTickets === '0' ? 'Unlimited' : formData.maxTickets}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};