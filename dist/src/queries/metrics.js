"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lastHourVolumeQuery = exports.volumeOverTimeQuery = exports.dayDataQuery = exports.lastDayVolume = exports.getExchangeTvlQuery = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.getExchangeTvlQuery = (0, graphql_tag_1.default) `
    query getTvl {
        factories {
            liquidityUSD
        }
    }
`;
exports.lastDayVolume = (0, graphql_tag_1.default) `
    query getLatestVolume {
        dayDatas(first: 1, orderBy: date, orderDirection: desc) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`;
exports.dayDataQuery = (0, graphql_tag_1.default) `
    query getDayVolume($first: Int! = 5, $block: Block_height!) {
        dayDatas(
            first: $first
            block: $block
            orderBy: date
            orderDirection: desc
        ) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`;
exports.volumeOverTimeQuery = (0, graphql_tag_1.default) `
    query getVolumeOverTime($days: Int!) {
        dayDatas(first: $days, orderBy: date, orderDirection: desc) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`;
exports.lastHourVolumeQuery = (0, graphql_tag_1.default) `
    query lastHourVolumeQuery {
        hourDatas(orderBy: date, orderDirection: desc) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`;
//# sourceMappingURL=metrics.js.map