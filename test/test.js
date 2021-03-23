const {
  hex_decode,
  address_from_hex,
  Chain,
  Session,
  transfer_combine,
} = require("../index.js");
const { inspect } = require("util");

(async () => {
  const session = new Session({ baseUrl: "http://localhost:2054" });
  const chain = new Chain(session);

  try {
    let submit_res = await session.transfer(
      hex_decode(
        "093c3e2191be336f246259769041dd75b326143746b2ca97cb0f66273a366ba5ae7c3e96d49d7e5b1f74ce1e8ff640957c3ba4d7199f463a9fcff4c68b19f5e3"
      ),
      address_from_hex(
        "1e1838071cb875e59c1da64af5e04951bb3c1e94c1285bf9ff7480a645e1aa56"
      ),
      1000000n
    );

    await new Promise((res) => setTimeout(res, 10000));

    console.log(
      inspect(chain.get_transaction(submit_res.transaction_identifier.hash), {
        depth: null,
      })
    );

    let payloads_res = await session.transfer_pre_combine(
      hex_decode(
        "ae7c3e96d49d7e5b1f74ce1e8ff640957c3ba4d7199f463a9fcff4c68b19f5e3"
      ),
      address_from_hex(
        "1e1838071cb875e59c1da64af5e04951bb3c1e94c1285bf9ff7480a645e1aa56"
      ),
      1000000n
    );
    let combine_res = transfer_combine(
      hex_decode(
        "093c3e2191be336f246259769041dd75b326143746b2ca97cb0f66273a366ba5ae7c3e96d49d7e5b1f74ce1e8ff640957c3ba4d7199f463a9fcff4c68b19f5e3"
      ),
      payloads_res
    );
    submit_res = await session.transfer_post_combine(combine_res);

    await new Promise((res) => setTimeout(res, 10000));

    console.log(
      inspect(chain.get_transaction(submit_res.transaction_identifier.hash), {
        depth: null,
      })
    );
  } catch (err) {
    console.error(inspect(err, { depth: null }));
    throw err;
  } finally {
    chain.close();
  }
})();
