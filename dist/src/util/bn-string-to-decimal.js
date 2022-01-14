"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToBn = exports.bnStringToDecimal = void 0;
const ethers_1 = require("ethers");
const bnStringToDecimal = (numberVal, power) => {
    let before, after;
    if (power >= numberVal.length || numberVal.startsWith('-')) {
        let adjustedLength = numberVal.length;
        if (numberVal.startsWith('-')) {
            adjustedLength -= 1;
            before = '-0';
        }
        else {
            before = '0';
        }
        after = '.';
        if (power - adjustedLength > 0) {
            for (let i = 0; i < power - adjustedLength; i++) {
                after += '0';
            }
        }
        after += numberVal.replace('-', '');
        return before + after;
    }
    after = '.' + numberVal.slice(-power);
    before = numberVal.slice(0, -power);
    return before + after;
};
exports.bnStringToDecimal = bnStringToDecimal;
// Takes a string, such as 84.0102019201830, and converts it to a BigNumber to the specified
// power. You must supply a power that is at least the precision of the given number. If it is
// not, power defaults to the precision of the number
const stringToBn = (number, power) => {
    let parts = [];
    let localPower = 0;
    if (power) {
        localPower = power;
        if (number.includes('.')) {
            parts = number.split('.');
        }
        else {
            parts[0] = number.slice(0, -localPower);
            parts[1] = number.slice(-localPower);
        }
    }
    else {
        if (number.includes('.')) {
            parts = number.split('.');
            localPower = parts[1].length;
        }
        else {
            parts[0] = number;
            parts[1] = '0';
        }
    }
    if (parts[1].length > localPower) {
        parts[1] = parts[1].substring(0, localPower);
    }
    return ethers_1.BigNumber.from(parts[0].concat(parts[1])); // .mul(getMantissaBigNumber(localPower))
};
exports.stringToBn = stringToBn;
//# sourceMappingURL=bn-string-to-decimal.js.map