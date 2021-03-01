# `@dfinity/rosetta-client`

Based on [`@lunarhq/rosetta-ts-client`][rosetta-ts-client], with additional
helper functions to derive keys/accounts and perform transfers.

基于 [`@lunarhq/rosetta-ts-client`][rosetta-ts-client]，并提供生成新的私钥/账户地
址和执行转账的高层函数接口。

## Usage

```javascript
const {
  hex_decode,
  hex_encode,
  key_new,
  key_to_pub_key,
  pub_key_to_address,
  Chain,
  Session,
} = require("@dfinity/rosetta-client");

// Generate a new private key. A private key is a Buffer and can be used to
// generate the public account address and perform transfers.
//
// 生成新的私钥。私钥类型为 Buffer，用于生成公开的账户地址、进行转账。
const key = key_new();

// Generate the public account address from a private key. The result is a
// Buffer. Use hex_encode() to generate the string representation used in the
// address field of requests.
//
// 从私钥生成公开的账户地址。账户地址类型为 Buffer，用 hex_encode() 可以将其编码
// 为在请求的 address 一栏中所用的地址字符串。
const address = pub_key_to_address(key_to_pub_key(key));
console.log(hex_encode(address));

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
const submit_result = await session.transfer(key, hex_decode(other_address_string), 123n);
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
const transaction = chain.get_transaction(submit_result.transaction_identifier.hash);
console.log(transaction);

// Stop polling recent blocks.
//
// 停止轮询最近新增的区块。
chain.close();
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
