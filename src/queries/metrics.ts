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