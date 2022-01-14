"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.Server = void 0;
require("cross-fetch/polyfill");
const express_1 = __importDefault(require("express"));
const bodyParser = __importStar(require("body-parser"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const config_1 = __importDefault(require("./config"));
const yamljs_1 = __importDefault(require("yamljs"));
const format_res_1 = require("./util/format-res");
const routes_1 = require("./routes");
const swaggerDoc = yamljs_1.default.load('./openapi.yaml');
class Server {
    constructor() {
        this.config = new config_1.default();
        this.app = (0, express_1.default)();
        this.controllers = [];
    }
    // Registers all middleware and routers the app uses
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setupDocs();
            this.app.use(bodyParser.json());
            this.app.use(bodyParser.urlencoded({ extended: true }));
            this.app.get('/ping', (req, res, next) => {
                res.send('Pong');
            });
            const versionRouter = express_1.default.Router();
            const supplyController = new routes_1.SupplyController(this.config.opCfg);
            yield supplyController.init();
            versionRouter.use('/supply', supplyController.apiRouter);
            this.controllers.push(supplyController);
            const priceController = new routes_1.PriceController(this.config.opCfg);
            yield priceController.init();
            versionRouter.use('/price', priceController.apiRouter);
            this.controllers.push(priceController);
            const nftController = new routes_1.NFTController();
            yield nftController.init();
            versionRouter.use('/nft', nftController.apiRouter);
            this.controllers.push(nftController);
            const pairController = new routes_1.PairController(this.config., priceController);
            yield pairController.init();
            versionRouter.use('/pairs', pairController.apiRouter);
            this.controllers.push(pairController);
            const poolController = new routes_1.PoolController(this.config.opCfg, priceController);
            yield poolController.init();
            versionRouter.use('/pools', poolController.apiRouter);
            this.controllers.push(poolController);
            const bankerController = new routes_1.BankerController(this.config.opCfg, priceController);
            yield bankerController.init();
            versionRouter.use('/markets', bankerController.apiRouter);
            this.controllers.push(bankerController);
            const metricsController = new routes_1.MetricsController(this.config.opCfg, priceController);
            yield metricsController.init();
            versionRouter.use('/metrics', metricsController.apiRouter);
            this.controllers.push(metricsController);
            const stakeController = new routes_1.StakeController(this.config.opCfg, metricsController, priceController);
            yield stakeController.init();
            versionRouter.use('/staking', stakeController.apiRouter);
            this.controllers.push(stakeController);
            versionRouter.use((err, req, res, next) => {
                res.status(500).send((0, format_res_1.formatRes)(null, {
                    errorCode: 500,
                    errorMessage: err.toString(),
                    errorTrace: err.stack,
                }));
            });
            this.app.use(this.config.config.version, versionRouter);
        });
    }
    // Starts the server
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.httpServer = this.app.listen(this.config.config.port, () => {
                console.log('Listening on port ', this.config.config.port);
            });
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.httpServer) {
                return;
            }
            yield Promise.all(this.controllers.map((controller) => controller.close()));
            this.httpServer.close((err) => {
                if (err)
                    throw new Error(`Error closing server: ${err.stack}`);
            });
        });
    }
    setupDocs() {
        return __awaiter(this, void 0, void 0, function* () {
            this.app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDoc));
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map