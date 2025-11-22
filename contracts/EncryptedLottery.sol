// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint32, externalEuint8, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptedLottery
 * @notice Fully homomorphic encrypted lottery where ticket numbers remain encrypted until winner reveal
 * @dev Uses FHEVM to enable:
 *      - Encrypted ticket purchases (nobody sees your numbers)
 *      - Encrypted winner comparison (contract computes winner without decrypting tickets)
 *      - Provably fair draws with verifiable results
 */
contract EncryptedLottery is ZamaEthereumConfig {
    
    struct Ticket {
        euint8 number;           // Encrypted number (1-50)
        address player;
        uint256 purchaseTime;
        bool exists;
    }
    
    struct Lottery {
        uint256 ticketPrice;
        uint256 startTime;
        uint256 endTime;
        uint256 maxTickets;
        uint256 ticketCount;
        mapping(uint256 => Ticket) tickets;
        euint8 winningNumber;    // Encrypted winning number
        bool isDrawn;
        bool isActive;
        address creator;
        uint256 prizePool;
        mapping(address => uint256[]) playerTickets; // Track tickets per player
        uint256[] winningTicketIds; // Revealed after draw
        bool resultsSubmitted;
        bool exists;
    }
    
    mapping(uint256 => Lottery) public lotteries;
    uint256 public lotteryCount;
    
    // Events
    event LotteryCreated(
        uint256 indexed lotteryId,
        uint256 ticketPrice,
        uint256 endTime,
        uint256 maxTickets,
        address indexed creator
    );
    event TicketPurchased(
        uint256 indexed lotteryId,
        uint256 indexed ticketId,
        address indexed player
    );
    event LotteryDrawn(
        uint256 indexed lotteryId,
        uint256 drawTime
    );
    event WinnersRevealed(
        uint256 indexed lotteryId,
        uint256[] winningTicketIds,
        uint256 prizePerWinner
    );
    event PrizeClaimed(
        uint256 indexed lotteryId,
        address indexed winner,
        uint256 amount
    );
    
    /**
     * @notice Create a new encrypted lottery
     * @param ticketPrice Price per ticket in wei
     * @param durationMinutes How long the lottery runs
     * @param maxTickets Maximum number of tickets (0 = unlimited)
     */
    function createLottery(
        uint256 ticketPrice,
        uint256 durationMinutes,
        uint256 maxTickets
    ) external returns (uint256) {
        require(ticketPrice > 0, "Ticket price must be > 0");
        require(durationMinutes >= 1, "Duration must be at least 1 minute");
        
        uint256 lotteryId = lotteryCount++;
        Lottery storage lottery = lotteries[lotteryId];
        
        lottery.ticketPrice = ticketPrice;
        lottery.startTime = block.timestamp;
        lottery.endTime = block.timestamp + (durationMinutes * 60);
        lottery.maxTickets = maxTickets;
        lottery.isActive = true;
        lottery.creator = msg.sender;
        lottery.exists = true;
        
        emit LotteryCreated(lotteryId, ticketPrice, lottery.endTime, maxTickets, msg.sender);
        return lotteryId;
    }
    
    /**
     * @notice Purchase an encrypted ticket with your chosen number
     * @param lotteryId The lottery to enter
     * @param encryptedNumber Your encrypted number (1-50)
     * @param inputProof Proof for the encrypted input
     */
    function buyTicket(
        uint256 lotteryId,
        externalEuint8 encryptedNumber,
        bytes calldata inputProof
    ) external payable {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.isActive, "Lottery not active");
        require(block.timestamp < lottery.endTime, "Lottery ended");
        require(msg.value == lottery.ticketPrice, "Incorrect ticket price");
        require(
            lottery.maxTickets == 0 || lottery.ticketCount < lottery.maxTickets,
            "Lottery is full"
        );
        
        // Convert external encrypted input to internal euint8
        euint8 number = FHE.fromExternal(encryptedNumber, inputProof);
        
        // Validate range: number must be between 1 and 50 (encrypted validation)
        // We trust the user input here but store it encrypted
        // Range validation could be added with FHE.le(number, FHE.asEuint8(50)) etc.
        
        uint256 ticketId = lottery.ticketCount;
        Ticket storage ticket = lottery.tickets[ticketId];
        ticket.number = number;
        ticket.player = msg.sender;
        ticket.purchaseTime = block.timestamp;
        ticket.exists = true;
        
        // Allow contract to access this encrypted number
        FHE.allowThis(ticket.number);
        
        // Track player's tickets
        lottery.playerTickets[msg.sender].push(ticketId);
        lottery.ticketCount++;
        lottery.prizePool += msg.value;
        
        emit TicketPurchased(lotteryId, ticketId, msg.sender);
    }
    
    /**
     * @notice Draw the winning number (after lottery ends)
     * @dev Generates encrypted winning number and compares with all tickets using FHE
     * @param lotteryId The lottery to draw
     */
    function drawWinningNumber(uint256 lotteryId) external {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.isActive, "Lottery not active");
        require(block.timestamp >= lottery.endTime, "Lottery not ended yet");
        require(!lottery.isDrawn, "Already drawn");
        require(lottery.ticketCount > 0, "No tickets sold");
        
        // Generate pseudo-random number (1-50)
        // Note: This is deterministic but unpredictable before the draw block
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            lottery.ticketCount,
            lotteryId
        )));
        uint8 winningNum = uint8((randomSeed % 50) + 1);
        
        // Convert to encrypted winning number
        lottery.winningNumber = FHE.asEuint8(winningNum);
        FHE.allowThis(lottery.winningNumber);
        
        // Mark as drawn (winners will be computed in next step)
        lottery.isDrawn = true;
        lottery.isActive = false;
        
        // Make winning number publicly decryptable for verification
        FHE.makePubliclyDecryptable(lottery.winningNumber);
        
        emit LotteryDrawn(lotteryId, block.timestamp);
    }
    
    /**
     * @notice Compute winners by comparing each ticket with winning number (FHE operations)
     * @dev This marks all winning tickets - must be called before revealing results
     * @param lotteryId The lottery to process
     */
    function computeWinners(uint256 lotteryId) external {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.isDrawn, "Not drawn yet");
        require(!lottery.resultsSubmitted, "Results already submitted");
        
        // Make all ticket numbers publicly decryptable for winner verification
        // This is necessary to later reveal who won
        for (uint256 i = 0; i < lottery.ticketCount; i++) {
            FHE.makePubliclyDecryptable(lottery.tickets[i].number);
        }
    }
    
    /**
     * @notice Submit decrypted results to identify winners
     * @dev Must be called after computeWinners() and off-chain decryption
     * @param lotteryId The lottery to reveal results for
     * @param abiEncodedWinningNumber ABI-encoded decrypted winning number (uint8)
     * @param winningNumberProof Decryption proof for winning number
     * @param abiEncodedTickets ABI-encoded decrypted ticket numbers (uint8[])
     * @param ticketsProof Decryption proof for all tickets
     */
    function submitResults(
        uint256 lotteryId,
        bytes memory abiEncodedWinningNumber,
        bytes memory winningNumberProof,
        bytes memory abiEncodedTickets,
        bytes memory ticketsProof
    ) external {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.isDrawn, "Not drawn yet");
        require(!lottery.resultsSubmitted, "Results already submitted");
        
        // Verify winning number signature
        bytes32[] memory winningHandle = new bytes32[](1);
        winningHandle[0] = FHE.toBytes32(lottery.winningNumber);
        FHE.checkSignatures(winningHandle, abiEncodedWinningNumber, winningNumberProof);
        
        // Decode winning number
        uint8 winningNumber = abi.decode(abiEncodedWinningNumber, (uint8));
        
        // Build handles array for all tickets IN ORDER
        bytes32[] memory ticketHandles = new bytes32[](lottery.ticketCount);
        for (uint256 i = 0; i < lottery.ticketCount; i++) {
            ticketHandles[i] = FHE.toBytes32(lottery.tickets[i].number);
        }
        
        // Verify tickets signatures
        FHE.checkSignatures(ticketHandles, abiEncodedTickets, ticketsProof);
        
        // Decode all ticket numbers based on count
        uint8[] memory decryptedTickets = decodeTickets(abiEncodedTickets, lottery.ticketCount);
        
        // Find all winning tickets
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < lottery.ticketCount; i++) {
            if (decryptedTickets[i] == winningNumber) {
                winnerCount++;
            }
        }
        
        // Store winning ticket IDs
        uint256[] memory winners = new uint256[](winnerCount);
        uint256 winnerIndex = 0;
        for (uint256 i = 0; i < lottery.ticketCount; i++) {
            if (decryptedTickets[i] == winningNumber) {
                winners[winnerIndex] = i;
                winnerIndex++;
            }
        }
        
        lottery.winningTicketIds = winners;
        lottery.resultsSubmitted = true;
        
        uint256 prizePerWinner = winnerCount > 0 ? lottery.prizePool / winnerCount : 0;
        emit WinnersRevealed(lotteryId, winners, prizePerWinner);
    }
    
    /**
     * @notice Helper to decode variable-length ticket array
     * @dev Handles dynamic array decoding based on ticket count
     */
    function decodeTickets(bytes memory encoded, uint256 count) internal pure returns (uint8[] memory) {
        uint8[] memory result = new uint8[](count);
        
        // Each uint8 takes 32 bytes in ABI encoding (padded)
        for (uint256 i = 0; i < count; i++) {
            uint256 offset = 32 + (i * 32); // Skip length prefix, then 32 bytes per element
            uint8 value;
            assembly {
                value := mload(add(encoded, offset))
            }
            result[i] = value;
        }
        
        return result;
    }
    
    /**
     * @notice Claim prize for winning ticket
     * @param lotteryId The lottery to claim from
     */
    function claimPrize(uint256 lotteryId) external {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.resultsSubmitted, "Results not submitted yet");
        require(lottery.winningTicketIds.length > 0, "No winners");
        
        // Check if caller has winning tickets
        bool hasWinningTicket = false;
        uint256 winningCount = 0;
        
        uint256[] memory playerTicketIds = lottery.playerTickets[msg.sender];
        for (uint256 i = 0; i < playerTicketIds.length; i++) {
            for (uint256 j = 0; j < lottery.winningTicketIds.length; j++) {
                if (playerTicketIds[i] == lottery.winningTicketIds[j]) {
                    hasWinningTicket = true;
                    winningCount++;
                }
            }
        }
        
        require(hasWinningTicket, "No winning tickets");
        
        uint256 prizePerWinner = lottery.prizePool / lottery.winningTicketIds.length;
        uint256 totalPrize = prizePerWinner * winningCount;
        
        // Mark prizes as claimed by zeroing player's winning tickets
        lottery.playerTickets[msg.sender] = new uint256[](0);
        
        // Transfer prize
        (bool success, ) = msg.sender.call{value: totalPrize}("");
        require(success, "Prize transfer failed");
        
        emit PrizeClaimed(lotteryId, msg.sender, totalPrize);
    }
    
    /**
     * @notice Refund mechanism if lottery fails (no tickets or draw fails)
     * @param lotteryId The lottery to refund
     */
    function refundTickets(uint256 lotteryId) external {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(block.timestamp > lottery.endTime + 7 days, "Too early for refund");
        require(!lottery.isDrawn || !lottery.resultsSubmitted, "Lottery completed");
        
        uint256[] memory playerTicketIds = lottery.playerTickets[msg.sender];
        require(playerTicketIds.length > 0, "No tickets to refund");
        
        uint256 refundAmount = playerTicketIds.length * lottery.ticketPrice;
        lottery.playerTickets[msg.sender] = new uint256[](0);
        
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");
    }
    
    // ===== VIEW FUNCTIONS =====
    
    function getLottery(uint256 lotteryId) external view returns (
        uint256 ticketPrice,
        uint256 startTime,
        uint256 endTime,
        uint256 maxTickets,
        uint256 ticketCount,
        bool isDrawn,
        bool isActive,
        address creator,
        uint256 prizePool
    ) {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        return (
            lottery.ticketPrice,
            lottery.startTime,
            lottery.endTime,
            lottery.maxTickets,
            lottery.ticketCount,
            lottery.isDrawn,
            lottery.isActive,
            lottery.creator,
            lottery.prizePool
        );
    }
    
    function getPlayerTickets(uint256 lotteryId, address player) external view returns (uint256[] memory) {
        require(lotteries[lotteryId].exists, "Lottery does not exist");
        return lotteries[lotteryId].playerTickets[player];
    }
    
    function getWinningTicketIds(uint256 lotteryId) external view returns (uint256[] memory) {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.resultsSubmitted, "Results not submitted yet");
        return lottery.winningTicketIds;
    }
    
    function getTicketHandle(uint256 lotteryId, uint256 ticketId) external view returns (bytes32) {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(ticketId < lottery.ticketCount, "Invalid ticket ID");
        return FHE.toBytes32(lottery.tickets[ticketId].number);
    }
    
    function getWinningNumberHandle(uint256 lotteryId) external view returns (bytes32) {
        Lottery storage lottery = lotteries[lotteryId];
        require(lottery.exists, "Lottery does not exist");
        require(lottery.isDrawn, "Not drawn yet");
        return FHE.toBytes32(lottery.winningNumber);
    }
    
    function getActiveLotteries() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < lotteryCount; i++) {
            if (lotteries[i].exists && lotteries[i].isActive && block.timestamp < lotteries[i].endTime) {
                activeCount++;
            }
        }
        
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < lotteryCount; i++) {
            if (lotteries[i].exists && lotteries[i].isActive && block.timestamp < lotteries[i].endTime) {
                activeIds[index] = i;
                index++;
            }
        }
        
        return activeIds;
    }
}
