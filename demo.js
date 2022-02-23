const { key_new, seed_from_pem, key_to_pub_key, sign_payloads, transfer_combine, Session, blobFromHex, blobToHex } = require("./index");
const fs = require("fs");

const identity_pem = process.argv[2];

(async () => {
    const session = new Session({baseUrl: "http://localhost:9000"});
    const net_id = await session.network_identifier;

    console.log("Reading PEM file from", identity_pem);

    const private_key = key_new(seed_from_pem(fs.readFileSync(identity_pem)));
    const pub_key = blobToHex(key_to_pub_key(private_key));

    const account = await session.derive({
        network_identifier: net_id,
        public_key: {
            hex_bytes: pub_key,
            curve_type: "edwards25519"
        }
    });

    const neuronAccount = await session.derive({
        network_identifier: net_id,
        public_key: {
            hex_bytes: pub_key,
            curve_type: "edwards25519"
        },
	metadata: {
	    account_type: "neuron",
        neuron_identifier: 1
	}
    });


    const stakeAmount = 100000000n;

    const payloads = await session.payloads({
        network_identifier: net_id,
        operations: [
            {
                operation_identifier: { index: 0 },
                type: "TRANSACTION",
                account: account.account_identifier,
                amount: {
                    value: `${-stakeAmount}`,
                    currency: {symbol: "ICP", decimals: 8}
                }
            },
            {
                operation_identifier: { index: 1 },
                type: "TRANSACTION",
                account: neuronAccount.account_identifier,
                amount: {
                    value: `${stakeAmount}`,
                    currency: {symbol: "ICP", decimals: 8}
                }
            },
            {
                operation_identifier: { index: 2 },
                type: "FEE",
                account: account.account_identifier,
                amount: {
                    value: "-10000",
                    currency: {symbol: "ICP", decimals: 8}
                }
            },
            {
                operation_identifier: { index: 3 },
                type: "STAKE",
                account: account.account_identifier,
                metadata: { neuron_identifier: 1}
            },
            {
                operation_identifier: { index: 4 },
                type: "SET_DISSOLVE_TIMESTAMP",
                account: account.account_identifier,
                metadata: {
                    neuron_identifier: 1,
                    dissolve_time_utc_seconds: 1879939507
                }
            },
            {
                operation_identifier: { index: 5 },
                type: "START_DISSOLVE",
                account: account.account_identifier,
                metadata: { neuron_identifier: 1}
            }
        ],
        public_keys: [{hex_bytes: pub_key, curve_type: "edwards25519"}]
    });

    const signed = sign_payloads(private_key, payloads);
    const combined = await session.combine(Object.assign(signed, { network_identifier: net_id }));

    await session.submit(Object.assign(combined, { network_identifier: net_id }));
})();
