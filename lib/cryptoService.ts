/**
 * Cryptocurrency Service
 * Handles Bitcoin and Monero operations including address generation,
 * balance checking, and transaction monitoring
 */

export interface CryptoConfig {
  bitcoin: {
    network: "mainnet" | "testnet";
    rpcUrl: string;
    rpcUser?: string;
    rpcPassword?: string;
    apiKey?: string; // For external APIs like BlockCypher, Mempool.space
  };
  monero: {
    network: "mainnet" | "testnet";
    rpcUrl: string;
    rpcUser?: string;
    rpcPassword?: string;
    walletRpcUrl?: string; // Monero wallet RPC
  };
}

export interface AddressInfo {
  address: string;
  balance: number;
  balanceUSD: number;
  confirmations?: number;
  transactions?: TransactionInfo[];
}

export interface TransactionInfo {
  txHash: string;
  amount: number;
  confirmations: number;
  timestamp: Date;
  fromAddress?: string;
  toAddress: string;
  fee?: number;
  status: "confirmed" | "pending" | "failed";
}

export interface PriceInfo {
  bitcoin: number; // USD price
  monero: number; // USD price
  lastUpdated: Date;
}

export class CryptoService {
  private config: CryptoConfig;
  private priceCache: PriceInfo | null = null;
  private priceCacheExpiry: Date | null = null;
  private network: string;

  constructor(config: CryptoConfig) {
    this.config = config;
    this.network = process.env.CRYPTO_NETWORK || "testnet";
  }

  /**
   * Get current cryptocurrency prices in USD
   */
  async getPrices(): Promise<PriceInfo> {
    // Return cached prices if still valid (5 minutes)
    if (this.priceCache && this.priceCacheExpiry && new Date() < this.priceCacheExpiry) {
      return this.priceCache;
    }

    try {
      // Use CoinGecko API for prices (free tier)
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero&vs_currencies=usd"
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      const data = await response.json();
      
      this.priceCache = {
        bitcoin: data.bitcoin?.usd || 0,
        monero: data.monero?.usd || 0,
        lastUpdated: new Date(),
      };

      // Cache for 5 minutes
      this.priceCacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
      
      return this.priceCache;
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
      
      // Return fallback prices if cache exists
      if (this.priceCache) {
        return this.priceCache;
      }
      
      // Fallback hardcoded prices (should be updated regularly)
      return {
        bitcoin: 65000, // Approximate BTC price
        monero: 150, // Approximate XMR price
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get current cryptocurrency price in USD
   */
  async getCurrentPrice(cryptocurrency: string): Promise<number> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptocurrency}&vs_currencies=usd`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data[cryptocurrency]?.usd || 0;
    } catch (error) {
      console.error(`Error fetching ${cryptocurrency} price:`, error);
      // Return fallback prices
      return cryptocurrency === "bitcoin" ? 45000 : 150;
    }
  }

  /**
   * Convert USD amount to cryptocurrency amount
   */
  async convertUSDToCrypto(usdAmount: number, crypto: "bitcoin" | "monero"): Promise<number> {
    const prices = await this.getPrices();
    const price = crypto === "bitcoin" ? prices.bitcoin : prices.monero;
    
    if (price <= 0) {
      throw new Error(`Invalid price for ${crypto}`);
    }
    
    return usdAmount / price;
  }

  /**
   * Convert cryptocurrency amount to USD
   */
  async convertCryptoToUSD(cryptoAmount: number, crypto: "bitcoin" | "monero"): Promise<number> {
    const prices = await this.getPrices();
    const price = crypto === "bitcoin" ? prices.bitcoin : prices.monero;
    
    return cryptoAmount * price;
  }

  /**
   * Generate a new receiving address
   */
  async generateAddress(crypto: "bitcoin" | "monero"): Promise<string> {
    if (crypto === "bitcoin") {
      return this.generateBitcoinAddress();
    } else {
      return this.generateMoneroAddress();
    }
  }

  /**
   * Generate Bitcoin address
   */
  private async generateBitcoinAddress(): Promise<string> {
    try {
      // For production, you would use a proper Bitcoin library like bitcoinjs-lib
      // or connect to your Bitcoin node/wallet
      
      // Example using a simple approach (replace with actual implementation)
      const response = await this.bitcoinRPC("getnewaddress", ["payment", "bech32"]);
      return response.result as string;
    } catch (error) {
      console.error("Error generating Bitcoin address:", error);
      
      // Fallback: return a hardcoded address for testing
      // In production, this should never happen
      return "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
    }
  }

  /**
   * Generate Monero address
   */
  private async generateMoneroAddress(): Promise<string> {
    try {
      // Connect to Monero wallet RPC
      const response = await this.moneroWalletRPC("create_address", {
        account_index: 0,
        label: `Payment-${Date.now()}`,
      });
      
      return (response.result as { address: string }).address;
    } catch (error) {
      console.error("Error generating Monero address:", error);
      
      // Fallback: return a hardcoded address for testing
      return "4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRJ5zA4L5zjnP2B7uVT6LFgWGmjSzrRqFVb7p24wGC";
    }
  }

  /**
   * Get address information including balance and transactions
   */
  async getAddressInfo(address: string, crypto: "bitcoin" | "monero"): Promise<AddressInfo> {
    if (crypto === "bitcoin") {
      return this.getBitcoinAddressInfo(address);
    } else {
      return this.getMoneroAddressInfo(address);
    }
  }

  /**
   * Get Bitcoin address information
   */
  private async getBitcoinAddressInfo(address: string): Promise<AddressInfo> {
    try {
      // Using a public API like Mempool.space or BlockCypher
      // In production, you might want to use your own Bitcoin node
      
      const response = await fetch(
        `https://mempool.space/api/address/${address}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch Bitcoin address info");
      }
      
      const data = await response.json();
      const prices = await this.getPrices();
      
      const balanceBTC = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
      const balanceUSD = balanceBTC * prices.bitcoin;
      
      return {
        address,
        balance: balanceBTC,
        balanceUSD,
        transactions: [], // Would fetch detailed transactions if needed
      };
    } catch (error) {
      console.error("Error fetching Bitcoin address info:", error);
      return {
        address,
        balance: 0,
        balanceUSD: 0,
        transactions: [],
      };
    }
  }

  /**
   * Get Monero address information
   */
  private async getMoneroAddressInfo(address: string): Promise<AddressInfo> {
    try {
      // Monero is privacy-focused, so public APIs are limited
      // You would typically need to check your own wallet
      
      const response = await this.moneroWalletRPC("get_balance", {
        account_index: 0,
        address_indices: [0], // Adjust based on your address indexing
      });
      
      const prices = await this.getPrices();
      const balanceXMR = (response.result as { balance: number }).balance / 1000000000000; // Convert from atomic units
      const balanceUSD = balanceXMR * prices.monero;
      
      return {
        address,
        balance: balanceXMR,
        balanceUSD,
        transactions: [], // Would fetch from wallet if needed
      };
    } catch (error) {
      console.error("Error fetching Monero address info:", error);
      return {
        address,
        balance: 0,
        balanceUSD: 0,
        transactions: [],
      };
    }
  }

  /**
   * Monitor address for incoming transactions
   */
  async monitorAddress(
    address: string, 
    crypto: "bitcoin" | "monero",
    expectedAmount: number,
    _callback: (transaction: TransactionInfo) => void
  ): Promise<void> {
    // Implementation would depend on your monitoring strategy
    // Could use webhooks, polling, or blockchain event listeners
    
    console.log(`Monitoring ${crypto} address ${address} for ${expectedAmount} ${crypto.toUpperCase()}`);
    
    // For now, just log - implement actual monitoring based on your needs
    // This could involve:
    // 1. Setting up webhooks with blockchain services
    // 2. Periodic polling of address balances
    // 3. WebSocket connections to real-time blockchain APIs
  }

  /**
   * Validate cryptocurrency address format
   */
  validateAddress(address: string, crypto: "bitcoin" | "monero"): boolean {
    if (crypto === "bitcoin") {
      return this.validateBitcoinAddress(address);
    } else {
      return this.validateMoneroAddress(address);
    }
  }

  /**
   * Validate Bitcoin address format
   */
  private validateBitcoinAddress(address: string): boolean {
    // Basic validation - in production use a proper Bitcoin library
    const btcRegex = /^(bc1|[13]|tb1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    return btcRegex.test(address);
  }

  /**
   * Validate Monero address format
   */
  private validateMoneroAddress(address: string): boolean {
    // Basic validation for Monero addresses
    const xmrRegex = /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/;
    return xmrRegex.test(address);
  }

  /**
   * Create payment URL/QR code data
   */
  createPaymentURL(address: string, amount: number, crypto: "bitcoin" | "monero"): string {
    if (crypto === "bitcoin") {
      return `bitcoin:${address}?amount=${amount}`;
    } else {
      return `monero:${address}?tx_amount=${amount}`;
    }
  }

  /**
   * Check transaction status on the blockchain
   */
  async checkTransactionStatus(
    cryptocurrency: string,
    transactionId: string,
    address: string
  ): Promise<{
    status: string;
    confirmations: number;
    amount?: number;
    blockHeight?: number;
  }> {
    try {
      if (cryptocurrency === "bitcoin") {
        return await this.checkBitcoinTransaction(transactionId, address);
      } else if (cryptocurrency === "monero") {
        return await this.checkMoneroTransaction(transactionId, address);
      } else {
        throw new Error(`Unsupported cryptocurrency: ${cryptocurrency}`);
      }
    } catch (error) {
      console.error(`Error checking transaction status for ${cryptocurrency}:`, error);
      return {
        status: "unknown",
        confirmations: 0,
      };
    }
  }

  private async checkBitcoinTransaction(
    transactionId: string,
    address: string
  ): Promise<{
    status: string;
    confirmations: number;
    amount?: number;
    blockHeight?: number;
  }> {
    try {
      // Use a Bitcoin blockchain API (e.g., BlockCypher, Blockchair)
      const response = await fetch(
        `https://api.blockcypher.com/v1/btc/${this.network === "mainnet" ? "main" : "test3"}/txs/${transactionId}`,
        { next: { revalidate: 60 } }
      );
      
      if (!response.ok) {
        throw new Error(`Bitcoin API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        status: data.confirmations > 0 ? "confirmed" : "pending",
        confirmations: data.confirmations || 0,
        amount: data.outputs?.find((output: { addresses?: string[]; value?: number }) => 
          output.addresses?.includes(address)
        )?.value / 100000000, // Convert satoshis to BTC
        blockHeight: data.block_height,
      };
    } catch (error) {
      console.error("Error checking Bitcoin transaction:", error);
      return {
        status: "unknown",
        confirmations: 0,
      };
    }
  }

  private async checkMoneroTransaction(
    transactionId: string,
    _address: string
  ): Promise<{
    status: string;
    confirmations: number;
    amount?: number;
    blockHeight?: number;
  }> {
    try {
      // For Monero, you would typically use monero-wallet-rpc
      // This is a simplified implementation
      const response = await fetch(`${this.getMoneroRpcUrl()}/json_rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "0",
          method: "get_transfer_by_txid",
          params: { txid: transactionId },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Monero RPC error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Monero RPC error: ${data.error.message}`);
      }
      
      const transfer = data.result?.transfer;
      const currentHeight = await this.getMoneroBlockHeight();
      const confirmations = transfer?.height 
        ? Math.max(0, currentHeight - transfer.height + 1)
        : 0;
      
      return {
        status: confirmations >= 10 ? "confirmed" : "pending",
        confirmations,
        amount: transfer?.amount ? transfer.amount / 1000000000000 : undefined, // Convert piconero to XMR
        blockHeight: transfer?.height,
      };
    } catch (error) {
      console.error("Error checking Monero transaction:", error);
      return {
        status: "unknown",
        confirmations: 0,
      };
    }
  }

  private async getMoneroBlockHeight(): Promise<number> {
    try {
      const response = await fetch(`${this.getMoneroRpcUrl()}/json_rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "0",
          method: "get_height",
        }),
      });
      
      const data = await response.json();
      return data.result?.height || 0;
    } catch (error) {
      console.error("Error getting Monero block height:", error);
      return 0;
    }
  }

  /**
   * Bitcoin RPC call
   */
  private async bitcoinRPC(method: string, params: unknown[] = []): Promise<{
    result?: unknown;
    error?: { message: string; code: number };
    id: number;
  }> {
    const { bitcoin } = this.config;
    
    try {
      const response = await fetch(bitcoin.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${bitcoin.rpcUser}:${bitcoin.rpcPassword}`).toString("base64")}`,
        },
        body: JSON.stringify({
          jsonrpc: "1.0",
          id: Date.now(),
          method,
          params,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error("Bitcoin RPC error:", error);
      throw error;
    }
  }

  /**
   * Get Monero RPC URL
   */
  private getMoneroRpcUrl(): string {
    return this.config.monero.rpcUrl;
  }

  /**
   * Monero wallet RPC call
   */
  private async moneroWalletRPC(method: string, params: Record<string, unknown> = {}): Promise<{
    result?: unknown;
    error?: { message: string; code: number };
    id: number;
  }> {
    const { monero } = this.config;
    
    try {
      const response = await fetch(monero.walletRpcUrl || monero.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error("Monero RPC error:", error);
      throw error;
    }
  }
}

// Singleton instance
let cryptoService: CryptoService | null = null;

export function getCryptoService(): CryptoService {
  if (!cryptoService) {
    const config: CryptoConfig = {
      bitcoin: {
        network: (process.env.CRYPTO_NETWORK as "mainnet" | "testnet") || "testnet",
        rpcUrl: process.env.BITCOIN_RPC_URL || "http://localhost:8332",
        rpcUser: process.env.BITCOIN_RPC_USER,
        rpcPassword: process.env.BITCOIN_RPC_PASSWORD,
        apiKey: process.env.BITCOIN_API_KEY,
      },
      monero: {
        network: (process.env.CRYPTO_NETWORK as "mainnet" | "testnet") || "testnet",
        rpcUrl: process.env.MONERO_RPC_URL || "http://localhost:18081",
        rpcUser: process.env.MONERO_RPC_USER,
        rpcPassword: process.env.MONERO_RPC_PASSWORD,
        walletRpcUrl: process.env.MONERO_WALLET_RPC_URL || "http://localhost:18083",
      },
    };
    
    cryptoService = new CryptoService(config);
  }
  
  return cryptoService;
}