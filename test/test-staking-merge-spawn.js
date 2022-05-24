const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const fs = require("fs");
const { key_new, seed_from_pem, Session } = require("../dist/main");

(async () => {
  const session = new Session({ baseUrl: "http://127.0.0.1:8080" });

  try {
    const src_key = key_new(
      seed_from_pem(fs.readFileSync("identity/initial/identity.pem"))
    );

    const neuron_idx = 1919810n;

    res = await session.neuron_protected_info(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_merge(src_key, neuron_idx, 50);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_protected_info(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    const spawned_neuron_idx = 365n;

    res = await session.neuron_spawn(
      src_key,
      neuron_idx,
      null,
      spawned_neuron_idx
    );
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_protected_info(src_key, spawned_neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));

    res = await session.neuron_disburse(src_key, neuron_idx);
    console.log(JSONbig.stringify(res, null, 2));
  } catch (err) {
    console.error(JSONbig.stringify(err.response.data, null, 2));
    throw new Error();
  }
})();
