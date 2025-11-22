import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../retroui/Card';
import { Button } from '../retroui/Button';
import { Badge } from '../retroui/Badge';
import { Clock, Ticket, Trophy } from 'lucide-react';
import { ethers } from 'ethers';

/**
 * Lottery Card - Mobile Responsive
 */
export const LotteryCard = ({ lottery }) => {
  const navigate = useNavigate();
  
  const timeRemaining = () => {
    const now = Date.now() / 1000;
    const end = lottery.endTime;
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const now = Date.now() / 1000;
  const isLotteryExpired = now >= lottery.endTime;
  const isActuallyActive = lottery.isActive && !isLotteryExpired;

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex justify-between items-start gap-3 mb-2">
          <CardTitle className="text-base sm:text-lg md:text-xl flex-1 leading-tight">
            Lottery #{lottery.id}
          </CardTitle>
          <Badge 
            variant={isActuallyActive ? 'default' : 'secondary'}
            className="flex-shrink-0 text-xs"
          >
            {isActuallyActive ? 'Active' : 'Ended'}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm truncate">
          by {lottery.creator.slice(0, 6)}...{lottery.creator.slice(-4)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ticket Price</span>
            <span className="font-medium">{ethers.formatEther(lottery.ticketPrice)} ETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prize Pool</span>
            <span className="font-medium">{ethers.formatEther(lottery.prizePool)} ETH</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Ticket size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
            <span>
              {lottery.ticketCount} ticket{lottery.ticketCount !== 1 ? 's' : ''}
              {lottery.maxTickets > 0 && ` / ${lottery.maxTickets}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
            <span>{timeRemaining()}</span>
          </div>
          {lottery.hasWinners && (
            <div className="flex items-center gap-1">
              <Trophy size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Winners announced</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 sm:p-6 pt-0 mt-auto">
        <Button
          onClick={() => navigate(`/lottery/${lottery.id}`)}
          className="w-full text-sm sm:text-base"
        >
          {lottery.hasWinners
            ? 'View Results' 
            : isActuallyActive 
              ? 'Buy Ticket' 
              : 'View Lottery'}
        </Button>
      </CardFooter>
    </Card>
  );
};