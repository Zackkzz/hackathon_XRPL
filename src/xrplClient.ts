// Import the XRPL library (the bridge to the blockchain)
import { Client } from 'xrpl';

// This is the address of the "Testnet" - the playground where we use fake money
const TESTNET_URL = "wss://s.altnet.rippletest.net:51233";

export class XrplConnection {
  private client: Client;

  constructor() {
    // Initialize the connection tool
    this.client = new Client(TESTNET_URL);
  }

  // This "turns on" the connection
  async connect() {
    if (!this.client.isConnected()) {
      await this.client.connect();
      console.log("[XRPL] Connected to Testnet!");
    }
    return this.client;
  }

  // This "turns off" the connection when we are done
  async disconnect() {
    if (this.client.isConnected()) {
      await this.client.disconnect();
      console.log("[XRPL] Disconnected.");
    }
  }
}
