import gql from 'graphql-tag'

export const getExchangeTvlQuery = gql`
    query getTvl {
        factories {
            liquidityUSD
        }
    }
`
