import gql from 'graphql-tag'

export const getTvlQuery = (factoriesName = "factories", tvlName = "liquidityUSD") => {
    return gql`
        query get_tvl($block: Int) {
            ${factoriesName}(
                block: { number: $block }
            ) {
                ${tvlName}
            }
        }
    `
}

export const poolByPair = (pair: string) => {
    return gql`
        {
            pools(where: { pair:"${pair}" }, first: 5, orderBy: userCount, orderDirection:desc) {
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