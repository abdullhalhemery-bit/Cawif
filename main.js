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
const createKeys_1 = require("./src/createKeys");
const jitoPool_1 = require("./src/jitoPool");
const senderUI_1 = require("./src/senderUI");
const sellFunc_1 = require("./src/sellFunc");
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const sellRay_1 = require("./src/sellRay");
const prompt = (0, prompt_sync_1.default)();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let running = true;
        while (running) {
            console.log("DM me for support");
            console.log("https://t.me/benorizz0");
            console.log("solana-scripts.com");
            console.log("\nMenu:");
            console.log("1. Create Keypairs");
            console.log("2. Pre Launch Checklist");
            console.log("3. Create Pool Bundle");
            console.log("4. Sell % of Supply on Pump.Fun");
            console.log("5. Sell % of Supply on Raydium");
            console.log("Type 'exit' to quit.");
            const answer = prompt("Choose an option or 'exit': "); // Use prompt-sync for user input
            switch (answer) {
                case "1":
                    yield (0, createKeys_1.createKeypairs)();
                    break;
                case "2":
                    yield (0, senderUI_1.sender)();
                    break;
                case "3":
                    yield (0, jitoPool_1.buyBundle)();
                    break;
                case "4":
                    yield (0, sellFunc_1.sellXPercentagePF)();
                    break;
                case "5":
                    yield (0, sellRay_1.sellXPercentageRAY)();
                    break;
                case "exit":
                    running = false;
                    break;
                default:
                    console.log("Invalid option, please choose again.");
            }
        }
        console.log("Exiting...");
        process.exit(0);
    });
}
main().catch((err) => {
    console.error("Error:", err);
});
