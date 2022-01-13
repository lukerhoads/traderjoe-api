import { BigNumber } from "ethers"
import { PeriodRate } from "../routes"
import { TimePeriod } from "../types"

export const secondsToPeriod = (roiPerSec: BigNumber, period: TimePeriod) => {
    switch (period) {
        case "1s":
            return roiPerSec
        case "1m":
            return roiPerSec.mul(60)
        case "1h":
            return roiPerSec.mul(60 * 60)
        case "1d":
            return roiPerSec.mul(3600 * 24)
        case "1w":
            return roiPerSec.mul(3600 * 24 * 7)
        case "1mo":
            return roiPerSec.mul(3600 * 24 * 30)
        case "1y":
            return roiPerSec.mul(3600 * 24 * 30 * 12)
    }
}

export const convertPeriod = (periodRate: PeriodRate, expectedPeriod: TimePeriod) => {
    let roiPerSec = BigNumber.from("0")

    switch (periodRate.period) {
        case "1s":
            roiPerSec = periodRate.rate
        case "1m":
            roiPerSec = periodRate.rate.div(60)
        case "1h":
            roiPerSec = periodRate.rate.div(60 * 60)
        case "1d":
            roiPerSec = periodRate.rate.div(3600 * 24)
        case "1w":
            roiPerSec = periodRate.rate.div(3600 * 24 * 7)
        case "1mo":
            roiPerSec = periodRate.rate.div(3600 * 24 * 30)
        case "1y":
            roiPerSec = periodRate.rate.div(3600 * 24 * 30 * 12)
    }

    switch (expectedPeriod) {
        case "1s":
            return roiPerSec
        case "1m":
            return roiPerSec.mul(60)
        case "1h":
            return roiPerSec.mul(60 * 60)
        case "1d":
            return roiPerSec.mul(3600 * 24)
        case "1w":
            return roiPerSec.mul(3600 * 24 * 7)
        case "1mo":
            return roiPerSec.mul(3600 * 24 * 30)
        case "1y":
            return roiPerSec.mul(3600 * 24 * 30 * 12)
    }
}