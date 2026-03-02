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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPL_ACCOUNT_LAYOUT = exports.SPL_MINT_LAYOUT = void 0;
exports.derivePoolKeys = derivePoolKeys;
exports.PoolKeysCorrector = PoolKeysCorrector;
const spl = __importStar(require("@solana/spl-token"));
const openbook_1 = require("@openbook-dex/openbook");
const web3_js_1 = require("@solana/web3.js");
const buffer_layout_1 = require("@solana/buffer-layout");
const buffer_layout_utils_1 = require("@solana/buffer-layout-utils");
const config_1 = require("../../config");
const openbookProgram = new web3_js_1.PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX');
function getMarketInfo(marketId) {
    return __awaiter(this, void 0, void 0, function* () {
        let reqs = 0;
        let marketInfo = yield config_1.connection.getAccountInfo(marketId);
        reqs++;
        while (!marketInfo) {
            marketInfo = yield config_1.connection.getAccountInfo(marketId);
            reqs++;
            if (marketInfo) {
                break;
            }
            else if (reqs > 20) {
                console.log(`Could not get market info..`);
                return null;
            }
        }
        return marketInfo;
    });
}
function getDecodedData(marketInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        return openbook_1.Market.getLayout(openbookProgram).decode(marketInfo.data);
    });
}
function getMintData(mint) {
    return __awaiter(this, void 0, void 0, function* () {
        return config_1.connection.getAccountInfo(mint);
    });
}
function getDecimals(mintData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!mintData)
            throw new Error('No mint data!');
        return exports.SPL_MINT_LAYOUT.decode(mintData.data).decimals;
    });
}
function getOwnerAta(mint, publicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const foundAta = web3_js_1.PublicKey.findProgramAddressSync([publicKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl.ASSOCIATED_TOKEN_PROGRAM_ID)[0];
        return foundAta;
    });
}
function getVaultSigner(marketId, marketDeco) {
    const seeds = [marketId.toBuffer()];
    const seedsWithNonce = seeds.concat(Buffer.from([Number(marketDeco.vaultSignerNonce.toString())]), Buffer.alloc(7));
    return web3_js_1.PublicKey.createProgramAddressSync(seedsWithNonce, openbookProgram);
}
function derivePoolKeys(marketId) {
    return __awaiter(this, void 0, void 0, function* () {
        const marketInfo = yield getMarketInfo(marketId);
        if (!marketInfo)
            return null;
        const marketDeco = yield getDecodedData(marketInfo);
        const { baseMint } = marketDeco;
        const baseMintData = yield getMintData(baseMint);
        const baseDecimals = yield getDecimals(baseMintData);
        const ownerBaseAta = yield getOwnerAta(baseMint, config_1.wallet.publicKey);
        const { quoteMint } = marketDeco;
        const quoteMintData = yield getMintData(quoteMint);
        const quoteDecimals = yield getDecimals(quoteMintData);
        const ownerQuoteAta = yield getOwnerAta(quoteMint, config_1.wallet.publicKey);
        const authority = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])], config_1.RayLiqPoolv4)[0];
        const marketAuthority = getVaultSigner(marketId, marketDeco);
        // get/derive all the pool keys
        const poolKeys = {
            keg: new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            version: 4,
            marketVersion: 3,
            programId: config_1.RayLiqPoolv4,
            baseMint,
            quoteMint,
            ownerBaseAta,
            ownerQuoteAta,
            baseDecimals,
            quoteDecimals,
            lpDecimals: baseDecimals,
            authority,
            marketAuthority,
            marketProgramId: openbookProgram,
            marketId,
            marketBids: marketDeco.bids,
            marketAsks: marketDeco.asks,
            marketQuoteVault: marketDeco.quoteVault,
            marketBaseVault: marketDeco.baseVault,
            marketEventQueue: marketDeco.eventQueue,
            id: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            baseVault: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('coin_vault_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            coinVault: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            lpMint: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('lp_mint_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            lpVault: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('temp_lp_token_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            targetOrders: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('target_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            withdrawQueue: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('withdraw_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            openOrders: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('open_order_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            quoteVault: web3_js_1.PublicKey.findProgramAddressSync([config_1.RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')], config_1.RayLiqPoolv4)[0],
            lookupTableAccount: new web3_js_1.PublicKey('11111111111111111111111111111111')
        };
        return poolKeys;
    });
}
function PoolKeysCorrector(poolkeys) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        return {
            id: poolkeys.id.toString(),
            baseMint: poolkeys.baseMint.toString(),
            quoteMint: poolkeys.quoteMint.toString(),
            lpMint: poolkeys.lpMint.toString(),
            baseDecimals: poolkeys.baseDecimals,
            quoteDecimals: poolkeys.quoteDecimals,
            lpDecimals: poolkeys.lpDecimals,
            version: 4,
            programId: ((_a = poolkeys.programId) === null || _a === void 0 ? void 0 : _a.toString()) || config_1.RayLiqPoolv4.toString(),
            authority: poolkeys.authority.toString(),
            openOrders: poolkeys.openOrders.toString(),
            targetOrders: poolkeys.targetOrders.toString(),
            baseVault: poolkeys.baseVault.toString(),
            quoteVault: poolkeys.quoteVault.toString(),
            withdrawQueue: ((_b = poolkeys.withdrawQueue) === null || _b === void 0 ? void 0 : _b.toString()) || '',
            lpVault: ((_c = poolkeys.lpVault) === null || _c === void 0 ? void 0 : _c.toString()) || '',
            marketVersion: 3,
            marketProgramId: poolkeys.marketProgramId.toString(),
            marketId: poolkeys.marketId.toString(),
            marketAuthority: poolkeys.marketAuthority.toString(),
            marketBaseVault: poolkeys.baseVault.toString(),
            marketQuoteVault: poolkeys.quoteVault.toString(),
            marketBids: poolkeys.marketBids.toString(),
            marketAsks: poolkeys.marketAsks.toString(),
            marketEventQueue: poolkeys.marketEventQueue.toString(),
            lookupTableAccount: web3_js_1.PublicKey.default.toString()
        };
    });
}
exports.SPL_MINT_LAYOUT = (0, buffer_layout_1.struct)([
    (0, buffer_layout_1.u32)('mintAuthorityOption'),
    (0, buffer_layout_utils_1.publicKey)('mintAuthority'),
    (0, buffer_layout_utils_1.u64)('supply'),
    (0, buffer_layout_1.u8)('decimals'),
    (0, buffer_layout_1.u8)('isInitialized'),
    (0, buffer_layout_1.u32)('freezeAuthorityOption'),
    (0, buffer_layout_utils_1.publicKey)('freezeAuthority')
]);
exports.SPL_ACCOUNT_LAYOUT = (0, buffer_layout_1.struct)([
    (0, buffer_layout_utils_1.publicKey)('mint'),
    (0, buffer_layout_utils_1.publicKey)('owner'),
    (0, buffer_layout_utils_1.u64)('amount'),
    (0, buffer_layout_1.u32)('delegateOption'),
    (0, buffer_layout_utils_1.publicKey)('delegate'),
    (0, buffer_layout_1.u8)('state'),
    (0, buffer_layout_1.u32)('isNativeOption'),
    (0, buffer_layout_utils_1.u64)('isNative'),
    (0, buffer_layout_utils_1.u64)('delegatedAmount'),
    (0, buffer_layout_1.u32)('closeAuthorityOption'),
    (0, buffer_layout_utils_1.publicKey)('closeAuthority')
]);
