import gql from 'graphql-tag'

export const pairTokenFieldsQuery = gql`
    fragment pairTokenFields on Token {
        id
        name
        symbol
        totalSupply
        derivedAVAX
    }
`

export const pairByAddress = gql`
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
    ${pairTokenFieldsQuery}
`

export const pairTimeTravelQuery = gql`
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
`
