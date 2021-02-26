const { hex_decode, Chain, Session } = require("./index.js");
const { inspect } = require("util");

(async () => {
  const session = new Session({ baseUrl: "http://localhost:8080" });
  const chain = new Chain(session);

  try {
    const submit_res = await session.transfer(
      hex_decode(
        "093c3e2191be336f246259769041dd75b326143746b2ca97cb0f66273a366ba5ae7c3e96d49d7e5b1f74ce1e8ff640957c3ba4d7199f463a9fcff4c68b19f5e4"
      ),
      hex_decode("df11fdc42d372cea555c5b1c0e73c67ea103d1e8a4d0e669a0b9d4ac02"),
      1000000n
    );

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
