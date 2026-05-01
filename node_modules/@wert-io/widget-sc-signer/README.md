# WertWidget Smart Contract Signing Helper

## Installation

```
npm i @wert-io/widget-sc-signer
```

or

```
yarn add @wert-io/widget-sc-signer
```

## Usage

```javascript
const { signSmartContractData } = require('@wert-io/widget-sc-signer');
```

or

```javascript
import { signSmartContractData } from '@wert-io/widget-sc-signer';
```

```javascript
const signedData = signSmartContractData(options, privateKey);
```

Function **signSmartContractData** returns the given options object with an addition of a "**signature**" property. This function is meant to be executed **on the backend** to prevent your `private_key` from being exposed on the frontend. You can pass the result directly to [WertWidget initializer](https://www.npmjs.com/package/@wert-io/widget-initializer):

```javascript
const wertWidget = new WertWidget({
    ...signedData,
    ...otherWidgetOptions,
});
```

### Options
| Property             | Required |   Type   | Description                                                                                                                                                        |
|:---------------------|:--------:|:--------:|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **address**          | required | *String* | User’s address that will act as a fallback address if a smart contract can't be executed. In case of fallback, Wert will transfer commodity_amount to this address |
| **commodity**        | required | *String* | [List of supported currencies](https://docs.wert.io/docs/supported-coins-and-blockchains)                                                                          |
| **network**          | optional | *String* | [List of supported currencies](https://docs.wert.io/docs/supported-coins-and-blockchains)                                                                          |
| **commodity_amount** | required | *Number* | An amount of crypto necessary for executing the given smart contract                                                                                               |
| **sc_address**       | required | *String* | The address of the smart contract                                                                                                                                  |
| **sc_input_data**    | required | *String* | Data that will be used for smart contract execution, in the hex format                                                                                             |
### Private key

Was given to you during your registration in the **Wert** system as a partner. If you don't have one, [contact us](https://wert.io/for-partners).
