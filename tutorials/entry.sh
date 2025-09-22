#!/bin/sh

mkdir /var/run/ic-replica

/root/ic-artifacts/release/ic-starter \
  --replica-path /root/ic-artifacts/release/replica \
  --state-dir /var/run/ic-replica \
  --create-funds-whitelist "*" \
  --consensus-pool-backend rocksdb \
  --subnet-type system \
  --http-port 2053 \
  --initial-notary-delay-millis 600 &

/root/ic-artifacts/release/ic-nns-init \
  --initialize-ledger-with-test-accounts c30da4edc6e0d6ea1308d718663c3297e08946e29a9bd07ec200e335fd893e3a \
  --url http://127.0.0.1:2053 \
  --wasm-dir /root/ic-artifacts/canisters

exec /root/ic-artifacts/release/ic-rosetta-api \
  --ic-url http://127.0.0.1:2053 \
  --port 8080 \
  --store-type sqlite-in-memory
