import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../retroui/Card';
import { Button } from '../retroui/Button';
import { Badge } from '../retroui/Badge';
import { Trophy, Ticket, Users } from 'lucide-react';

/**
 * Lottery Results Display Component
 */
export const LotteryResults = ({ 
  lottery, 
  isCreator, 
  onDecrypt, 
  onClaimPrize,
  purchaseEvents,
  isDecrypting,
  winningTicketIds,
  playerTickets,
  playerHasWinningTicket
}) => {
  const hasResults = winningTicketIds && winningTicketIds.length > 0;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Trophy size={20} />
          Lottery Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ticket Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ticket size={16} />
              <span>Total Tickets Sold</span>
            </div>
            <p className="text-2xl font-bold">{lottery.ticketCount}</p>
          </div>

          {hasResults && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy size={16} />
                <span>Winning Tickets</span>
              </div>
              <p className="text-2xl font-bold">{winningTicketIds.length}</p>
            </div>
          )}
        </div>

        {/* Participant List */}
        {purchaseEvents && purchaseEvents.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} />
              <h4 className="font-medium text-sm">Participants ({purchaseEvents.length})</h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {purchaseEvents.map((event, index) => {
                const ticketId = Number(event.args[1]);
                const player = event.args[2];
                const isWinning = winningTicketIds.includes(ticketId);

                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 rounded bg-accent/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Ticket size={14} className="text-muted-foreground" />
                      <span className="font-mono text-xs">
                        {player.slice(0, 6)}...{player.slice(-4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ticket #{ticketId}</span>
                      {isWinning && (
                        <Badge variant="default" className="text-xs">
                          Winner
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Display */}
        {hasResults && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Trophy size={16} />
              Results
            </h4>
            
            <div className="bg-accent p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Winning Ticket IDs</p>
              <div className="flex flex-wrap gap-2">
                {winningTicketIds.map((ticketId) => (
                  <Badge key={ticketId} variant="default" className="font-mono">
                    #{ticketId}
                  </Badge>
                ))}
              </div>
            </div>

            {playerTickets.length > 0 && (
              <div className="bg-accent/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Your Tickets</p>
                <div className="flex flex-wrap gap-2">
                  {playerTickets.map((ticketId) => {
                    const isWinner = winningTicketIds.includes(ticketId);
                    return (
                      <Badge 
                        key={ticketId} 
                        variant={isWinner ? 'default' : 'outline'}
                        className="font-mono"
                      >
                        #{ticketId}
                        {isWinner && ' 🏆'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {playerHasWinningTicket && (
              <Button onClick={onClaimPrize} className="w-full" variant="default">
                Claim Prize
              </Button>
            )}
          </div>
        )}

        {/* Decryption Button for Creator */}
        {isCreator && lottery.isDrawn && !hasResults && lottery.ticketCount > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Decrypt the lottery results to reveal winners
            </p>
            <Button 
              onClick={onDecrypt} 
              disabled={isDecrypting}
              className="w-full"
            >
              {isDecrypting ? 'Decrypting...' : 'Decrypt & Reveal Winners'}
            </Button>
          </div>
        )}

        {/* No Tickets Message */}
        {lottery.ticketCount === 0 && !lottery.isActive && (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket size={48} className="mx-auto mb-2 opacity-50" />
            <p>No tickets were sold for this lottery</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};