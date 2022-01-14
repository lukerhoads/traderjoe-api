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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOneYearBlock = exports.getOneMonthBlock = exports.getOneWeekBlock = exports.getOneDayBlock = exports.getOneHourBlock = exports.getBlocks = void 0;
const core_1 = require("@apollo/client/core");
const date_fns_1 = require("date-fns");
const block_1 = require("../queries/block");
const client = new core_1.ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/dasconnor/avalanche-blocks',
    cache: new core_1.InMemoryCache(),
});
const getBlocks = (period) => __awaiter(void 0, void 0, void 0, function* () {
    let blocks;
    switch (period) {
        case '1h':
            blocks = yield (0, exports.getOneHourBlock)();
            return blocks;
        case '1d':
            blocks = yield (0, exports.getOneDayBlock)();
            return blocks;
        case '1w':
            blocks = yield (0, exports.getOneWeekBlock)();
            return blocks;
        case '1m':
            blocks = yield (0, exports.getOneMonthBlock)();
            return blocks;
        case '1y':
            blocks = yield (0, exports.getOneYearBlock)();
            return blocks;
    }
});
exports.getBlocks = getBlocks;
const getOneHourBlock = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = (0, date_fns_1.startOfMinute)((0, date_fns_1.subHours)(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;
    const data = yield queryBlocklytics(start, end);
    return data.blocks;
});
exports.getOneHourBlock = getOneHourBlock;
const getOneDayBlock = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = (0, date_fns_1.startOfMinute)((0, date_fns_1.subDays)(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;
    const data = yield queryBlocklytics(start, end);
    return data.blocks;
});
exports.getOneDayBlock = getOneDayBlock;
const getOneWeekBlock = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = (0, date_fns_1.startOfMinute)((0, date_fns_1.subWeeks)(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;
    const data = yield queryBlocklytics(start, end);
    return data.blocks;
});
exports.getOneWeekBlock = getOneWeekBlock;
const getOneMonthBlock = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = (0, date_fns_1.startOfMinute)((0, date_fns_1.subMonths)(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;
    const data = yield queryBlocklytics(start, end);
    return data.blocks;
});
exports.getOneMonthBlock = getOneMonthBlock;
const getOneYearBlock = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = (0, date_fns_1.startOfMinute)((0, date_fns_1.subYears)(Date.now(), 1)).getTime();
    const start = Math.floor(date / 1000);
    const end = Math.floor(date / 1000) + 600;
    const data = yield queryBlocklytics(start, end);
    return data.blocks;
});
exports.getOneYearBlock = getOneYearBlock;
const queryBlocklytics = (start, end) => __awaiter(void 0, void 0, void 0, function* () {
    const { data: blockData } = yield client.query({
        query: block_1.blockQuery,
        variables: {
            start,
            end,
        },
        fetchPolicy: 'network-only',
    });
    return blockData;
});
//# sourceMappingURL=blocklytics.js.map