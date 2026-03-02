"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.sellXPercentagePF = sellXPercentagePF;
const config_1 = require("../config");
const web3_js_1 = require("@solana/web3.js");
const createKeys_1 = require("./createKeys");
const jito_1 = require("./clients/jito");
const types_js_1 = require("jito-ts/dist/sdk/block-engine/types.js");
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const spl = __importStar(require("@solana/spl-token"));
const bs58_1 = __importDefault(require("bs58"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const anchor = __importStar(require("@coral-xyz/anchor"));
const crypto_1 = require("crypto");
const config_2 = require("./clients/config");
const bn_js_1 = __importDefault(require("bn.js"));
const prompt = (0, prompt_sync_1.default)();
const keyInfoPath = path_1.default.join(__dirname, "keyInfo.json");
function chunkArray(array, size) {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) => array.slice(i * size, i * size + size));
}
function sendBundle(bundledTxns) {
    return __awaiter(this, void 0, void 0, function* () {
        /*
        // Simulate each transaction
        for (const tx of bundledTxns) {
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
            const bundleId = yield jito_1.searcherClient.sendBundle(new types_js_1.Bundle(bundledTxns, bundledTxns.length));
            console.log(`Bundle ${bundleId} sent.`);
            /*
            // Assuming onBundleResult returns a Promise<BundleResult>
            const result = await new Promise((resolve, reject) => {
                searcherClient.onBundleResult(
                (result) => {
                    console.log('Received bundle result:', result);
                    resolve(result); // Resolve the promise with the result
                },
                (e: Error) => {
                    console.error('Error receiving bundle result:', e);
                    reject(e); // Reject the promise if there's an error
                }
                );
            });
        
            console.log('Result:', result);
            */
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
function sellXPercentagePF() {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = new anchor.AnchorProvider(new anchor.web3.Connection(config_1.rpc), new anchor.Wallet(config_1.wallet), { commitment: "confirmed" });
        // Initialize pumpfun anchor
        const IDL_PumpFun = JSON.parse(fs_1.default.readFileSync("./pumpfun-IDL.json", "utf-8"));
        const pfprogram = new anchor.Program(IDL_PumpFun, config_1.PUMP_PROGRAM, provider);
        // Start selling
        const bundledTxns = [];
        const keypairs = (0, createKeys_1.loadKeypairs)(); // Ensure this function is correctly defined to load your Keypairs
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
        const mintKp = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(bs58_1.default.decode(poolInfo.mintPk)));
        //console.log(`Mint: ${mintKp.publicKey.toBase58()}`);
        const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("bonding-curve"), mintKp.publicKey.toBytes()], pfprogram.programId);
        let [associatedBondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([bondingCurve.toBytes(), spl.TOKEN_PROGRAM_ID.toBytes(), mintKp.publicKey.toBytes()], spl.ASSOCIATED_TOKEN_PROGRAM_ID);
        const supplyPercent = +prompt("Percentage to sell (Ex. 1 for 1%): ") / 100;
        const jitoTipAmt = +prompt("Jito tip in Sol (Ex. 0.01): ") * web3_js_1.LAMPORTS_PER_SOL;
        const mintInfo = yield config_1.connection.getTokenSupply(mintKp.publicKey);
        let sellTotalAmount = 0;
        const chunkedKeypairs = chunkArray(keypairs, 6); // Adjust chunk size as needed
        // start the selling process
        const PayerTokenATA = yield spl.getAssociatedTokenAddress(new web3_js_1.PublicKey(poolInfo.mint), config_1.payer.publicKey);
        const { blockhash } = yield config_1.connection.getLatestBlockhash();
        for (let chunkIndex = 0; chunkIndex < chunkedKeypairs.length; chunkIndex++) {
            const chunk = chunkedKeypairs[chunkIndex];
            const instructionsForChunk = [];
            const isFirstChunk = chunkIndex === 0; // Check if this is the first chunk
            if (isFirstChunk) {
                // Handle the first chunk separately
                const transferAmount = yield getSellBalance(config_1.wallet, new web3_js_1.PublicKey(poolInfo.mint), supplyPercent);
                sellTotalAmount += transferAmount; // Keep track to sell at the end
                console.log(`Sending ${transferAmount / 1e6} from dev wallet.`);
                const ataIx = spl.createAssociatedTokenAccountIdempotentInstruction(config_1.payer.publicKey, PayerTokenATA, config_1.payer.publicKey);
                const TokenATA = yield spl.getAssociatedTokenAddress(new web3_js_1.PublicKey(poolInfo.mint), config_1.wallet.publicKey);
                const transferIx = spl.createTransferInstruction(TokenATA, PayerTokenATA, config_1.wallet.publicKey, transferAmount);
                instructionsForChunk.push(ataIx, transferIx);
            }
            for (let keypair of chunk) {
                const transferAmount = yield getSellBalance(keypair, new web3_js_1.PublicKey(poolInfo.mint), supplyPercent);
                sellTotalAmount += transferAmount; // Keep track to sell at the end
                console.log(`Sending ${transferAmount / 1e6} from ${keypair.publicKey.toString()}.`);
                const TokenATA = yield spl.getAssociatedTokenAddress(new web3_js_1.PublicKey(poolInfo.mint), keypair.publicKey);
                const transferIx = spl.createTransferInstruction(TokenATA, PayerTokenATA, keypair.publicKey, transferAmount);
                instructionsForChunk.push(transferIx);
            }
            if (instructionsForChunk.length > 0) {
                const message = new web3_js_1.TransactionMessage({
                    payerKey: config_1.payer.publicKey,
                    recentBlockhash: blockhash,
                    instructions: instructionsForChunk,
                }).compileToV0Message([lookupTableAccount]);
                const versionedTx = new web3_js_1.VersionedTransaction(message);
                const serializedMsg = versionedTx.serialize();
                console.log("Txn size:", serializedMsg.length);
                if (serializedMsg.length > 1232) {
                    console.log("tx too big");
                }
                versionedTx.sign([config_1.payer]); // Sign with payer first
                for (let keypair of chunk) {
                    versionedTx.sign([keypair]); // Then sign with each keypair in the chunk
                }
                bundledTxns.push(versionedTx);
            }
        }
        const payerNum = (0, crypto_1.randomInt)(0, 24);
        const payerKey = keypairs[payerNum];
        const sellPayerIxs = [];
        console.log(`TOTAL: Selling ${sellTotalAmount / 1e6}.`);
        if (+mintInfo.value.amount * 0.25 <= sellTotalAmount) {
            // protect investors from fraud and prevent illegal use
            console.log("Price impact too high.");
            console.log("Cannot sell more than 25% of supply at a time.");
            return;
        }
        const sellIx = yield pfprogram.methods
            .sell(new bn_js_1.default(sellTotalAmount), new bn_js_1.default(0))
            .accounts({
            global: config_1.global,
            feeRecipient: config_1.feeRecipient,
            mint: new web3_js_1.PublicKey(poolInfo.mint),
            bondingCurve,
            user: config_1.payer.publicKey,
            systemProgram: web3_js_1.SystemProgram.programId,
            associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            program: config_1.PUMP_PROGRAM,
        })
            .instruction();
        sellPayerIxs.push(sellIx, web3_js_1.SystemProgram.transfer({
            fromPubkey: config_1.payer.publicKey,
            toPubkey: (0, config_2.getRandomTipAccount)(),
            lamports: BigInt(jitoTipAmt),
        }));
        const sellMessage = new web3_js_1.TransactionMessage({
            payerKey: payerKey.publicKey,
            recentBlockhash: blockhash,
            instructions: sellPayerIxs,
        }).compileToV0Message([lookupTableAccount]);
        const sellTx = new web3_js_1.VersionedTransaction(sellMessage);
        const serializedMsg = sellTx.serialize();
        console.log("Txn size:", serializedMsg.length);
        if (serializedMsg.length > 1232) {
            console.log("tx too big");
        }
        sellTx.sign([config_1.payer, payerKey]);
        bundledTxns.push(sellTx);
        yield sendBundle(bundledTxns);
        return;
    });
}
function getSellBalance(keypair, mint, supplyPercent) {
    return __awaiter(this, void 0, void 0, function* () {
        let amount;
        try {
            const tokenAccountPubKey = spl.getAssociatedTokenAddressSync(mint, keypair.publicKey);
            const balance = yield config_1.connection.getTokenAccountBalance(tokenAccountPubKey);
            amount = Math.floor(Number(balance.value.amount) * supplyPercent);
        }
        catch (e) {
            amount = 0;
        }
        return amount;
    });
}
