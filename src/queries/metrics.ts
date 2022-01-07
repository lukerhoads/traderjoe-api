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