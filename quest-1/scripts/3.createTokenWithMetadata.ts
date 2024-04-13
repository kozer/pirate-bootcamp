/**
 * Demonstrates how to create a SPL token and store it's metadata on chain (using the Metaplex MetaData program)
 */

// import custom helpers for demos
import { payer, testWallet, connection } from "@/lib/vars";

import {
  explorerURL,
  extractSignatureFromFailedTransaction,
  printConsoleSeparator,
  savePublicKeyToFile,
} from "@/lib/helpers";

import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction } from "@solana/spl-token";

import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";

(async () => {
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  console.log("Payer address:", payer.publicKey.toBase58());
  console.log("Test wallet address:", testWallet.publicKey.toBase58());

  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  // generate a new keypair to be used for our mint
  const mintKeypair = Keypair.generate();
  console.log("Mint Keypair Address:", mintKeypair.publicKey.toBase58());

  const tokenConfig = {
    // define the number of decimals the token should have
    decimals: 2,
    //define the token's name
    name: "Seven Seas Gold",
    //define the token's symbol
    symbol: "GOLD",
    //define the token's uri
    uri: "https://thisisnot.arealurl/gold.json",
  };

  // Build 2 instructions to create the token.
  // - standard "create account" to allocate space for the token
  // - initialize the token mint
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    // Tokens are owned by the token program
    programId: TOKEN_PROGRAM_ID,
  });

  //Initialize that account as a mint
  const initializeMintIx = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    tokenConfig.decimals,
    payer.publicKey,
    payer.publicKey,
  );
  /**
   * Alternatively, you could also use the helper function from the
   * `@solana/spl-token` sdk to create and initialize the token's mint
   * ---
   * NOTE: this method is normally efficient since the payer would need to
   * sign and pay for multiple transactions to perform all the actions. It
   * would also require more "round trips" to the blockchain as well.
   * But this option is available, should it fit your use case :)
	 *
			const mint = await createMint(
				connection,
				payer,
				// Mint authority
				payer.publicKey,
				//Feeze authority
				payer.publicKey,
				tokenConfig.decimals,
				mintKeypair,
			);
   */

  // Build the instruction to store the token's metadata in the blockchain
  // - derive the PDA for the metadata account
  // - create the instruction with the actual metadata in it

  // derive the PDA
  const metadataAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    METADATA_PROGRAM_ID,
  )[0];

  const createMetadataIx = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataAccount,
      mint: mintKeypair.publicKey,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          creators: null,
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
          uri: tokenConfig.uri,
          sellerFeeBasisPoints: 0,
          collection: null,
          uses: null,
        },
        //`collectionDetails` - for non nft type tokens, normally set to null to not have a value set
        collectionDetails: null,
        // should the metadata be updatable?
        isMutable: true,
      },
    },
  );

  // Get blockhash
  const blockhash = await connection.getRecentBlockhash().then(res => res.blockhash);
  // Create the transaction message
  const vMessage = new TransactionMessage({
    payerKey: payer.publicKey,
    instructions: [createMintAccountIx, initializeMintIx, createMetadataIx],
    recentBlockhash: blockhash,
  }).compileToV0Message();

  // Create tx
  const tx = new VersionedTransaction(vMessage);

  // Sign it
  tx.sign([payer, mintKeypair]);
  printConsoleSeparator();

  try {
    const sig = await connection.sendTransaction(tx);
    // print the explorer url
    console.log("Transaction completed.");
    console.log(explorerURL({ txSignature: sig }));

    // locally save our addresses for the demo
    savePublicKeyToFile("tokenMint", mintKeypair.publicKey);
  } catch (err) {
    console.error("Failed to send transaction:");
    console.log(tx);

    // attempt to extract the signature from the failed transaction
    const failedSig = await extractSignatureFromFailedTransaction(connection, err);
    if (failedSig) console.log("Failed signature:", explorerURL({ txSignature: failedSig }));
    throw err;
  }
})();
