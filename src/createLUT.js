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
exports.extendLUT = extendLUT;
exports.createLUT = createLUT;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const jito_1 = require("./clients/jito");
const types_js_1 = require("jito-ts/dist/sdk/block-engine/types.js");
const config_2 = require("./clients/config");
const LookupTableProvider_1 = require("./clients/LookupTableProvider");
const createKeys_1 = require("./createKeys");
const spl = __importStar(require("@solana/spl-token"));
const pumpfun_IDL_json_1 = __importDefault(require("../pumpfun-IDL.json"));
const anchor_1 = require("@coral-xyz/anchor");
const bytes_1 = require("@project-serum/anchor/dist/cjs/utils/bytes");
const prompt = (0, prompt_sync_1.default)();
const keyInfoPath = path_1.default.join(__dirname, 'keyInfo.json');
const provider = new anchor_1.AnchorProvider(config_1.connection, config_1.wallet, {});
(0, anchor_1.setProvider)(provider);
const program = new anchor_1.Program(pumpfun_IDL_json_1.default, config_1.PUMP_PROGRAM);
function extendLUT() {
    return __awaiter(this, void 0, void 0, function* () {
        // -------- step 1: ask nessesary questions for LUT build --------
        let vanityPK = null;
        const vanityPrompt = prompt('Do you want to import a custom vanity address? (y/n): ').toLowerCase();
        const jitoTipAmt = +prompt('Jito tip in Sol (Ex. 0.01): ') * web3_js_1.LAMPORTS_PER_SOL;
        if (vanityPrompt === 'y') {
            vanityPK = prompt('Enter the private key of the vanity address (bs58): ');
        }
        // Read existing data from poolInfo.json
        let poolInfo = {};
        if (fs_1.default.existsSync(keyInfoPath)) {
            const data = fs_1.default.readFileSync(keyInfoPath, 'utf-8');
            poolInfo = JSON.parse(data);
        }
        const bundledTxns1 = [];
        // -------- step 2: get all LUT addresses --------
        const accounts = []; // Array with all new keys to push to the new LUT
        const lut = new web3_js_1.PublicKey(poolInfo.addressLUT.toString());
        const lookupTableAccount = (yield config_1.connection.getAddressLookupTable(lut)).value;
        if (lookupTableAccount == null) {
            console.log("Lookup table account not found!");
            process.exit(0);
        }
        // Write mint info to json
        let mintKp;
        if (vanityPK === null) {
            mintKp = web3_js_1.Keypair.generate();
        }
        else {
            mintKp = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(vanityPK));
        }
        console.log(`Mint: ${mintKp.publicKey.toString()}`);
        poolInfo.mint = mintKp.publicKey.toString();
        poolInfo.mintPk = bytes_1.bs58.encode(mintKp.secretKey);
        fs_1.default.writeFileSync(keyInfoPath, JSON.stringify(poolInfo, null, 2));
        // Fetch accounts for LUT
        const mintAuthority = new web3_js_1.PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM");
        const MPL_TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
        const global = new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
        const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("bonding-curve"), mintKp.publicKey.toBytes()], program.programId);
        const [metadata] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            MPL_TOKEN_METADATA_PROGRAM_ID.toBytes(),
            mintKp.publicKey.toBytes(),
        ], MPL_TOKEN_METADATA_PROGRAM_ID);
        let [associatedBondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([
            bondingCurve.toBytes(),
            spl.TOKEN_PROGRAM_ID.toBytes(),
            mintKp.publicKey.toBytes(),
        ], spl.ASSOCIATED_TOKEN_PROGRAM_ID);
        const eventAuthority = new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
        const feeRecipient = new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
        // These values vary based on the new market created
        accounts.push(spl.ASSOCIATED_TOKEN_PROGRAM_ID, spl.TOKEN_PROGRAM_ID, MPL_TOKEN_METADATA_PROGRAM_ID, mintAuthority, global, program.programId, config_1.PUMP_PROGRAM, metadata, associatedBondingCurve, bondingCurve, eventAuthority, web3_js_1.SystemProgram.programId, web3_js_1.SYSVAR_RENT_PUBKEY, mintKp.publicKey, feeRecipient); // DO NOT ADD PROGRAM OR JITO TIP ACCOUNT??
        // Loop through each keypair and push its pubkey and ATAs to the accounts array
        const keypairs = (0, createKeys_1.loadKeypairs)();
        for (const keypair of keypairs) {
            const ataToken = yield spl.getAssociatedTokenAddress(mintKp.publicKey, keypair.publicKey);
            accounts.push(keypair.publicKey, ataToken);
        }
        // Push wallet and payer ATAs and pubkey JUST IN CASE (not sure tbh)
        const ataTokenwall = yield spl.getAssociatedTokenAddress(mintKp.publicKey, config_1.wallet.publicKey);
        const ataTokenpayer = yield spl.getAssociatedTokenAddress(mintKp.publicKey, config_1.payer.publicKey);
        // Add just in case
        accounts.push(config_1.wallet.publicKey, config_1.payer.publicKey, ataTokenwall, ataTokenpayer, lut, spl.NATIVE_MINT);
        // -------- step 5: push LUT addresses to a txn --------
        const extendLUTixs1 = [];
        const extendLUTixs2 = [];
        const extendLUTixs3 = [];
        const extendLUTixs4 = [];
        // Chunk accounts array into groups of 30
        const accountChunks = Array.from({ length: Math.ceil(accounts.length / 30) }, (v, i) => accounts.slice(i * 30, (i + 1) * 30));
        console.log("Num of chunks:", accountChunks.length);
        console.log("Num of accounts:", accounts.length);
        for (let i = 0; i < accountChunks.length; i++) {
            const chunk = accountChunks[i];
            const extendInstruction = web3_js_1.AddressLookupTableProgram.extendLookupTable({
                lookupTable: lut,
                authority: config_1.payer.publicKey,
                payer: config_1.payer.publicKey,
                addresses: chunk,
            });
            if (i == 0) {
                extendLUTixs1.push(extendInstruction);
                console.log("Chunk:", i);
            }
            else if (i == 1) {
                extendLUTixs2.push(extendInstruction);
                console.log("Chunk:", i);
            }
            else if (i == 2) {
                extendLUTixs3.push(extendInstruction);
                console.log("Chunk:", i);
            }
            else if (i == 3) {
                extendLUTixs4.push(extendInstruction);
                console.log("Chunk:", i);
            }
        }
        // Add the jito tip to the last txn
        extendLUTixs4.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: config_1.payer.publicKey,
            toPubkey: (0, config_2.getRandomTipAccount)(),
            lamports: BigInt(jitoTipAmt),
        }));
        // -------- step 6: seperate into 2 different bundles to complete all txns --------
        const { blockhash: block1 } = yield config_1.connection.getLatestBlockhash();
        const extend1 = yield buildTxn(extendLUTixs1, block1, lookupTableAccount);
        const extend2 = yield buildTxn(extendLUTixs2, block1, lookupTableAccount);
        const extend3 = yield buildTxn(extendLUTixs3, block1, lookupTableAccount);
        const extend4 = yield buildTxn(extendLUTixs4, block1, lookupTableAccount);
        bundledTxns1.push(extend1, extend2, extend3, extend4);
        // -------- step 7: send bundle --------
        yield sendBundle(bundledTxns1);
    });
}
function createLUT() {
    return __awaiter(this, void 0, void 0, function* () {
        // -------- step 1: ask nessesary questions for LUT build --------
        const jitoTipAmt = +prompt('Jito tip in Sol (Ex. 0.01): ') * web3_js_1.LAMPORTS_PER_SOL;
        // Read existing data from poolInfo.json
        let poolInfo = {};
        if (fs_1.default.existsSync(keyInfoPath)) {
            const data = fs_1.default.readFileSync(keyInfoPath, 'utf-8');
            poolInfo = JSON.parse(data);
        }
        const bundledTxns = [];
        // -------- step 2: create a new LUT every time there is a new launch --------
        const createLUTixs = [];
        const [create, lut] = web3_js_1.AddressLookupTableProgram.createLookupTable({
            authority: config_1.payer.publicKey,
            payer: config_1.payer.publicKey,
            recentSlot: yield config_1.connection.getSlot("finalized")
        });
        createLUTixs.push(create, web3_js_1.SystemProgram.transfer({
            fromPubkey: config_1.payer.publicKey,
            toPubkey: (0, config_2.getRandomTipAccount)(),
            lamports: jitoTipAmt,
        }));
        const addressesMain = [];
        createLUTixs.forEach((ixn) => {
            ixn.keys.forEach((key) => {
                addressesMain.push(key.pubkey);
            });
        });
        const lookupTablesMain1 = LookupTableProvider_1.lookupTableProvider.computeIdealLookupTablesForAddresses(addressesMain);
        const { blockhash } = yield config_1.connection.getLatestBlockhash();
        const messageMain1 = new web3_js_1.TransactionMessage({
            payerKey: config_1.payer.publicKey,
            recentBlockhash: blockhash,
            instructions: createLUTixs,
        }).compileToV0Message(lookupTablesMain1);
        const createLUT = new web3_js_1.VersionedTransaction(messageMain1);
        // Append new LUT info
        poolInfo.addressLUT = lut.toString(); // Using 'addressLUT' as the field name
        try {
            const serializedMsg = createLUT.serialize();
            console.log('Txn size:', serializedMsg.length);
            if (serializedMsg.length > 1232) {
                console.log('tx too big');
            }
            createLUT.sign([config_1.payer]);
        }
        catch (e) {
            console.log(e, 'error signing createLUT');
            process.exit(0);
        }
        // Write updated content back to poolInfo.json
        fs_1.default.writeFileSync(keyInfoPath, JSON.stringify(poolInfo, null, 2));
        // Push to bundle
        bundledTxns.push(createLUT);
        // -------- step 3: SEND BUNDLE --------
        yield sendBundle(bundledTxns);
    });
}
function buildTxn(extendLUTixs, blockhash, lut) {
    return __awaiter(this, void 0, void 0, function* () {
        const messageMain = new web3_js_1.TransactionMessage({
            payerKey: config_1.payer.publicKey,
            recentBlockhash: blockhash,
            instructions: extendLUTixs,
        }).compileToV0Message([lut]);
        const txn = new web3_js_1.VersionedTransaction(messageMain);
        try {
            const serializedMsg = txn.serialize();
            console.log('Txn size:', serializedMsg.length);
            if (serializedMsg.length > 1232) {
                console.log('tx too big');
            }
            txn.sign([config_1.payer]);
        }
        catch (e) {
            const serializedMsg = txn.serialize();
            console.log('txn size:', serializedMsg.length);
            console.log(e, 'error signing extendLUT');
            process.exit(0);
        }
        return txn;
    });
}
function sendBundle(bundledTxns) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const bundleId = yield jito_1.searcherClient.sendBundle(new types_js_1.Bundle(bundledTxns, bundledTxns.length));
            console.log(`Bundle ${bundleId} sent.`);
        }
        catch (error) {
            const err = error;
            console.error("Error sending bundle:", err.message);
            if ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes('Bundle Dropped, no connected leader up soon')) {
                console.error("Error sending bundle: Bundle Dropped, no connected leader up soon.");
            }
            else {
                console.error("An unexpected error occurred:", err.message);
            }
        }
    });
}
/*
async function createAndSignVersionedTxNOLUT(
    instructionsChunk: TransactionInstruction[],
    blockhash: Blockhash | string,
): Promise<VersionedTransaction> {
    const addressesMain: PublicKey[] = [];
    instructionsChunk.forEach((ixn) => {
        ixn.keys.forEach((key) => {
            addressesMain.push(key.pubkey);
        });
    });

    const lookupTablesMain1 =
        lookupTableProvider.computeIdealLookupTablesForAddresses(addressesMain);

    const message = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: instructionsChunk,
    }).compileToV0Message(lookupTablesMain1);

    const versionedTx = new VersionedTransaction(message);
    const serializedMsg = versionedTx.serialize();

    console.log("Txn size:", serializedMsg.length);
    if (serializedMsg.length > 1232) { console.log('tx too big'); }
    versionedTx.sign([wallet]);

    
    // Simulate each txn
    const simulationResult = await connection.simulateTransaction(versionedTx, { commitment: "processed" });

    if (simulationResult.value.err) {
    console.log("Simulation error:", simulationResult.value.err);
    } else {
    console.log("Simulation success. Logs:");
    simulationResult.value.logs?.forEach(log => console.log(log));
    }
    

    return versionedTx;
}
*/
