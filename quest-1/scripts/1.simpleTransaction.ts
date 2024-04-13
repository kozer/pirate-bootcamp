/**
 * Introduction to the Solana web3.js package
 * Demonstrating how to build and send simple transactions to the blockchain
 */

// import custom helpers for demos
import { payer, connection } from "@/lib/vars";
import { explorerURL, printConsoleSeparator } from "@/lib/helpers";

//
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

(async () => {
  console.log("Payer Address", payer.publicKey.toBase58());

  const currentBalance = await connection.getBalance(payer.publicKey);
  console.log("Current Balance of 'payer' (in Lamports)", currentBalance);
  console.log("Current Balance of 'payer' (in SOL)", currentBalance / LAMPORTS_PER_SOL);

  if (currentBalance <= LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL * 4);
  }

  const keypair = Keypair.generate();

  console.log("New Keypair generated", keypair.publicKey.toBase58());

  // On chain space to be allocated
  const space = 0;
  const lamports = await connection.getMinimumBalanceForRentExemption(space);

  //Create a simple instruction to create an account

  const createAcccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: keypair.publicKey,
    //lamports stored in this account
    lamports,
    space,
    programId: SystemProgram.programId,
  });

  //Build the transaction to send to the blockchain
  const recentBlockhash = await connection.getRecentBlockhash();

  // Create a message (v0)
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: recentBlockhash.blockhash,
    instructions: [createAcccountIx],
  }).compileToV0Message();

  // Create a vertioned transaction
  const tx = new VersionedTransaction(message);
  console.log("Transaction", tx);
  //sign the transaction with the payer and the new keypair ( all keypairs must sign the transaction )
  tx.sign([payer, keypair]);

  console.log("tx after signing:", tx);
  const sig = await connection.sendTransaction(tx);
  printConsoleSeparator();
  console.log("Transaction Signature:", sig);
  console.log("Explorer URL:", explorerURL({ txSignature: sig }));
})();
