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
exports.createKeypairs = createKeypairs;
exports.loadKeypairs = loadKeypairs;
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const path_1 = __importDefault(require("path"));
const bs58_1 = __importDefault(require("bs58"));
const prompt = (0, prompt_sync_1.default)();
const keypairsDir = path_1.default.join(__dirname, 'keypairs');
const keyInfoPath = path_1.default.join(__dirname, 'keyInfo.json');
// Ensure the keypairs directory exists
if (!fs.existsSync(keypairsDir)) {
    fs.mkdirSync(keypairsDir, { recursive: true });
}
function generateWallets(numOfWallets) {
    let wallets = [];
    for (let i = 0; i < numOfWallets; i++) {
        const wallet = web3_js_1.Keypair.generate();
        wallets.push(wallet);
    }
    return wallets;
}
function saveKeypairToFile(keypair, index) {
    const keypairPath = path_1.default.join(keypairsDir, `keypair${index + 1}.json`);
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
}
function readKeypairs() {
    const files = fs.readdirSync(keypairsDir);
    return files.map(file => {
        const filePath = path_1.default.join(keypairsDir, file);
        const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return web3_js_1.Keypair.fromSecretKey(new Uint8Array(secretKey));
    });
}
function updatePoolInfo(wallets) {
    let poolInfo = {}; // Use the defined type here
    // Check if poolInfo.json exists and read its content
    if (fs.existsSync(keyInfoPath)) {
        const data = fs.readFileSync(keyInfoPath, 'utf8');
        poolInfo = JSON.parse(data);
    }
    // Update wallet-related information
    poolInfo.numOfWallets = wallets.length;
    wallets.forEach((wallet, index) => {
        poolInfo[`pubkey${index + 1}`] = wallet.publicKey.toString();
    });
    // Write updated data back to poolInfo.json
    fs.writeFileSync(keyInfoPath, JSON.stringify(poolInfo, null, 2));
}
function createKeypairs() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('WARNING: If you create new ones, ensure you don\'t have SOL, OR ELSE IT WILL BE GONE.');
        const action = prompt('Do you want to (c)reate new wallets or (u)se existing ones? (c/u): ');
        let wallets = [];
        if (action === 'c') {
            const numOfWallets = 24; // Hardcode 24 buyer keypairs here.
            if (isNaN(numOfWallets) || numOfWallets <= 0) {
                console.log('Invalid number. Please enter a positive integer.');
                return;
            }
            wallets = generateWallets(numOfWallets);
            wallets.forEach((wallet, index) => {
                saveKeypairToFile(wallet, index);
                console.log(`Wallet ${index + 1} Public Key: ${wallet.publicKey.toString()}`);
            });
        }
        else if (action === 'u') {
            wallets = readKeypairs();
            wallets.forEach((wallet, index) => {
                console.log(`Read Wallet ${index + 1} Public Key: ${wallet.publicKey.toString()}`);
                console.log(`Read Wallet ${index + 1} Private Key: ${bs58_1.default.encode(wallet.secretKey)}\n`);
            });
        }
        else {
            console.log('Invalid option. Please enter "c" for create or "u" for use existing.');
            return;
        }
        updatePoolInfo(wallets);
        console.log(`${wallets.length} wallets have been processed.`);
    });
}
function loadKeypairs() {
    // Define a regular expression to match filenames like 'keypair1.json', 'keypair2.json', etc.
    const keypairRegex = /^keypair\d+\.json$/;
    return fs.readdirSync(keypairsDir)
        .filter(file => keypairRegex.test(file)) // Use the regex to test each filename
        .map(file => {
        const filePath = path_1.default.join(keypairsDir, file);
        const secretKeyString = fs.readFileSync(filePath, { encoding: 'utf8' });
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        return web3_js_1.Keypair.fromSecretKey(secretKey);
    });
}
