import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, sendAndConfirmTransaction, clusterApiUrl } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import axios from 'axios';
import bs58 from 'bs58';
import { API_URLS } from '@raydium-io/raydium-sdk-v2'
// Set up constants
export class RaydiumTrader {
    constructor(walletSecretKey, rpcUrl = clusterApiUrl('mainnet-beta')) {
        // Load wallet and initialize connection
        this.owner = Keypair.fromSecretKey(bs58.decode(walletSecretKey));
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    // Helper to get a quote from Raydium API
    async getQuote(outputMint, amount, slippage = 0.5, swapMode = 'swap-base-in') {
        let url = `${API_URLS.SWAP_HOST}/compute/${swapMode}?inputMint=${NATIVE_MINT.toBase58()}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 100}&txVersion=V0`;
        // url = 'https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=So11111111111111111111111111111111111111112&outputMint=H7dmoe1zwv8w5kWudmm6D28vStzYzLDgBeJG6652pump&amount=60000&slippageBps=50&txVersion=V0'
        const { data: quoteData } = await axios.get(url);
        return quoteData;
    }

    // Helper to get a priority fee from Raydium API
    async getPriorityFee() {
        const { data } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);
        return String(data.data.default.h); // Using 'high' priority as an example
    }

    // Helper to create a transaction
    async createSwapTransaction(outputMint, inputAmount) {
        // Get quote data
        const quoteData = await this.getQuote(outputMint, inputAmount);

        // Fetch priority fee
        const priorityFee = await this.getPriorityFee();

        // Create transaction data to send to Raydium API
        const swapTransactionData = {
            computeUnitPriceMicroLamports: priorityFee,
            swapResponse: quoteData,
            txVersion: 'V0', // Versioned transaction
            wallet: this.owner.publicKey.toBase58(),
            wrapSol: true,   // Wrap SOL for input
            unwrapSol: true, // Unwrap wSOL for output
        };

        // Get serialized transaction from Raydium API
        const { data: swapTransactions } = await axios.post(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, swapTransactionData);

        // Deserialize the transactions
        const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
        return allTxBuf.map((txBuf) => VersionedTransaction.deserialize(txBuf));
    }

    // Sign and send the transactions
    async executeSwap(outputMint, inputAmount) {
        try {
            const transactions = await this.createSwapTransaction(outputMint, inputAmount);

            for (const tx of transactions) {
                tx.sign([this.owner]);
                const txId = await this.connection.sendTransaction(tx, { skipPreflight: true });
                const { lastValidBlockHeight, blockhash } = await this.connection.getLatestBlockhash({ commitment: 'finalized' });

                await this.connection.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight,
                    signature: txId,
                }, 'confirmed');

                console.log(`Transaction confirmed: ${txId}`);
            }
        } catch (error) {
            console.error("Error executing swap:", error);
        }
    }
}

export default RaydiumTrader;
// Execute the swap
// raydiumTrader.executeSwap(outputMint, inputAmount);
