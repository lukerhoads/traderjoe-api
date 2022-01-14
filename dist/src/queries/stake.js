"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.barQuery = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.barQuery = (0, graphql_tag_1.default) `
    query barQuery {
        bars(first: 1) {
            id
            totalSupply
            joeStakedUSD
        }
    }
`;
//# sourceMappingURL=stake.js.map