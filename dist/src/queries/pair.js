"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pairTimeTravelQuery = exports.pairByAddress = exports.pairTokenFieldsQuery = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.pairTokenFieldsQuery = (0, graphql_tag_1.default) `
    fragment pairTokenFields on Token {
        id
        name
        symbol
        totalSupply
        derivedAVAX
    }
`;
exports.pairByAddress = (0, graphql_tag_1.default) `
    query pairById($id: String!) {
        pair(id: $id) {
            id
            reserveUSD
            reserveAVAX
            volumeUSD
            untrackedVolumeUSD
            trackedReserveAVAX
            token0 {
                ...pairTokenFields
            }
            token1 {
                ...pairTokenFields
            }
            reserve0
            reserve1
            token0Price
            token1Price
            totalSupply
            txCount
            timestamp
        }
    }
    ${exports.pairTokenFieldsQuery}
`;
exports.pairTimeTravelQuery = (0, graphql_tag_1.default) `
    query pairsTimeTravelQuery(
        $first: Int! = 1000
        $pairAddress: Bytes!
        $block: Block_height!
    ) {
        pair(
            id: $pairAddress
            first: $first
            block: $block
            orderBy: trackedReserveAVAX
            orderDirection: desc
        ) {
            id
            reserveUSD
            trackedReserveAVAX
            volumeUSD
            untrackedVolumeUSD
            txCount
        }
    }
`;
//# sourceMappingURL=pair.js.map