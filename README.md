# `@dfinity/rosetta-client`

Based on [`@lunarhq/rosetta-ts-client`][rosetta-ts-client], with additional
helper functions to derive keys/accounts and perform transfers.

基于 [`@lunarhq/rosetta-ts-client`][rosetta-ts-client]，并提供生成新的私钥/账户地
址和执行转账的高层函数接口。

## Usage

```javascript
const {
  key_new,
  key_to_pub_key,
  pub_key_to_address,
  address_from_hex,
  address_to_hex,
  Chain,
  Session,
  transaction_hash,
  transfer_combine,
} = require("@dfinity/rosetta-client");

// Generate a new private key. A private key is a Buffer and can be used to
// generate the public account address and perform transfers.
//
// 生成新的私钥。私钥类型为 Buffer，用于生成公开的账户地址、进行转账。
let key = key_new();

// Generate a private key given a 32-byte binary seed. This is the preferred way
// of generating private keys, since the seed can be stored and it can be used
// by other languages/frameworks as well.
//
// 使用 32 字节的随机数种子生成私钥。我们推荐使用本方式生成私钥，因为可以存储随
// 机数种子，且该种子可在其他语言/框架中重新构造相同的密钥。
const seed = Buffer.allocUnsafe(32);
key = key_new({ seed: seed });

// Generate the public account address from a private key. The result is a
// Buffer. Use address_to_hex() to generate the string representation used in
// the address field of requests.
//
// 从私钥生成公开的账户地址。账户地址类型为 Buffer，用 address_to_hex() 可以将其
// 编码为在请求的 address 一栏中所用的地址字符串。
const address = pub_key_to_address(key_to_pub_key(key));
console.log(address_to_hex(address));

// A Session is a subclass of RosettaClient, and you can use methods of
// RosettaClient to invoke the Rosetta API.
//
// Session 是 RosettaClient 的子类，可以调用 RosettaClient 的方法使用 Rosetta
// API。
const session = new Session({ baseUrl: "http://localhost:8080" });

// A Chain is a service which polls recent blocks, and can be used to confirm if
// a transaction actually hit the chain given the transaction hash. It's not
// required for performing transfers.
//
// Chain 类实现了轮询最近新增的区块的逻辑，给定转账事务的 hash 值，可用于确认该
// 事务成功上链。转账操作本身并不需要此类对象。
const chain = new Chain(session);

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

// Given the source account's private key, the destination account's address and
// the amount, perform a transfer and return the result of the
// /construction/submit call.
//
// The destination account will receive the specified amount. An additional fee
// will be debited from the source account.
//
// 给定划出账户的私钥、划入账户的地址和转账数额，发起一次转账，并返回该事务的
// /construction/submit 调用结果。
//
// 划入账户将收到参数指定的转账数额。划出账户将额外扣除交易费用。
const submit_result = await session.transfer(
  key,
  address_from_hex(destination_address_hex_string),
  123n
);
console.log(submit_result);

// Before confirming if the transaction actually reached the chain, wait for a
// bit of time.
//
// 确认转账事务上链之前，等待片刻时间。
await new Promise((res) => setTimeout(res, 10000));

// Lookup a transaction in recent blocks given its hash value. If the result is
// not undefined, the transaction has actually reached the chain.
//
// 在最近新增的区块中检索转账事务的 hash。若返回值非 undefined，则该事务确认上
// 链。
const transaction = chain.get_transaction(
  submit_result.transaction_identifier.hash
);
console.log(transaction);

// Stop polling recent blocks.
//
// 停止轮询最近新增的区块。
chain.close();

// Due to security concerns, you may wish to avoid calling transfer() which
// consumes the private key and performs network calls. We support using the
// private key only in a fully isolated environment while performing a transfer,
// here's an example.
//
// 出于安全考虑，您也许希望避免调用 transfer() 方法，因为它需要传入私钥参数，并
// 且会执行网络调用。我们支持在转账时，仅在完全隔离的环境中使用私钥，用例如下。

const payloads_result = await session.transfer_pre_combine(
  source_address,
  destination_address,
  123n
);

// This step can be executed in a fully isolated environment.
//
// 该步骤可在完全隔离的环境中执行。
const combine_result = transfer_combine(source_private_key, payloads_result);

const submit_result = await session.transfer_post_combine(combine_result);

// There are two ways to obtain a transaction hash. One is reading the result of
// /construction/submit call, another is using transaction_hash() to calculate
// it locally.
//
// 有两种计算 transaction hash 的方法。第一种是从 /construction/submit 调用的结
// 果读取，第二种是调用 transaction_hash() 函数离线计算。

const tx_hash = transaction_hash(payloads_result);
assert(hex_encode(tx_hash) === submit_result.transaction_identifier.hash);
```

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
