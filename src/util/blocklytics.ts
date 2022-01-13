import { ApolloClient, InMemoryCache } from '@apollo/client/core'
import {
    startOfMinute,
    subDays,
    subHours,
    subMonths,
    subWeeks,
    subYears,
} from 'date-fns'
import { blockQuery } from '../queries/block'
import { TimePeriod } from '../types'

const client = new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/dasconnor/avalanche-blocks',
    cache: new InMemoryCache(),
})

export const getBlocks = async (period: TimePeriod) => {
    let blocks
    switch (period) {
        case '1h':
            blocks = await getOneHourBlock()
            return blocks
        case '1d':
            blocks = await getOneDayBlock()
            return blocks
        case '1w':
            blocks = await getOneWeekBlock()
            return blocks
        case '1m':
            blocks = await getOneMonthBlock()
            return blocks
        case '1y':
            blocks = await getOneYearBlock()
            return blocks
    }
}

export const getOneHourBlock = async () => {
    const date = startOfMinute(subHours(Date.now(), 1)).getTime()
    const start = Math.floor(date / 1000)
    const end = Math.floor(date / 1000) + 600

    const data = await queryBlocklytics(start, end)
    return data.blocks
}

export const getOneDayBlock = async () => {
    const date = startOfMinute(subDays(Date.now(), 1)).getTime()
    const start = Math.floor(date / 1000)
    const end = Math.floor(date / 1000) + 600

    const data = await queryBlocklytics(start, end)
    return data.blocks
}

export const getOneWeekBlock = async () => {
    const date = startOfMinute(subWeeks(Date.now(), 1)).getTime()
    const start = Math.floor(date / 1000)
    const end = Math.floor(date / 1000) + 600

    const data = await queryBlocklytics(start, end)
    return data.blocks
}

export const getOneMonthBlock = async () => {
    const date = startOfMinute(subMonths(Date.now(), 1)).getTime()
    const start = Math.floor(date / 1000)
    const end = Math.floor(date / 1000) + 600

    const data = await queryBlocklytics(start, end)
    return data.blocks
}

export const getOneYearBlock = async () => {
    const date = startOfMinute(subYears(Date.now(), 1)).getTime()
    const start = Math.floor(date / 1000)
    const end = Math.floor(date / 1000) + 600

    const data = await queryBlocklytics(start, end)
    return data.blocks
}

const queryBlocklytics = async (start: number, end: number) => {
    const { data: blockData } = await client.query({
        query: blockQuery,
        variables: {
            start,
            end,
        },
        fetchPolicy: 'network-only',
    })

    return blockData
}
