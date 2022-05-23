const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const fs = require("fs");
const { performance } = require("perf_hooks");
const {
  key_new,
  key_to_pub_key,
  seed_from_pem,
  Session,
} = require("../dist/main");
const crypto = require("crypto");
const util = require("util");

function seconds_since_unix_epoch() {
  return BigInt(
    Math.round((performance.timeOrigin + performance.now()) / 1000)
  );
}

async function sleep(secs) {
  await new Promise((resolve) => {
    setTimeout(resolve, secs * 1000);
  });
}

(async () => {
  const session = new Session({ baseUrl: "http://127.0.0.1:8080" });

  try {
    const src_key = key_new(
      seed_from_pem(fs.readFileSync("identity/initial/identity.pem"))
    );

    const neuron_idx = BigInt(crypto.randomInt(2 ** 48 - 1));

    let res = await session.neuron_charge(src_key, neuron_idx, 100000000n);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_stake(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_set_dissolve_timestamp(
      src_key,
      neuron_idx,
      seconds_since_unix_epoch() + 4n
    );
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_protected_info(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    const neuron_id = BigInt(res.metadata.operations[0].metadata.neuron_id);

    res = await session.neuron_follow(
      src_key,
      neuron_idx,
      null,
      [neuron_id],
      0
    );
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_start_dissolving(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    await sleep(8);

    res = await session.neuron_protected_info(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_disburse(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_protected_info(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    const hot_pub_key = key_to_pub_key(
      key_new(await util.promisify(crypto.randomBytes)(32))
    );

    res = await session.neuron_add_hotkey(src_key, neuron_idx, hot_pub_key);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_remove_hotkey(src_key, neuron_idx, hot_pub_key);
    console.log(JSONbig.stringify(res, null, 2));
  } catch (err) {
    console.error(JSONbig.stringify(err.response.data, null, 2));
    throw new Error(err.response.data);
  }
})();
