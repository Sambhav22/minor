const express = require("express");
const bodyParser = require("body-parser");
const Blockchain = require("../blockchain");
const P2pServer = require("./p2p-server");
const Wallet = require("../wallet");
const TransactionPool = require("../wallet/transaction-pool");
const Miner = require("./miner");
const path = require("path");
const HTTP_PORT = process.env.HTTP_PORT || 3001;

const app = express();
const bc = new Blockchain();
const transactionPool = new TransactionPool();

const wallet = new Wallet({ bc });

const p2pServer = new P2pServer(bc, transactionPool);
const miner = new Miner(bc, transactionPool, wallet, p2pServer);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("/blocks", (req, res) => {
  res.json(bc.chain);
});

app.post("/mine", (req, res) => {
  const block = bc.addBlock(req.body.data);
  console.log(`New block added: ${block.toString()}`);

  p2pServer.syncChains();

  res.redirect("/blocks");
});

app.get("/transactions", (req, res) => {
  res.json(transactionPool.transactions);
});

app.post("/transact", (req, res) => {
  const { recipient, amount } = req.body;
  const transaction = wallet.createTransaction(
    recipient,
    amount,
    bc,
    transactionPool
  );
  p2pServer.broadcastTransaction(transaction);
  res.redirect("/transactions");
});

app.get("/mine-transactions", (req, res) => {
  const block = miner.mine();
  console.log(`New block added: ${block.toString()}`);
  res.redirect("/blocks");
});
app.get("/api/wallet-info", (req, res) => {
  const address = wallet.publicKey;
  res.json({
    address,
    balance: Wallet.calculateBalance({ chain: Blockchain.chain, address })
  });
});
app.get("/public-key", (req, res) => {
  res.json({ publicKey: wallet.publicKey });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

app.listen(HTTP_PORT, () => console.log(`Listening on port ${HTTP_PORT}`));
p2pServer.listen();
