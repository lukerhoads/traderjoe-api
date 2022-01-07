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

export const poolByPair = (pair: string) => {
    return gql`
        {
            pools(where: { pair: ${pair} }, first: 5, orderBy: userCount, orderDirection:desc) {
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
        }`
}