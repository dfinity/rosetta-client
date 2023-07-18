# How to deploy a local IC instance with staking support

## Prerequisites

[Neuron lifecycle](https://github.com/dfinity/ic/blob/master/rs/rosetta-api/docs/modules/rosetta-api/pages/neuron-lifecycle.adoc)

[Staking support](https://github.com/dfinity/ic/blob/master/rs/rosetta-api/docs/modules/rosetta-api/pages/staking-support.adoc)

## Generate a test identity

Before deploying, we need to generate an identity (private key), so
the corresponding ledger account and neuron can be passed as initial
arguments to deployment. In this tutorial, we use
[`dfx`](https://github.com/dfinity/sdk) to handle identities.

Use `dfx identity --help` to see supported operations regarding
identities. For convenience of local testing, we'll create a
password-less identity named `test`:

```sh
$ dfx identity new --disable-encryption test
Created identity: "test".
```

This will write the `test` identity to
`~/.config/dfx/identity/test/identity.pem`. You can get its principal
id via:

```sh
$ dfx --identity test identity get-principal
o4e7c-3baty-lforx-d6tpl-6p7c7-a5hfd-fdbic-vdkrq-mllgf-5mkow-6qe
```

You can also get its ledger account via:

```sh
$ dfx --identity test ledger account-id
dfx.json not found, using default.
c30da4edc6e0d6ea1308d718663c3297e08946e29a9bd07ec200e335fd893e3a
```

## Obtain `ic` artifacts

Before we perform a deployment, we need a recent checkout of the `ic`
repo, and fetch the artifacts used for local deployment. The
`rclone_download.py` script used below requires `rclone` as a
dependency, and its pip dependencies needs to be installed upon first
use:

```sh
$ git clone https://github.com/dfinity/ic.git
$ cd ic
$ pip3 install --user -r gitlab-ci/src/requirements.txt
$ gitlab-ci/src/artifacts/rclone_download.py \
    --latest-to \
    --mark-executable \
    --out=artifacts/release \
    --remote-path=release \
    --unpack
$ gitlab-ci/src/artifacts/rclone_download.py \
    --latest-to \
    --out=artifacts/canisters \
    --remote-path=canisters \
    --unpack
```

The commands above will download and unpack the artifacts to the
`artifacts` directory. This needs to be done only once, the artifacts
can be reused multiple times for local deployments.

You can pass `--help` to `rclone_download.py` for detailed help
information.

## Start the local `ic` replica

Use the following command to start a local `ic` replica, which listens
on port `2053`. The state directory is a fresh temporary directory, so
each time you interrupt and restart the replica, it starts with a
blank state.

```sh
$ artifacts/release/ic-starter \
    --replica-path artifacts/release/replica \
    --state-dir "$(mktemp -d)" \
    --create-funds-whitelist "*" \
    --consensus-pool-backend rocksdb \
    --subnet-type system \
    --http-port 2053 \
    --initial-notary-delay-millis 600
```

You can pass `--help` to `ic-starter` for detailed help information.
The arguments here are mostly copied over from
[here](https://github.com/dfinity/sdk/blob/395a9bf705171ac4b2a99438dc6e35a251e4518d/src/dfx/src/actors/replica.rs#L294),
which is what `dfx replica` passes to `ic-starter`.

## Prepare neurons CSV

When deploying to a local replica, you can use a CSV file to specify
test neurons. The following example creates a test neuron in dissolved
state, with some pre-existing maturity, so that it's possible to test
merge/spawn functionalities:

```csv
neuron_id;owner_id;created_ts_ns;duration_to_dissolution_ns;staked_icpt;earnings;follows;not_for_profit;memo;maturity_e8s_equivalent;kyc_verified
114514;o4e7c-3baty-lforx-d6tpl-6p7c7-a5hfd-fdbic-vdkrq-mllgf-5mkow-6qe;1;1;10000000000;D;;false;1919810;1145141919810;true
```

Some points to keep in mind:

- `neuron_id` is the unique id that the governance canister assigns to
  each neuron. `memo` is the "neuron index". The user interface in
  `ic-rosetta-api` and `rosetta-client` uses the combination of
  principal ID + neuron index to identify a neuron.
- `staked_icpt` must be at least 1 ICP.

## Deploy to the local `ic` replica

The following command deploys the NNS canisters, and makes you rich on
the local test net:

```sh
$ artifacts/release/ic-nns-init \
    --initial-neurons neurons.csv \
    --initialize-ledger-with-test-accounts c30da4edc6e0d6ea1308d718663c3297e08946e29a9bd07ec200e335fd893e3a \
    --url http://127.0.0.1:2053 \
    --wasm-dir artifacts/canisters
```

Some points to keep in mind:

- `--initialize-ledger-with-test-accounts` can be passed multiple
  times to top-up multiple accounts. Each account will be funded with
  10000 ICP.
- `--initial-neurons` is not mandatory if you don't need test neurons.
- The `ic-nns-init` Linux binary requires `liblmdb0`, `libsqlite3-0`
  as system dependencies.

## Start rosetta server

The following command starts `ic-rosetta-api`, connects to the local
`ic` replica, and listens at the `8080` port:

```sh
$ cd rs/rosetta-api
$ ../../artifacts/release/ic-rosetta-api \
    --ic-url http://127.0.0.1:2053 \
    --port 8080 \
    --store-type sqlite-in-memory
```

Some points to keep in mind:

- You can also use the `dfinity/rosetta-api` Docker Hub images, as
  long as the host `2053` port is forwarded (or just start the
  container with `--network host` for simplicity)
- `ic-rosetta-api` requires the `log_config.yml` file in the current
  working directory, therefore we're starting it in `rs/rosetta-api`.
- The `ic-rosetta-api` Linux binary requires `libsqlite3-0`,
  `libssl1.1` as system dependencies.

## Happy hacking

At this point, you can perform testing using `rosetta-client`, or
other means that interop with `ic-rosetta-api`.
