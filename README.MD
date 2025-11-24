# Encrypted Lottery - Privacy-First Blockchain Lottery

A fully encrypted lottery platform where your lucky numbers stay completely private until the draw. Built with FHEVM (Fully Homomorphic Encryption) technology on Ethereum's Sepolia testnet.

## What Makes This Different?

Traditional online lotteries have a trust problem - you either trust a centralized operator, or everything is transparent (meaning everyone can see your numbers). This project solves that with homomorphic encryption:

- **Your numbers are encrypted** when you buy a ticket - nobody can see them, not even the contract owner
- **The draw happens on-chain** - verifiable randomness, no manipulation possible
- **Winners are identified automatically** - using encrypted computation, no manual intervention
- **Prizes are distributed fairly** - smart contract handles everything, split equally among winners

## Tech Stack

**Smart Contracts:**
- Solidity 0.8.24
- FHEVM v0.9 (Zama's Fully Homomorphic Encryption)
- Hardhat for development & testing

**Frontend:**
- React 18 with Vite
- TailwindCSS for styling
- Ethers.js v6 for blockchain interaction
- Sonner for notifications

## Getting Started

### Prerequisites

You'll need:
- Node.js v18 or higher
- MetaMask browser extension
- Some Sepolia testnet ETH (get free from [Sepolia Faucet](https://sepoliafaucet.com))

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd encrypted-lottery

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Your wallet's private key (for deployment)
PRIVATE_KEY=0x...

# Optional: Custom RPC endpoint
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Contract address (will be filled after deployment)
VITE_CONTRACT_ADDRESS=

# Optional: For contract verification
ETHERSCAN_API_KEY=your_api_key_here
```

**Important:** Never commit your `.env` file! It's already in `.gitignore`.

### Deploy the Smart Contract

```bash
# Compile the contract
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.cjs --network sepolia
```

After deployment, you'll see output like:
```
📍 Contract address: 0xABC123...
```

Copy this address and update:
1. `.env` → `VITE_CONTRACT_ADDRESS=0xABC123...`
2. `src/utils/contract.js` → `const DEPLOYED_CONTRACT_ADDRESS = "0xABC123..."`

### Run the Frontend

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## How It Works

### Creating a Lottery

1. Connect your MetaMask wallet (must be on Sepolia)
2. Click "Create Lottery"
3. Set:
   - **Ticket Price** - how much each ticket costs (in ETH)
   - **Duration** - how long the lottery runs (in minutes)
   - **Max Tickets** - limit number of tickets, or 0 for unlimited
4. Confirm the transaction
5. Share your lottery with participants!

### Buying Tickets

1. Browse active lotteries
2. Click on any lottery to see details
3. Enter your lucky number (1-50)
4. Click "Buy Ticket"
5. Your number gets encrypted locally before being sent to the blockchain
6. Nobody can see your number - not even you after submission!

### Drawing Winners (Creator Only)

After the lottery ends, the creator runs a 3-step process:

1. **Draw Winning Number** - Generates a random winning number on-chain
2. **Compute Winners** - Marks all tickets for decryption
3. **Decrypt Results** - Uses FHEVM to reveal which tickets won

The magic? All of this happens without ever decrypting individual tickets until the final reveal.

### Claiming Prizes

If you won:
1. Go to the lottery details page
2. You'll see your winning ticket(s) highlighted
3. Click "Claim Prize"
4. The smart contract transfers your share of the prize pool directly to your wallet

## Project Structure

```
encrypted-lottery/
├── contracts/               # Smart contracts
│   └── EncryptedLottery.sol
├── scripts/                 # Deployment scripts
│   └── deploy.cjs
├── test/                    # Contract tests
├── src/
│   ├── components/          # React components
│   │   ├── lottery/         # Lottery-specific components
│   │   ├── retroui/         # Reusable UI components
│   │   └── layout/          # Navbar & Footer
│   ├── pages/               # Main pages
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   │   ├── fhevm.js         # FHEVM encryption setup
│   │   ├── decryption.js    # Decryption workflows
│   │   └── contract.js      # Contract instance
│   └── context/             # React context providers
├── hardhat.config.ts        # Hardhat configuration
└── package.json
```

## The Encryption Process

Here's what happens when you buy a ticket:

1. **Client-side encryption**: Your browser encrypts your number using FHEVM
2. **Proof generation**: Creates a cryptographic proof that the encryption is valid
3. **On-chain storage**: Contract stores the encrypted number + proof
4. **Winning number**: Creator generates winning number (also encrypted)
5. **Homomorphic comparison**: Contract compares encrypted numbers without decrypting
6. **Results reveal**: Only after the draw do we decrypt and reveal winners

This means:
- ❌ Nobody can see your number before the draw
- ❌ Numbers can't be changed after submission
- ✅ Everything is verifiable on-chain
- ✅ No trust required in the lottery creator

## Testing

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

## Troubleshooting

### "FHEVM SDK not loaded"
Make sure `index.html` has the FHEVM CDN script:
```html
<script src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"></script>
```

### "Wrong Network"
Switch to Sepolia in MetaMask. If you don't see Sepolia:
1. MetaMask → Settings → Advanced
2. Enable "Show test networks"

### "Insufficient funds"
Get free Sepolia ETH from https://sepoliafaucet.com

### Decryption Fails
Make sure you:
1. Called `drawWinningNumber()` first
2. Then called `computeWinners()`
3. Wait a few seconds between steps
4. Then call decrypt

## Security Considerations

- **Private keys**: Never share or commit your private key
- **Testnet only**: This is deployed on Sepolia testnet - don't use real money
- **Encryption**: FHEVM provides computational privacy, not anonymity
- **Random numbers**: Uses `block.prevrandao` - secure enough for testnet, but consider VRF for mainnet

## Known Limitations

- Sepolia testnet only (mainnet deployment would need audit + VRF)
- FHEVM initialization takes 2-3 seconds on first load
- Gas costs are higher due to encryption operations
- Maximum 50 possible numbers (could be increased)

## Future Improvements

- [ ] Support for multiple winning numbers
- [ ] Automatic lottery scheduling
- [ ] Lottery templates (daily, weekly, etc.)
- [ ] Prize pool contributions from external sources
- [ ] NFT tickets
- [ ] Mobile app

## Contributing

Found a bug? Have a feature idea? Open an issue or submit a pull request!

## Resources

- [Zama FHEVM Documentation](https://docs.zama.ai)
- [Hardhat Docs](https://hardhat.org)
- [Ethers.js v6](https://docs.ethers.org/v6/)
- [Sepolia Faucet](https://sepoliafaucet.com)

## License

MIT License - feel free to use this for learning, building, or inspiration.

## Acknowledgments

Built with FHEVM technology by Zama - making blockchain privacy practical and usable.

---

**Remember:** This is a testnet demo for educational purposes. Never use real funds on testnet contracts!