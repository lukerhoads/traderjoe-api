"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockQuery = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const blockFieldsQuery = (0, graphql_tag_1.default) `
    fragment blockFields on Block {
        id
        number
        timestamp
    }
`;
exports.blockQuery = (0, graphql_tag_1.default) `
    query blockQuery($start: Int!, $end: Int!) {
        blocks(
            first: 1
            orderBy: timestamp
            orderDirection: asc
            where: { timestamp_gt: $start, timestamp_lt: $end }
        ) {
            ...blockFields
        }
    }
    ${blockFieldsQuery}
`;
//# sourceMappingURL=block.js.map