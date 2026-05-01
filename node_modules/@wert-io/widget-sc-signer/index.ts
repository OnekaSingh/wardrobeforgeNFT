import { eddsa as EdDSA } from 'elliptic';
import { Buffer } from 'buffer';

interface sc_options {
  address: string,
  commodity: string,
  commodity_amount: number,
  network: string,
  sc_address: string,
  sc_input_data: string,
}
interface signed_sc_options extends sc_options {
  signature: string,
}

const scKeys = [
  'address',
  'commodity',
  'commodity_amount',
  'network',
  'sc_address',
  'sc_input_data',
] as const;

const ellipticEdDSA = new EdDSA('ed25519');

const trimHexPrefix = (str: string): string => {
  if (!str) return str;

  if (str.substring(0, 2) === '0x') {
    return str.substring(2);
  }

  return str;
};

const signSmartContractData = (options: sc_options, privateKey: string): signed_sc_options => {
  const requiredKeysProvided = scKeys.every(key => key in (options));

  const unexpectedKeys = Object.keys(options).filter(key => !scKeys.includes(key as never));

  if (!requiredKeysProvided) throw Error(`All of following keys in options (as first argument) are required for signing: ${scKeys.map(key => `"${key}"`).join(', ')}`);
  if (!privateKey) throw Error(`Private key (as second argument) is required for signing`);
  if (unexpectedKeys.length) throw Error(`Unexpected keys provided in options: ${unexpectedKeys.map(key => `"${key}"`).join(', ')}`);

  const ellipticKey = ellipticEdDSA.keyFromSecret(trimHexPrefix(privateKey));
  const dataString = scKeys
    .map(key => {
      let value;

      switch (key) {
        case 'commodity_amount':
          value = String(typeof (options.commodity_amount as string | number) === 'string' ? options.commodity_amount: parseFloat(options.commodity_amount as unknown as string));
          break;

        case 'commodity':
        case 'network':
          value = String((options)[key]).toLowerCase();
          break;

        default:
          value = String((options)[key]);
      }

      return `${key}:${value}`
    })
    .join('\n');

  const hash = Buffer.from(dataString, 'utf8').toString('hex');
  const signature = ellipticKey.sign(hash).toHex();

  return {
    ...options,
    signature,
  };
};
const scKeysList = [
  ...scKeys,
  'signature',
];

export = { signSmartContractData, scKeysList };
