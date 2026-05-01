"use strict";
const elliptic_1 = require("elliptic");
const buffer_1 = require("buffer");
const scKeys = [
    'address',
    'commodity',
    'commodity_amount',
    'network',
    'sc_address',
    'sc_input_data',
];
const ellipticEdDSA = new elliptic_1.eddsa('ed25519');
const trimHexPrefix = (str) => {
    if (!str)
        return str;
    if (str.substring(0, 2) === '0x') {
        return str.substring(2);
    }
    return str;
};
const signSmartContractData = (options, privateKey) => {
    const requiredKeysProvided = scKeys.every(key => key in (options));
    const unexpectedKeys = Object.keys(options).filter(key => !scKeys.includes(key));
    if (!requiredKeysProvided)
        throw Error(`All of following keys in options (as first argument) are required for signing: ${scKeys.map(key => `"${key}"`).join(', ')}`);
    if (!privateKey)
        throw Error(`Private key (as second argument) is required for signing`);
    if (unexpectedKeys.length)
        throw Error(`Unexpected keys provided in options: ${unexpectedKeys.map(key => `"${key}"`).join(', ')}`);
    const ellipticKey = ellipticEdDSA.keyFromSecret(trimHexPrefix(privateKey));
    const dataString = scKeys
        .map(key => {
        let value;
        switch (key) {
            case 'commodity_amount':
                value = String(typeof options.commodity_amount === 'string' ? options.commodity_amount : parseFloat(options.commodity_amount));
                break;
            case 'commodity':
            case 'network':
                value = String((options)[key]).toLowerCase();
                break;
            default:
                value = String((options)[key]);
        }
        return `${key}:${value}`;
    })
        .join('\n');
    const hash = buffer_1.Buffer.from(dataString, 'utf8').toString('hex');
    const signature = ellipticKey.sign(hash).toHex();
    return Object.assign(Object.assign({}, options), { signature });
};
const scKeysList = [
    ...scKeys,
    'signature',
];
module.exports = { signSmartContractData, scKeysList };
