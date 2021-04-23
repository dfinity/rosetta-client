# `@dfinity/rosetta-client`

[![GitHub Actions](https://github.com/dfinity/rosetta-client/workflows/integration-test/badge.svg?branch=master)](https://github.com/dfinity/rosetta-client/actions?query=branch%3Amaster)

A JavaScript package to call Rosetta API, with additional helper functions to
derive credentials and perform transfers.

用于调用 Rosetta API 的 JavaScript 库，并提供高层函数接口用于生成新的私钥/账户地
址、执行转账。

## Usage

### Working with ED25519 keys

```javascript
let { randomBytes } = require("crypto");
let { key_new, key_to_pub_key } = require("@dfinity/rosetta-client");

// Derive an ED25519 private key from a system random seed. The private key's
// type is Buffer.
//
// 从系统生成的随机种子生成一个 ED25519 私钥。私钥类型为 Buffer。
let privateKey = key_new();

// Derive an ED25519 private key from a user-specified 32-byte random seed. This
// is the preferred way of generating private keys, since the seed can be stored
// and be used by other ED25519 implementations as well.
//
// 从用户指定的 32 字节随机数种子生成一个 ED25519 私钥。我们推荐使用本方式生成私
// 钥，因为可以存储随机数种子，且该种子可用于在其他 ED25519 实现中生成同一个私
// 钥。
let seed = randomBytes(32);
privateKey = key_new(seed);

// Use key_to_pub_key() to derive a public key from a private key. The public
// key's type is Buffer.
//
// 调用 key_to_pub_key() 函数，从私钥生成公钥。公钥类型是 Buffer。
let publicKey = key_to_pub_key(privateKey);
```

### Working with account addresses

```javascript
let {
  pub_key_to_address,
  address_from_hex,
  address_to_hex,
} = require("@dfinity/rosetta-client");

// pub_key_to_address() derives an address from a public key. The address type
// is Buffer.
//
// pub_key_to_address() 函数从公钥生成账户地址。地址类型是Buffer。
let address = pub_key_to_address(publicKey);

// address_from_hex() & address_to_hex() converts between the address Buffer and
// the hex address string used in Rosetta API requests. This is not a simple
// base16 encoding, since the hex string will also contain a CRC32 checksum.
// address_from_hex() will throw if the checksum doesn't match.
//
// address_from_hex() 和 address_to_hex() 函数用于在地址的 Buffer 和用于 Rosetta
// API 请求中的十六进制字符串之间进行转换。转换过程并非简单的 base16 编码，因为
// 十六进制字符串中还会包含一个 CRC32 校验码。address_from_hex() 在校验码错误时
// 会抛出异常。
address = address_from_hex(address_to_hex(address));
```

### Calling Rosetta API and performing transfers

```javascript
let { Session } = require("@dfinity/rosetta-client");

// A Session implements the interface of RosettaClient as specified in
// https://www.npmjs.com/package/@lunarhq/rosetta-ts-client, and you can use
// methods of RosettaClient to invoke the Rosetta API.
//
// Session 实现了 https://www.npmjs.com/package/@lunarhq/rosetta-ts-client 描述
// 的 RosettaClient 类接口，可以调用 RosettaClient 的方法使用 Rosetta API。
let session = new Session({ baseUrl: "http://localhost:8080" });

// The network_identifier value used in requests.
//
// 请求中的 network_identifier 一栏所用的值。
console.log(await session.network_identifier);

// The currency value used in requests.
//
// 请求中的 currency 一栏所用的值。
console.log(await session.currency);

// A BigInt value representing the transaction fee. At the moment, despite the
// name "suggested_fee", the fee is mandatory.
//
// 代表交易费用的 BigInt 值。尽管 Rosetta API 中将其称为“建议费用”，该费用目前是
// 强制的。
console.log(await session.suggested_fee);

// Given the source account private key as a Buffer, the destination account as
// a Buffer, the transfer amount as a BigInt, perform a transfer and return the
// result of the /construction/submit call.
//
// The destination account will receive the specified amount. An additional fee
// will be charged from the source account.
//
// 给定划出账户私钥的 Buffer 对象、划入账户地址的 Buffer 对象和划转金额的 BigInt
// 值，发起一次转账，并返回 /construction/submit 调用的结果。
//
// 划入账户将收到指定金额，划出账户则将额外扣除交易费用。
let submit_result = await session.transfer(src_private_key, dest_addr, 123n);
console.log(submit_result);
```

### Querying a transaction given a transaction hash

```javascript
// Call the /search/transactions endpoint and search for an on-chain transaction
// given its hash. Other query conditions of /search/transactions are not
// implemented yet.
//
// 调用 /search/transactions 接口，通过事务 hash 值检索其是否上链。
// /search/transactions 接口的其他检索条件目前暂未实现。
let transactions_result = await session.transactions({
  network_identifier: await session.network_identifier,
  transaction_identifier: submit_result.transaction_identifier,
});

console.log(transactions_result.transactions[0]);
```

### Performing transfers while keeping the private keys in an isolated environment

```javascript
let { transfer_combine } = require("@dfinity/rosetta-client");

// Due to security concerns, you may wish to avoid calling transfer() which
// consumes the private key and performs network calls. We support using the
// private key only in a fully isolated environment while performing a transfer,
// here's an example.
//
// 出于安全考虑，您也许希望避免调用 transfer() 方法，因为它需要传入私钥参数，并
// 且会执行网络调用。我们支持在转账时，仅在完全隔离的环境中使用私钥，用例如下。
let payloads_result = await session.transfer_pre_combine(
  src_public_key,
  dest_addr,
  123n
);

// This step can be executed in a fully isolated environment. The result is the
// same of calling /construction/combine with session.combine().
//
// 该步骤可在完全隔离的环境中执行。与通过 session.combine() 调用 /construction/combine 的结果相同。
let combine_result = transfer_combine(src_private_key, payloads_result);

submit_result = await session.transfer_post_combine(combine_result);
```

### Submitting a transaction in a configurable time period

```javascript
// The transfer()/transfer_pre_combine() functions take two extra optional
// parameters. One is max_fee, another is an object for additional metadata in
// the /construction/payloads request.
//
// It's possible to specify ingress_start/ingress_end in the metadata, so that
// you can generate and sign a transaction earlier, but postpone the submission
// later. The submission period must be within the next 24 hours.
// ingress_start/ingress_end are BigInt values specifying nanoseconds since unix
// epoch, and you can specify only single one of it.
//
// transfer()/transfer_pre_combine() 函数还有两个可选参数，一个是 max_fee，另一
// 个是作为 /construction/payloads 请求的额外 metadata 的对象。
//
// 可以在 metadata 中指定 ingress_start/ingress_end，从而提前生成并签名一条事
// 务，但将事务的提交推迟到之后的时间。提交时间必须不晚于事务生成后的 24 小时。
// ingress_start/ingress_end 是纳秒单位 Unix 时间戳的 BigInt 值，可以全部指定也
// 可以只指定一个。

payloads_result = await session.transfer_pre_combine(
  src_public_key,
  dest_addr,
  123n,
  undefined,
  { ingress_start, ingress_end }
);
```

### Decoding a signed transaction

```javascript
const { signed_transaction_decode } = require("@dfinity/rosetta-client");

// You may wish to decode a signed transaction and verify the content before
// actually submitting it. Here's how.
//
// 您也许想要在提交已签名的事务前，先将其反序列化并校验其内容。示例如下。

// The signed_transaction field is a hex-encoded string. Pass it directly to
// signed_transaction_decode().
//
// signed_transaction 是十六进制编码的字符串。直接将其传给
// signed_transaction_decode() 即可。
const tx = signed_transaction_decode(combine_result.signed_transaction);

// The source account as a Buffer.
//
// 转出账户的 Buffer 值。
console.log(address_to_hex(tx.from));

// The destination account as a Buffer.
//
// 转入账户的 Buffer 值。
console.log(address_to_hex(tx.to));

// The transfer amount as a BigInt.
//
// 转账金额的 BigInt 值。
console.log(tx.amount);

// The additional transaction fee as a BigInt.
//
// 额外的交易费用的 BigInt 值。
console.log(tx.fee);

// The source account's public key as a Buffer.
//
// 转出账户公钥的 Buffer 值。
console.log(tx.sender_pubkey);
```

### Creating & using a JS bundle

You can bundle this package and its dependencies into a single JS file, and use
it as a regular CommonJS module.

您可以将本库及其依赖库打包成单个 JS 文件，像普通的 CommonJS 模块一样使用它。

```sh
$ npm install
$ npm run-script build
$ node --eval "console.log(require('./dist/main.js'))"
```

The bundled JS file is also available as the `dist` artifact on CI.

打包好的 JS 文件也可从 CI 上生成的 `dist` 文件直接下载。

## Supported Node.js versions

This package is tested against latest versions of Node.js v10/v12/v13/v14/v15.

## Common traps and pitfalls

### Working with BigInt

Because of JavaScript number type's [limit][js-max-safe-int] in integer
precision, we use `BigInt`s everywhere (amounts, fee, timestamps, etc) to
represent integers. There are things to watch out when using `BigInt`s with this
package:

由于 JavaScript 数字类型表示整数时的精度[限制][js-max-safe-int]，我们在本库中凡
是涉及整数的部分均使用 `BigInt` 类型（如转账金额、交易费用、时间戳等）。使用
`BigInt` 时需要留意的要点：

```javascript
// Don't do this! Precision loss!
// 不要这样，会有精度损失！
let timestamp = BigInt(Date.now() * 1000000);

// Do this instead!
// 这样才对！
let timestamp = BigInt(Date.now()) * 1000000n;
```

Also, JavaScript's builtin `JSON` encoder/decoder won't work with the
input/output data of this package. We use [`json-bigint`][json-bigint] for JSON
encoding/decoding in this package, and if you need to work with JSON too, you
also need `json-bigint`.

另外，JavaScript 内置的 `JSON` 序列化函数不能用于本库输入/输出的数据。我们使用
[`json-bigint`][json-bigint] 库用于 JSON 序列化，如果您也需要处理 JSON 数据，您
也应当使用 `json-bigint`.

```javascript
const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
JSONbig.parse(); // Use this instead of JSON.parse()
JSONbig.stringify(); // Use this instead of JSON.stringify()
```

[json-bigint]: https://www.npmjs.com/package/json-bigint
[js-max-safe-int]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
[rosetta-ts-client]: https://github.com/lunarhq/rosetta-ts-client

<!--
## TODO

- [x] Watch out for the next test net deployment, set appropriate default fee.
- [x] Given a transaction hash, query the transfer status and confirm if it
      reached the chain or is rejected. Since `ic-rosetta-api` doesn't implement
      [`/search/transactions`][search_transactions] yet, the JavaScript SDK may need
      to workaround this by polling all blocks and doing its own indexing.
- [ ] Error handling in the polling logic.
- [ ] Other high-level Rosetta API wrappers (or redirect underlying
  `RosettaClient` method calls so to avoid some boilerplates in the request,
  e.g. `network_identifier`).
- [x] Proper license & packaging.
- [ ] Better names.

[search_transactions]: https://www.rosetta-api.org/docs/SearchApi.html#searchtransactions
-->
