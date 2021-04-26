const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const assert = require("assert").strict;
const { performance } = require("perf_hooks");
const { inspect } = require("util");
const {
  address_from_hex,
  blobFromHex,
  key_to_pub_key,
  pub_key_to_address,
  signed_transaction_decode,
  transfer_combine,
  Session,
} = require("../dist/main");

function nanos_since_unix_epoch() {
  return (
    BigInt(Math.round(performance.timeOrigin + performance.now())) * 1000000n
  );
}

(async () => {
  const session = new Session({ baseUrl: "http://localhost:8080" });

  try {
    const src_key = blobFromHex(
      "26a697f24911e2705256427aaf47dbf2c1543350368b2dc50cf4721cf85670f07f4d3b441cc11d575ba8bec2a3e7fe6f082331729a3de051123bba8eb9388aa7"
    );
    const src_pub_key = key_to_pub_key(src_key);
    const src_addr = pub_key_to_address(src_pub_key);
    const dest_addr = address_from_hex(
      "1e1838071cb875e59c1da64af5e04951bb3c1e94c1285bf9ff7480a645e1aa56"
    );
    const count = 1n;
    const ingress_start = nanos_since_unix_epoch();
    const ingress_end = ingress_start + 48n * 60n * 1000000000n;

    const payloads_res = await session.transfer_pre_combine(
      src_pub_key,
      dest_addr,
      count,
      undefined,
      { ingress_start, ingress_end }
    );

    const combine_res = transfer_combine(src_key, payloads_res);
    const tx = signed_transaction_decode(combine_res.signed_transaction);
    assert(tx.from.compare(src_addr) === 0);
    assert(tx.to.compare(dest_addr) === 0);
    assert(tx.amount === count);
    assert(tx.fee === (await session.suggested_fee));
    assert(tx.sender_pubkey.compare(src_pub_key) === 0);

    const submit_res = await session.transfer_post_combine(combine_res);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    let tx_res = await session.transactions({
      network_identifier: await session.network_identifier,
      transaction_identifier: submit_res.transaction_identifier,
    });

    assert(tx_res.total_count === 1);

    console.log(JSONbig.stringify(tx_res, null, 2));
  } catch (err) {
    console.error(inspect(err, { depth: null }));
    throw err;
  }
})();
