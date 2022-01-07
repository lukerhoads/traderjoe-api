import gql from 'graphql-tag'
import { getRandomProvider } from '../provider'

export const getTvlQuery = async (factoriesName = "factories", tvlName = "liquidityUSD") => {
    const blockNumber = await getRandomProvider().getBlockNumber()

    return gql`
        query get_tvl {
            ${factoriesName} (
                block: { number: ${blockNumber - 30} }
            ) {
                ${tvlName}
            }
        }
    `
}

export const poolByPair = gql`
    query poolByPairQuery($pair: String!) {
        pools (where: { pair: $pair }) {
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
`

export const pairByAddress = gql`
    query pairById($id: String!) {
        pairs (where: { id: $id }) {
            id
            totalSupply
            reserveUSD
        }
    }
`

export const poolsQuery = gql`
    query poolsQuery(
        $first: Int! = 1000
        $skip: Int! = 0
    ) {
        pools (
            first: $first
            skip: $skip
            orderBy: timestamp,
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
`