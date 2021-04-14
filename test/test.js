const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const assert = require("assert").strict;
const { performance } = require("perf_hooks");
const { inspect } = require("util");
const { blobFromHex, address_from_hex, Session } = require("../dist/main");

function nanos_since_unix_epoch() {
  return (
    BigInt(Math.round(performance.timeOrigin + performance.now())) * 1000000n
  );
}

(async () => {
  const session = new Session({ baseUrl: "http://localhost:8080" });

  try {
    let ingress_start = nanos_since_unix_epoch();
    let ingress_end = ingress_start + 45n * 60n * 1000000000n;
    let submit_res = await session.transfer(
      blobFromHex(
        "093c3e2191be336f246259769041dd75b326143746b2ca97cb0f66273a366ba5ae7c3e96d49d7e5b1f74ce1e8ff640957c3ba4d7199f463a9fcff4c68b19f5e3"
      ),
      address_from_hex(
        "1e1838071cb875e59c1da64af5e04951bb3c1e94c1285bf9ff7480a645e1aa56"
      ),
      1000000n,
      undefined,
      { ingress_start, ingress_end }
    );

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
