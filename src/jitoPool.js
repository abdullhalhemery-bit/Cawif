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
exports.buyBundle = buyBundle;
exports.sendBundle = sendBundle;
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
const config_2 = require("./clients/config");
const bn_js_1 = __importDefault(require("bn.js"));
const axios_1 = __importDefault(require("axios"));
const anchor = __importStar(require("@coral-xyz/anchor"));
const prompt = (0, prompt_sync_1.default)();
const keyInfoPath = path_1.default.join(__dirname, "keyInfo.json");
function buyBundle() {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = new anchor.AnchorProvider(new anchor.web3.Connection(config_1.rpc), new anchor.Wallet(config_1.wallet), { commitment: "confirmed" });
        // Initialize pumpfun anchor
        const IDL_PumpFun = JSON.parse(fs_1.default.readFileSync("./pumpfun-IDL.json", "utf-8"));
        const program = new anchor.Program(IDL_PumpFun, config_1.PUMP_PROGRAM, provider);
        // Start create bundle
        const bundledTxns = [];
        const keypairs = (0, createKeys_1.loadKeypairs)();
        let keyInfo = {};
        if (fs_1.default.existsSync(keyInfoPath)) {
            const existingData = fs_1.default.readFileSync(keyInfoPath, "utf-8");
            keyInfo = JSON.parse(existingData);
        }
        const lut = new web3_js_1.PublicKey(keyInfo.addressLUT.toString());
        const lookupTableAccount = (yield config_1.connection.getAddressLookupTable(lut)).value;
        if (lookupTableAccount == null) {
            console.log("Lookup table account not found!");
            process.exit(0);
        }
        // -------- step 1: ask nessesary questions for pool build --------
        const name = prompt("Name of your token: ");
        const symbol = prompt("Symbol of your token: ");
        const description = prompt("Description of your token: ");
        const twitter = prompt("Twitter of your token: ");
        const telegram = prompt("Telegram of your token: ");
        const website = prompt("Website of your token: ");
        const tipAmt = +prompt("Jito tip in SOL: ") * web3_js_1.LAMPORTS_PER_SOL;
        // -------- step 2: build pool init + dev snipe --------
        const files = yield fs_1.default.promises.readdir("./img");
        if (files.length == 0) {
            console.log("No image found in the img folder");
            return;
        }
        if (files.length > 1) {
            console.log("Multiple images found in the img folder, please only keep one image");
            return;
        }
        const data = fs_1.default.readFileSync(`./img/${files[0]}`);
        let formData = new FormData();
        if (data) {
            formData.append("file", new Blob([data], { type: "image/jpeg" }));
        }
        else {
            console.log("No image found");
            return;
        }
        formData.append("name", name);
        formData.append("symbol", symbol);
        formData.append("description", description);
        formData.append("twitter", twitter);
        formData.append("telegram", telegram);
        formData.append("website", website);
        formData.append("showName", "true");
        let metadata_uri;
        try {
            const response = yield axios_1.default.post("https://pump.fun/api/ipfs", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            metadata_uri = response.data.metadataUri;
            console.log("Metadata URI: ", metadata_uri);
        }
        catch (error) {
            console.error("Error uploading metadata:", error);
        }
        const mintKp = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(bs58_1.default.decode(keyInfo.mintPk)));
        console.log(`Mint: ${mintKp.publicKey.toBase58()}`);
        const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("bonding-curve"), mintKp.publicKey.toBytes()], program.programId);
        const [metadata] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("metadata"), config_1.MPL_TOKEN_METADATA_PROGRAM_ID.toBytes(), mintKp.publicKey.toBytes()], config_1.MPL_TOKEN_METADATA_PROGRAM_ID);
        const account1 = mintKp.publicKey;
        const account2 = config_1.mintAuthority;
        const account3 = bondingCurve;
        const account5 = config_1.global;
        const account6 = config_1.MPL_TOKEN_METADATA_PROGRAM_ID;
        const account7 = metadata;
        const createIx = yield program.methods
            .create(name, symbol, metadata_uri)
            .accounts({
            mint: account1,
            mintAuthority: account2,
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            eventAuthority: config_1.eventAuthority,
            program: config_1.PUMP_PROGRAM,
        })
            .instruction();
        // Get the associated token address
        const ata = spl.getAssociatedTokenAddressSync(mintKp.publicKey, config_1.wallet.publicKey);
        const ataIx = spl.createAssociatedTokenAccountIdempotentInstruction(config_1.wallet.publicKey, ata, config_1.wallet.publicKey, mintKp.publicKey);
        // Extract tokenAmount from keyInfo for this keypair
        const keypairInfo = keyInfo[config_1.wallet.publicKey.toString()];
        if (!keypairInfo) {
            console.log(`No key info found for keypair: ${config_1.wallet.publicKey.toString()}`);
        }
        // Calculate SOL amount based on tokenAmount
        const amount = new bn_js_1.default(keypairInfo.tokenAmount);
        const solAmount = new bn_js_1.default(100000 * keypairInfo.solAmount * web3_js_1.LAMPORTS_PER_SOL);
        const buyIx = yield program.methods
            .buy(amount, solAmount)
            .accounts({
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            eventAuthority: config_1.eventAuthority,
            program: config_1.PUMP_PROGRAM,
        })
            .instruction();
        const tipIxn = web3_js_1.SystemProgram.transfer({
            fromPubkey: config_1.wallet.publicKey,
            toPubkey: (0, config_2.getRandomTipAccount)(),
            lamports: BigInt(tipAmt),
        });
        const initIxs = [createIx, ataIx, buyIx, tipIxn];
        const { blockhash } = yield config_1.connection.getLatestBlockhash();
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: config_1.wallet.publicKey,
            instructions: initIxs,
            recentBlockhash: blockhash,
        }).compileToV0Message();
        const fullTX = new web3_js_1.VersionedTransaction(messageV0);
        fullTX.sign([config_1.wallet, mintKp]);
        bundledTxns.push(fullTX);
        // -------- step 3: create swap txns --------
        const txMainSwaps = yield createWalletSwaps(blockhash, keypairs, lookupTableAccount, bondingCurve, mintKp.publicKey, program);
        bundledTxns.push(...txMainSwaps);
        // -------- step 4: send bundle --------
        /*
            // Simulate each transaction
            for (const tx of bundledTxns) {
                try {
                    const simulationResult = await connection.simulateTransaction(tx, { commitment: "processed" });
                    console.log(simulationResult);
    
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
        yield sendBundle(bundledTxns);
    });
}
function createWalletSwaps(blockhash, keypairs, lut, bondingCurve, associatedBondingCurve, mint, program) {
    return __awaiter(this, void 0, void 0, function* () {
        const txsSigned = [];
        const chunkedKeypairs = chunkArray(keypairs, 6);
        // Load keyInfo data from JSON file
        let keyInfo = {};
        if (fs_1.default.existsSync(keyInfoPath)) {
            const existingData = fs_1.default.readFileSync(keyInfoPath, "utf-8");
            keyInfo = JSON.parse(existingData);
        }
        // Iterate over each chunk of keypairs
        for (let chunkIndex = 0; chunkIndex < chunkedKeypairs.length; chunkIndex++) {
            const chunk = chunkedKeypairs[chunkIndex];
            const instructionsForChunk = [];
            // Iterate over each keypair in the chunk to create swap instructions
            for (let i = 0; i < chunk.length; i++) {
                const keypair = chunk[i];
                console.log(`Processing keypair ${i + 1}/${chunk.length}:`, keypair.publicKey.toString());
                const ataAddress = yield spl.getAssociatedTokenAddress(mint, keypair.publicKey);
                const createTokenAta = spl.createAssociatedTokenAccountIdempotentInstruction(config_1.payer.publicKey, ataAddress, keypair.publicKey, mint);
                // Extract tokenAmount from keyInfo for this keypair
                const keypairInfo = keyInfo[keypair.publicKey.toString()];
                if (!keypairInfo) {
                    console.log(`No key info found for keypair: ${keypair.publicKey.toString()}`);
                    continue;
                }
                // Calculate SOL amount based on tokenAmount
                const amount = new bn_js_1.default(keypairInfo.tokenAmount);
                const solAmount = new bn_js_1.default(100000 * keypairInfo.solAmount * web3_js_1.LAMPORTS_PER_SOL);
                const buyIx = yield program.methods
                    .buy(amount, solAmount)
                    .accounts({
                    systemProgram: web3_js_1.SystemProgram.programId,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    rent: web3_js_1.SYSVAR_RENT_PUBKEY,
                    eventAuthority: config_1.eventAuthority,
                    program: config_1.PUMP_PROGRAM,
                })
                    .instruction();
                instructionsForChunk.push(createTokenAta, buyIx);
            }
            const message = new web3_js_1.TransactionMessage({
                payerKey: keypair.publicKey,
                recentBlockhash: blockhash,
                instructions: instructionsForChunk,
            }).compileToV0Message([lut]);
            const serializedMsg = message.serialize();
            console.log("Txn size:", message.length);
            if (message.length > 1232) {
                console.log("tx too big");
            }
            console.log("Signing transaction with chunk signers", chunk.map((kp) => kp.publicKey.toString()));
            // Sign with the wallet for tip on the last instruction
            for (const kp of chunk) {
                if (kp.publicKey.toString() in keyInfo) {
                    versionedTx.sign([kp]);
                }
            }
            versionedTx.sign([config_1.payer]);
            txsSigned.push(versionedTx);
        }
        return txsSigned;
    });
}
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
        //*/
        var _a;
        try {
            const bundleId = yield jito_1.searcherClient.sendBundle(new types_js_1.Bundle(bundledTxns, bundledTxns.length));
            console.log(`Bundle ${bundleId} sent.`);
            ///*
            // Assuming onBundleResult returns a Promise<BundleResult>
            const result = yield new Promise((resolve, reject) => {
                jito_1.searcherClient.onBundleResult((result) => {
                    console.log("Received bundle result:", result);
                    resolve(result); // Resolve the promise with the result
                }, (e) => {
                    console.error("Error receiving bundle result:", e);
                    reject(e); // Reject the promise if there's an error
                });
            });
            console.log("Result:", result);
            //*/
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
