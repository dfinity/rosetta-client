const { Session } = require("./session");

class Chain {
  /**
   *
   * @param {Session} session
   * @param {boolean} sync_all
   * @param {number} interval
   */
  constructor(session, sync_all = false, interval = 1000) {
    this.index_to_block = new Map();
    this.hash_to_block = new Map();
    this.hash_to_transaction = new Map();
    this.active = true;
    this.update_loop(session, sync_all, interval);
  }

  /**
   * Lookup a recent transaction by its hash.
   * @param {string} hash
   * @returns {import("@lunarhq/rosetta-ts-client").Transaction?}
   */
  get_transaction(hash) {
    return this.hash_to_transaction.get(hash);
  }

  /**
   * Stop polling the blockchain.
   */
  close() {
    this.active = false;
  }

  async update_loop(session, sync_all, interval) {
    await this.get_block(
      session,
      await (sync_all ? my_genesis_block_id : my_current_block_id)(session)
    );

    while (this.active) {
      let block_id = await my_current_block_id(session);

      while (!this.index_to_block.has(block_id.index)) {
        const block = await this.get_block(session, block_id);
        block_id = block.parent_block_identifier;
      }

      await new Promise((res) => setTimeout(res, interval));
    }
  }

  async get_block(session, block_id) {
    const net_id = await session.network_identifier;
    const block = (
      await session.block({
        network_identifier: net_id,
        block_identifier: block_id,
      })
    ).block;
    this.index_to_block.set(block.block_identifier.index, block);
    this.hash_to_block.set(block.block_identifier.hash, block);
    block.transactions.forEach((t) => {
      this.hash_to_transaction.set(t.transaction_identifier.hash, t);
    });
    return block;
  }
}

exports.Chain = Chain;

async function my_genesis_block_id(session) {
  return (await my_status(session)).genesis_block_identifier;
}

async function my_current_block_id(session) {
  return (await my_status(session)).current_block_identifier;
}

async function my_status(session) {
  return await session.networkStatus({
    network_identifier: await session.network_identifier,
  });
}
