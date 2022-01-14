import gql from 'graphql-tag'

export const barQuery = gql`
    query barQuery {
        bars(first: 1) {
            id
            totalSupply
            joeStakedUSD
        }
    }
`
