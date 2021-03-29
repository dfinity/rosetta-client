const { Chain } = require("./chain");

/**
 *
 * @param {Session} session
 * @param {number} timeout
 */

async function stats(session, timeout = 10000) {
  const chain = new Chain(session, true, 1000);
  await new Promise((res) => setTimeout(res, timeout));
  chain.close();

  const addr_to_balance = new Map();
  for (const t of chain.hash_to_transaction.values()) {
    for (const op of t.operations) {
      if (op.status === "COMPLETED") {
        const addr = op.account.address;
        const balance =
          (addr_to_balance.has(addr) ? addr_to_balance.get(addr) : 0n) +
          BigInt(op.amount.value);
        if (balance === 0n) {
          addr_to_balance.delete(addr);
        } else {
          addr_to_balance.set(addr, balance);
        }
      } else {
        throw new Error(`Unsupported transaction ${t}`);
      }
    }
  }

  return addr_to_balance;
}

exports.stats = stats;
