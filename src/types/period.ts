import { BigNumber } from 'ethers'

export type TimePeriod = '1s' | '1m' | '1h' | '1w' | '1d' | '1mo' | '1y'

export interface PeriodRate {
    period: TimePeriod
    rate: BigNumber
}
