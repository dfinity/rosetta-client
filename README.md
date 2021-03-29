# `@dfinity/rosetta-client`

[![GitHub Actions](https://github.com/dfinity/rosetta-client/workflows/integration-test/badge.svg?branch=master)](https://github.com/dfinity/rosetta-client/actions?query=branch%3Amaster)

Based on [`@lunarhq/rosetta-ts-client`][rosetta-ts-client], with additional
helper functions to derive keys/accounts and perform transfers.

基于 [`@lunarhq/rosetta-ts-client`][rosetta-ts-client]，并提供生成新的私钥/账户地
址和执行转账的高层函数接口。

## Usage

### Working with ED25519 keys

```javascript
let { key_new, key_to_pub_key } = require("./index");

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
let seed = Buffer.allocUnsafe(32);
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

// A Session is a subclass of RosettaClient, and you can use methods of
// RosettaClient to invoke the Rosetta API.
//
// Session 是 RosettaClient 的子类，可以调用 RosettaClient 的方法使用 Rosetta
// API。
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

// This step can be executed in a fully isolated environment.
//
// 该步骤可在完全隔离的环境中执行。
let combine_result = transfer_combine(src_private_key, payloads_result);

submit_result = await session.transfer_post_combine(combine_result);
```

## Supported Node.js versions

This package is tested against latest versions of Node.js v12/v13/v14/v15.

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
