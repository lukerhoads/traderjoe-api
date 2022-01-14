"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketsQuery = exports.marketFieldsQuery = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.marketFieldsQuery = (0, graphql_tag_1.default) `
    fragment marketFields on Market {
        id
        supplyRate
        borrowRate
        cash
        collateralFactor
        reserveFactor
        exchangeRate
        name
        totalSupply
        totalBorrows
        reserves
        underlyingAddress
        underlyingSymbol
        underlyingPriceUSD
    }
`;
exports.marketsQuery = (0, graphql_tag_1.default) `
    query marketsQuery {
        markets {
            ...marketFields
        }
    }
    ${exports.marketFieldsQuery}
`;
//# sourceMappingURL=lending.js.map