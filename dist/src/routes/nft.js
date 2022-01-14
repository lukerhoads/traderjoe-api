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
exports.NFTController = void 0;
const express_1 = __importDefault(require("express"));
const util_1 = require("../util");
class NFTController {
    constructor() { }
    init() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        router.get('/hat/:id', (req, res, next) => {
            if (req.params.id) {
                res.send((0, util_1.formatRes)({
                    name: 'Joe Hat NFT',
                }));
            }
            res.send((0, util_1.formatRes)({
                id: req.params.id,
                external_url: 'https://api.traderjoexyz.com/nft/hat/' + req.params.id,
                name: 'Joe Hat NFT #' + req.params.id,
                description: 'Redeemed a real HAT and burned 1 $HAT',
                image: 'https://ipfs.io/ipfs/QmaYPV2VKW5vHtD92m8h9Q4YFiukFx2fBWPAfCWKg6513s',
            }));
        });
        return router;
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
exports.NFTController = NFTController;
//# sourceMappingURL=nft.js.map