"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolsQuery = exports.poolByPair = exports.poolById = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.poolById = (0, graphql_tag_1.default) `
    query poolByIdQuery($id: String!) {
        pools(where: { id: $id }) {
            id
            pair
            allocPoint
            lastRewardTimestamp
            accJoePerShare
            balance
            userCount
            owner {
                id
                joePerSec
                totalAllocPoint
            }
            rewarder {
                rewardToken
                tokenPerSec
            }
            timestamp
        }
    }
`;
exports.poolByPair = (0, graphql_tag_1.default) `
    query poolByPairQuery($pair: String!) {
        pools(where: { pair: $pair }) {
            id
            pair
            allocPoint
            lastRewardTimestamp
            accJoePerShare
            balance
            userCount
            owner {
                id
                joePerSec
                totalAllocPoint
            }
            rewarder {
                rewardToken
                tokenPerSec
            }
            timestamp
        }
    }
`;
exports.poolsQuery = (0, graphql_tag_1.default) `
    query poolsQuery($first: Int! = 1000, $skip: Int! = 0) {
        pools(
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
        ) {
            id
            pair
            allocPoint
            lastRewardTimestamp
            accJoePerShare
            balance
            userCount
            owner {
                id
                joePerSec
                totalAllocPoint
            }
            timestamp
        }
    }
`;
//# sourceMappingURL=pool.js.map