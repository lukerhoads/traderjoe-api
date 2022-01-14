"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMantissaBigNumber = void 0;
const ethers_1 = require("ethers");
const getMantissaBigNumber = (exp) => {
    let divisor = '1';
    for (let i = 0; i < exp; i++)
        divisor += '0';
    return ethers_1.BigNumber.from(divisor);
};
exports.getMantissaBigNumber = getMantissaBigNumber;
//# sourceMappingURL=mantissa-bignum.js.map