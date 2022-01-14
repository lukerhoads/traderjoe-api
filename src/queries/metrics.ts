import gql from 'graphql-tag'

export const getExchangeTvlQuery = gql`
    query getTvl {
        factories {
            liquidityUSD
        }
    }
`

export const lastDayVolume = gql`
    query getLatestVolume {
        dayDatas(first: 1, orderBy: date, orderDirection: desc) {
            id 
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`

export const dayDataQuery = gql`
    query getDayVolume($first: Int! = 5, $block: Block_height!) {
        dayDatas(first: $first, block: $block, orderBy: date, orderDirection: desc) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`

export const volumeOverTimeQuery = gql`
    query getVolumeOverTime($days: Int!) {
        dayDatas(first: $days, orderBy: date, orderDirection: desc) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`

export const lastHourVolumeQuery = gql`
    query lastHourVolumeQuery {
        hourDatas(orderBy: date, orderDirection: desc) {
            id
            volumeUSD
            liquidityUSD
            txCount
        }
    }
`