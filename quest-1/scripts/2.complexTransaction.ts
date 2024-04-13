/**
 * Introduction to the Solana web3.js
 * Demonstrates how to build a more complex transaction, with multiple instructions
 */

// import custom helpers for demos
import { payer, testWallet, connection, STATIC_PUBLICKEY } from "@/lib/vars";
import { buildTransaction, explorerURL, printConsoleSeparator } from "@/lib/helpers";

import { SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

(async () => {

  console.log("Payer Address", payer.publicKey.toBase58());
  console.log("Test Wallet Address", testWallet.publicKey.toBase58());

  // Create a simple instruction ( using Web3.js  ) to create an account
  const space = 0; // We don't need on-chain space for this example as we dont store any data
  const balanceForRent = await connection.getMinimumBalanceForRentExemption(space);

  const createAccountIx = SystemProgram.createAccount({
    lamports: balanceForRent + 2_000_000,
    fromPubkey: payer.publicKey,
    newAccountPubkey: testWallet.publicKey,
    space,
    programId: SystemProgram.programId,
  });

  const transferToWalletIx = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: testWallet.publicKey,
    lamports: balanceForRent + 100_000,
  });

  const transferBackToPayer = SystemProgram.transfer({
    fromPubkey: testWallet.publicKey,
    toPubkey: payer.publicKey,
    lamports: balanceForRent + 100_000,
  });
  const tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, testWallet],
    instructions: [createAccountIx, transferToWalletIx, transferBackToPayer],
  });
  const sig = await connection.sendTransaction(tx);
	printConsoleSeparator("Transaction Signature");
	console.log(explorerURL({ txSignature: sig }));
})();
