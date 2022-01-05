import gql from 'graphql-tag'

export const marketFieldsQuery = gql`
    fragment marketFields on Market {
        id
        supplyRate
        borrowRate
        cash
        collateralFactor
        reserveFactor
        exchangeRate
        name
        totalSupply
        totalBorrows
        reserves
        underlyingAddress
        underlyingSymbol
        underlyingPriceUSD
    }
`

export const marketsQuery = gql`
    query marketsQuery {
        markets {
            ...marketFields
        }
    }
    ${marketFieldsQuery}
`
