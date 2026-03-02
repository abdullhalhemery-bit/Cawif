"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sender = sender;
const web3_js_1 = require("@solana/web3.js");
const createKeys_1 = require("./createKeys");
const config_1 = require("../config");
const jito_1 = require("./clients/jito");
const types_js_1 = require("jito-ts/dist/sdk/block-engine/types.js");
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const createLUT_1 = require("./createLUT");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_2 = require("./clients/config");
const bn_js_1 = __importDefault(require("bn.js"));
const prompt = (0, prompt_sync_1.default)();
const keyInfoPath = path_1.default.join(__dirname, "keyInfo.json");
let poolInfo = {};
if (fs_1.default.existsSync(keyInfoPath)) {
    const data = fs_1.default.readFileSync(keyInfoPath, "utf-8");
    poolInfo = JSON.parse(data);
}
function generateSOLTransferForKeypairs(tipAmt_1) {
    return __awaiter(this, arguments, void 0, function* (tipAmt, steps = 24) {
        const keypairs = (0, createKeys_1.loadKeypairs)();
        const ixs = [];
        let existingData = {};
        if (fs_1.default.existsSync(keyInfoPath)) {
            existingData = JSON.parse(fs_1.default.readFileSync(keyInfoPath, "utf-8"));
        }
        // Dev wallet send first
        if (!existingData[config_1.wallet.publicKey.toString()] || !existingData[config_1.wallet.publicKey.toString()].solAmount) {
            console.log(`Missing solAmount for dev wallet, skipping.`);
        }
        const solAmount = parseFloat(existingData[config_1.wallet.publicKey.toString()].solAmount);
        ixs.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: config_1.payer.publicKey,
            toPubkey: config_1.wallet.publicKey,
            lamports: Math.floor((solAmount * 1.015 + 0.0025) * web3_js_1.LAMPORTS_PER_SOL),
        }));
        // Loop through the keypairs and process each one
        for (let i = 0; i < Math.min(steps, keypairs.length); i++) {
            const keypair = keypairs[i];
            const keypairPubkeyStr = keypair.publicKey.toString();
            if (!existingData[keypairPubkeyStr] || !existingData[keypairPubkeyStr].solAmount) {
                console.log(`Missing solAmount for wallet ${i + 1}, skipping.`);
                continue;
            }
            const solAmount = parseFloat(existingData[keypairPubkeyStr].solAmount);
            try {
                ixs.push(web3_js_1.SystemProgram.transfer({
                    fromPubkey: config_1.payer.publicKey,
                    toPubkey: keypair.publicKey,
                    lamports: Math.floor((solAmount * 1.015 + 0.0025) * web3_js_1.LAMPORTS_PER_SOL),
                }));
                console.log(`Sent ${(solAmount * 1.015 + 0.0025).toFixed(3)} SOL to Wallet ${i + 1} (${keypair.publicKey.toString()})`);
            }
            catch (error) {
                console.error(`Error creating transfer instruction for wallet ${i + 1}:`, error);
                continue;
            }
        }
        ixs.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: config_1.payer.publicKey,
            toPubkey: (0, config_2.getRandomTipAccount)(),
            lamports: BigInt(tipAmt),
        }));
        return ixs;
    });
}
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
function createAndSignVersionedTxWithKeypairs(instructionsChunk, blockhash) {
    return __awaiter(this, void 0, void 0, function* () {
        let poolInfo = {};
        if (fs_1.default.existsSync(keyInfoPath)) {
            const data = fs_1.default.readFileSync(keyInfoPath, "utf-8");
            poolInfo = JSON.parse(data);
        }
        const lut = new web3_js_1.PublicKey(poolInfo.addressLUT.toString());
        const lookupTableAccount = (yield config_1.connection.getAddressLookupTable(lut)).value;
        if (lookupTableAccount == null) {
            console.log("Lookup table account not found!");
            process.exit(0);
        }
        const addressesMain = [];
        instructionsChunk.forEach((ixn) => {
            ixn.keys.forEach((key) => {
                addressesMain.push(key.pubkey);
            });
        });
        const message = new web3_js_1.TransactionMessage({
            payerKey: config_1.payer.publicKey,
            recentBlockhash: blockhash,
            instructions: instructionsChunk,
        }).compileToV0Message([lookupTableAccount]);
        const versionedTx = new web3_js_1.VersionedTransaction(message);
        versionedTx.sign([config_1.payer]);
        /*
        // Simulate each txn
        const simulationResult = await connection.simulateTransaction(versionedTx, { commitment: "processed" });
    
        if (simulationResult.value.err) {
        console.log("Simulation error:", simulationResult.value.err);
        } else {
        console.log("Simulation success. Logs:");
        simulationResult.value.logs?.forEach(log => console.log(log));
        }
        */
        return versionedTx;
    });
}
function processInstructionsSOL(ixs, blockhash) {
    return __awaiter(this, void 0, void 0, function* () {
        const txns = [];
        const instructionChunks = chunkArray(ixs, 45);
        for (let i = 0; i < instructionChunks.length; i++) {
            const versionedTx = yield createAndSignVersionedTxWithKeypairs(instructionChunks[i], blockhash);
            txns.push(versionedTx);
        }
        return txns;
    });
}
function sendBundle(txns) {
    return __awaiter(this, void 0, void 0, function* () {
        /*
        // Simulate each transaction
        for (const tx of txns) {
            try {
                const simulationResult = await connection.simulateTransaction(tx, { commitment: "processed" });
    
                if (simulationResult.value.err) {
                    console.error("Simulation error for transaction:", simulationResult.value.err);
                } else {
                    console.log("Simulation success for transaction. Logs:");
                    simulationResult.value.logs?.forEach(log => console.log(log));
                }
            } catch (error) {
                console.error("Error during simulation:", error);
            }
        }
        */
        var _a;
        try {
            const bundleId = yield jito_1.searcherClient.sendBundle(new types_js_1.Bundle(txns, txns.length));
            console.log(`Bundle ${bundleId} sent.`);
        }
        catch (error) {
            const err = error;
            console.error("Error sending bundle:", err.message);
            if ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes("Bundle Dropped, no connected leader up soon")) {
                console.error("Error sending bundle: Bundle Dropped, no connected leader up soon.");
            }
            else {
                console.error("An unexpected error occurred:", err.message);
            }
        }
    });
}
function generateATAandSOL() {
    return __awaiter(this, void 0, void 0, function* () {
        const jitoTipAmt = +prompt("Jito tip in Sol (Ex. 0.01): ") * web3_js_1.LAMPORTS_PER_SOL;
        const { blockhash } = yield config_1.connection.getLatestBlockhash();
        const sendTxns = [];
        const solIxs = yield generateSOLTransferForKeypairs(jitoTipAmt);
        const solTxns = yield processInstructionsSOL(solIxs, blockhash);
        sendTxns.push(...solTxns);
        yield sendBundle(sendTxns);
    });
}
function createReturns() {
    return __awaiter(this, void 0, void 0, function* () {
        const txsSigned = [];
        const keypairs = (0, createKeys_1.loadKeypairs)();
        const chunkedKeypairs = chunkArray(keypairs, 7); // EDIT CHUNKS?
        const jitoTipIn = prompt("Jito tip in Sol (Ex. 0.01): ");
        const TipAmt = parseFloat(jitoTipIn) * web3_js_1.LAMPORTS_PER_SOL;
        const { blockhash } = yield config_1.connection.getLatestBlockhash();
        // Iterate over each chunk of keypairs
        for (let chunkIndex = 0; chunkIndex < chunkedKeypairs.length; chunkIndex++) {
            const chunk = chunkedKeypairs[chunkIndex];
            const instructionsForChunk = [];
            // Iterate over each keypair in the chunk to create swap instructions
            for (let i = 0; i < chunk.length; i++) {
                const keypair = chunk[i];
                console.log(`Processing keypair ${i + 1}/${chunk.length}:`, keypair.publicKey.toString());
                const balance = yield config_1.connection.getBalance(keypair.publicKey);
                const sendSOLixs = web3_js_1.SystemProgram.transfer({
                    fromPubkey: keypair.publicKey,
                    toPubkey: config_1.payer.publicKey,
                    lamports: balance,
                });
                instructionsForChunk.push(sendSOLixs);
            }
            if (chunkIndex === chunkedKeypairs.length - 1) {
                const tipSwapIxn = web3_js_1.SystemProgram.transfer({
                    fromPubkey: config_1.payer.publicKey,
                    toPubkey: (0, config_2.getRandomTipAccount)(),
                    lamports: BigInt(TipAmt),
                });
                instructionsForChunk.push(tipSwapIxn);
                console.log("Jito tip added :).");
            }
            const lut = new web3_js_1.PublicKey(poolInfo.addressLUT.toString());
            const message = new web3_js_1.TransactionMessage({
                payerKey: config_1.payer.publicKey,
                recentBlockhash: blockhash,
                instructions: instructionsForChunk,
            }).compileToV0Message([poolInfo.addressLUT]);
            const versionedTx = new web3_js_1.VersionedTransaction(message);
            const serializedMsg = versionedTx.serialize();
            console.log("Txn size:", serializedMsg.length);
            if (serializedMsg.length > 1232) {
                console.log("tx too big");
            }
            console.log("Signing transaction with chunk signers", chunk.map((kp) => kp.publicKey.toString()));
            versionedTx.sign([config_1.payer]);
            for (const keypair of chunk) {
                versionedTx.sign([keypair]);
            }
            txsSigned.push(versionedTx);
        }
        yield sendBundle(txsSigned);
    });
}
function simulateAndWriteBuys() {
    return __awaiter(this, void 0, void 0, function* () {
        const keypairs = (0, createKeys_1.loadKeypairs)();
        const tokenDecimals = 10 ** 6;
        const tokenTotalSupply = 1000000000 * tokenDecimals;
        let initialRealSolReserves = 0;
        let initialVirtualTokenReserves = 1073000000 * tokenDecimals;
        let initialRealTokenReserves = 793100000 * tokenDecimals;
        let totalTokensBought = 0;
        const buys = [];
        for (let it = 0; it <= 24; it++) {
            let keypair;
            let solInput;
            if (it === 0) {
                solInput = prompt(`Enter the amount of SOL for dev wallet: `);
                solInput = Number(solInput) * 1.21;
                keypair = config_1.wallet;
            }
            else {
                solInput = +prompt(`Enter the amount of SOL for wallet ${it}: `);
                keypair = keypairs[it - 1];
            }
            const solAmount = solInput * web3_js_1.LAMPORTS_PER_SOL;
            if (isNaN(solAmount) || solAmount <= 0) {
                console.log(`Invalid input for wallet ${it}, skipping.`);
                continue;
            }
            const e = new bn_js_1.default(solAmount);
            const initialVirtualSolReserves = 30 * web3_js_1.LAMPORTS_PER_SOL + initialRealSolReserves;
            const a = new bn_js_1.default(initialVirtualSolReserves).mul(new bn_js_1.default(initialVirtualTokenReserves));
            const i = new bn_js_1.default(initialVirtualSolReserves).add(e);
            const l = a.div(i).add(new bn_js_1.default(1));
            let tokensToBuy = new bn_js_1.default(initialVirtualTokenReserves).sub(l);
            tokensToBuy = bn_js_1.default.min(tokensToBuy, new bn_js_1.default(initialRealTokenReserves));
            const tokensBought = tokensToBuy.toNumber();
            const percentSupply = (tokensBought / tokenTotalSupply) * 100;
            console.log(`Wallet ${it}: Bought ${tokensBought / tokenDecimals} tokens for ${e.toNumber() / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            console.log(`Wallet ${it}: Owns ${percentSupply.toFixed(4)}% of total supply\n`);
            buys.push({ pubkey: keypair.publicKey, solAmount: Number(solInput), tokenAmount: tokensToBuy, percentSupply });
            initialRealSolReserves += e.toNumber();
            initialRealTokenReserves -= tokensBought;
            initialVirtualTokenReserves -= tokensBought;
            totalTokensBought += tokensBought;
        }
        console.log("Final real sol reserves: ", initialRealSolReserves / web3_js_1.LAMPORTS_PER_SOL);
        console.log("Final real token reserves: ", initialRealTokenReserves / tokenDecimals);
        console.log("Final virtual token reserves: ", initialVirtualTokenReserves / tokenDecimals);
        console.log("Total tokens bought: ", totalTokensBought / tokenDecimals);
        console.log("Total % of tokens bought: ", (totalTokensBought / tokenTotalSupply) * 100);
        console.log(); // \n
        const confirm = prompt("Do you want to use these buys? (yes/no): ").toLowerCase();
        if (confirm === "yes") {
            writeBuysToFile(buys);
        }
        else {
            console.log("Simulation aborted. Restarting...");
            simulateAndWriteBuys(); // Restart the simulation
        }
    });
}
function writeBuysToFile(buys) {
    let existingData = {};
    if (fs_1.default.existsSync(keyInfoPath)) {
        existingData = JSON.parse(fs_1.default.readFileSync(keyInfoPath, "utf-8"));
    }
    // Convert buys array to an object keyed by public key
    const buysObj = buys.reduce((acc, buy) => {
        acc[buy.pubkey.toString()] = {
            solAmount: buy.solAmount.toString(),
            tokenAmount: buy.tokenAmount.toString(),
            percentSupply: buy.percentSupply,
        };
        return acc;
    }, existingData); // Initialize with existing data
    // Write updated data to file
    fs_1.default.writeFileSync(keyInfoPath, JSON.stringify(buysObj, null, 2), "utf8");
    console.log("Buys have been successfully saved to keyinfo.json");
}
function sender() {
    return __awaiter(this, void 0, void 0, function* () {
        let running = true;
        while (running) {
            console.log("\nBuyer UI:");
            console.log("1. Create LUT");
            console.log("2. Extend LUT Bundle");
            console.log("3. Simulate Buys");
            console.log("4. Send Simulation SOL Bundle");
            console.log("5. Reclaim Buyers Sol");
            const answer = prompt("Choose an option or 'exit': "); // Use prompt-sync for user input
            switch (answer) {
                case "1":
                    yield (0, createLUT_1.createLUT)();
                    break;
                case "2":
                    yield (0, createLUT_1.extendLUT)();
                    break;
                case "3":
                    yield simulateAndWriteBuys();
                    break;
                case "4":
                    yield generateATAandSOL();
                    break;
                case "5":
                    yield createReturns();
                    break;
                case "exit":
                    running = false;
                    break;
                default:
                    console.log("Invalid option, please choose again.");
            }
        }
        console.log("Exiting...");
    });
}
