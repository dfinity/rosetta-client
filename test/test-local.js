const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const assert = require("assert").strict;
const fs = require("fs");
const { performance } = require("perf_hooks");
const { inspect } = require("util");
const {
  key_new,
  key_to_pub_key,
  pub_key_to_address,
  address_from_hex,
  seed_from_pem,
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

  // a valid hex
  address_from_hex("674c4e1c52807c912316c97e127cd4583883dbc4040922e4cc19ce8ce6ab0101");

  // an invalid hex which gets converted to the above address
  assert.throws(() => {
     address_from_hex("674c4e1c52807c912316c97e127cd4583883dbc4040922e4cc19ce8ce6ab011z")
  });

  assert.throws(() => {
     address_from_hex("ab1")
  });
  assert.throws(() => {
     address_from_hex("this is not hex")
  });

  try {
    const src_key = key_new(
      seed_from_pem(fs.readFileSync("identity/initial/identity.pem"))
    );
    const src_pub_key = key_to_pub_key(src_key);
    const src_addr = pub_key_to_address(src_pub_key);
    const dest_addr = pub_key_to_address(
      key_to_pub_key(key_new(Buffer.alloc(32)))
    );
    const count = 1n;
    const ingress_start = nanos_since_unix_epoch();
    const ingress_end = ingress_start + 45n * 60n * 1000000000n;

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
