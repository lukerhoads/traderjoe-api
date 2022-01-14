"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.periodLt = exports.periodGt = exports.rateToYear = exports.convertPeriod = exports.secondsToPeriod = void 0;
const ethers_1 = require("ethers");
const secondsToPeriod = (roiPerSec, period) => {
    switch (period) {
        case '1s':
            return roiPerSec;
        case '1m':
            return roiPerSec.mul(60);
        case '1h':
            return roiPerSec.mul(60 * 60);
        case '1d':
            return roiPerSec.mul(3600 * 24);
        case '1w':
            return roiPerSec.mul(3600 * 24 * 7);
        case '1mo':
            return roiPerSec.mul(3600 * 24 * 30);
        case '1y':
            return roiPerSec.mul(3600 * 24 * 30 * 12);
    }
};
exports.secondsToPeriod = secondsToPeriod;
const convertPeriod = (periodRate, expectedPeriod) => {
    let roiPerSec = ethers_1.BigNumber.from('0');
    switch (periodRate.period) {
        case '1s':
            roiPerSec = periodRate.rate;
        case '1m':
            roiPerSec = periodRate.rate.div(60);
        case '1h':
            roiPerSec = periodRate.rate.div(60 * 60);
        case '1d':
            roiPerSec = periodRate.rate.div(3600 * 24);
        case '1w':
            roiPerSec = periodRate.rate.div(3600 * 24 * 7);
        case '1mo':
            roiPerSec = periodRate.rate.div(3600 * 24 * 30);
        case '1y':
            roiPerSec = periodRate.rate.div(3600 * 24 * 30 * 12);
    }
    switch (expectedPeriod) {
        case '1s':
            return roiPerSec;
        case '1m':
            return roiPerSec.mul(60);
        case '1h':
            return roiPerSec.mul(60 * 60);
        case '1d':
            return roiPerSec.mul(3600 * 24);
        case '1w':
            return roiPerSec.mul(3600 * 24 * 7);
        case '1mo':
            return roiPerSec.mul(3600 * 24 * 30);
        case '1y':
            return roiPerSec.mul(3600 * 24 * 30 * 12);
    }
};
exports.convertPeriod = convertPeriod;
const rateToYear = (value) => {
    switch (value.period) {
        case '1s':
            return value.rate.mul(3600 * 24 * 365);
        case '1m':
            return value.rate.mul(60 * 24 * 365);
        case '1h':
            return value.rate.mul(24 * 365);
        case '1d':
            return value.rate.mul(365);
        case '1w':
            return value.rate.mul(52);
        case '1mo':
            return value.rate.mul(12);
        case '1y':
            return value.rate;
    }
};
exports.rateToYear = rateToYear;
const periodOrder = ['1m', '1h', '1d', '1w', '1mo', '1y'];
const periodGt = (period1, period2) => {
    return periodOrder.indexOf(period1) > periodOrder.indexOf(period2);
};
exports.periodGt = periodGt;
const periodLt = (period1, period2) => {
    return periodOrder.indexOf(period1) < periodOrder.indexOf(period2);
};
exports.periodLt = periodLt;
//# sourceMappingURL=apr-time-convert.js.map