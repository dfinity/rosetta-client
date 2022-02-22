# Rosetta staking support demo

## Start Rosetta server

```bash
cargo run -q --release -p ic-rosetta-api -- \
  --store-type sqlite \
  --store-location ~/Temp/rosetta \
  --ic-url https://exchanges.dfinity.network \
  --log-config-file rosetta-api/log_config.yml
```

## Create a test account holding 10 ICPs

```bash
dfx identity new demo
dfx identity use demo
export DEMO_ACC=$(dfx ledger account-id)
echo $DEMO_ACC

dfx identity use 999
dfx ledger --network exchanges transfer --memo 999 --amount 10.0 $DEMO_ACC
dfx identity use demo
```

## Run the demo script

```bash
node demo.js ~/.config/dfx/identity/demo/identity.pem
```

## Check neurons

```
dfx canister --network=exchanges call --query rrkah-fqaaa-aaaaa-aaaaq-cai get_neuron_ids '()'
dfx canister --network=exchanges call --query rrkah-fqaaa-aaaaa-aaaaq-cai get_neuron_info '(<neuron id>: nat64)'
```
