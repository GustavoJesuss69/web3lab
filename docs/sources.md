# Web3 Lab · Ep.01 · The journey of a transaction · sources

Checked 12 Oct 2026 against official docs. Anything not listed here and shown in the app (addresses, hashes, block/slot numbers, queue of 25 txs, block capacity of 10, base fee 12 gwei, maxFee 30 gwei, CU limit 1,000, chart curves) is **example data**, labelled "example" in the UI. Sim time is compressed (the whole journey plays in 43 s).

## Ethereum
| Fact used in the app | Source |
|---|---|
| Tx fields: from, to, signature, nonce, value (wei), input data, gasLimit, maxPriorityFeePerGas, maxFeePerGas. Signed with the sender's private key, signed tx returns v, r, s and a hash | https://ethereum.org/en/developers/docs/transactions/ |
| A simple transfer uses 21,000 gas | same page ("On gas") |
| Type 2 (EIP-1559) tx is the default type, base fee + priority fee | same page ("Typed Transaction Envelope") |
| Wallet sends via JSON-RPC, execution client checks the signature and that the sender has enough ETH, adds it to its local mempool, gossips to peers who add it to their own mempool | https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/ ("How a Transaction Gets Executed") |
| Base fee must at least be met to be eligible for inclusion, tip makes the tx attractive to validators, base fee is burned, tip goes to the validator | https://ethereum.org/en/developers/docs/gas/ |
| Fee is paid whether the tx succeeds or fails | same page |
| Only the next nonce can be processed, a stuck lower nonce blocks later ones | https://solana.com/docs/core/transactions/confirmation ("Other blockchains") + ethereum.org transactions page (nonce = sequential counter) |
| 12 s slots, 32-slot epochs, one proposer per slot picked pseudo-randomly (RANDAO), execution client builds the execution payload and computes the state change | ethereum.org PoS page + https://ethereum.org/en/developers/docs/blocks/ |
| Blocks contain parent_hash / state_root, every block references its parent, empty slots can happen | https://ethereum.org/en/developers/docs/blocks/ |
| Validators re-execute and attest, committees attest each slot so every validator attests once per epoch | ethereum.org PoS page, https://ethereum.org/en/roadmap/single-slot-finality/ |
| Justified then finalized checkpoints with 2/3 of staked ETH (Casper FFG), reverting needs at least 1/3 of staked ETH to be burned | ethereum.org PoS page ("Finality") |
| Finality takes about 2 epochs, shown as 64 slots x 12 s = 12.8 min, ethereum.org itself rounds this to "about 15 minutes" | https://ethereum.org/en/roadmap/single-slot-finality/ ("rather than across two epochs", "~15 minutes") |
| Receipt fields: status 1 (success) / 0 (failure), gasUsed, effectiveGasPrice (base fee + tip per gas), blockNumber, logs (eth_getTransactionReceipt) | https://ethereum.org/en/developers/docs/apis/json-rpc/ |

## Solana
| Fact used in the app | Source |
|---|---|
| Tx = message (header, instructions, account list, recent blockhash) + signatures. Lifecycle: fetch blockhash, simulate, sign, send to RPC, leader includes it | https://solana.com/docs/core/transactions/confirmation |
| "In Solana, there is no concept of a mempool", RPC forwards to current and next leaders over UDP, leader schedule known per epoch (~2 days), retries every 2 s until finalized or blockhash expires | https://solana.com/developers/guides/advanced/retry |
| sendTransaction success only means the RPC received it; preflight checks signatures, blockhash within the last 150 blocks, simulates | same page |
| Recent blockhash valid for 151 blocks (max processing age 150, 0-indexed), about 60–90 s; expired tx is never processed and safe to re-sign | confirmation page + retry guide |
| Slots ~400 ms (can fluctuate 400–600 ms), leaders produce 4 consecutive slots, PoH hashes tx ids into a sequential hash chain, block's last PoH hash is the blockhash | confirmation page |
| Commitment levels: processed (can roll back), confirmed (voted by >2/3 of active stake), finalized (maximum lockout) | https://solana.com/docs/rpc ("Configuring State Commitment") |
| Finalized is typically at least 32 slots behind confirmed, about 13 s | confirmation page ("at least a 32 slot difference … about 13 seconds"); retry guide says "~30 blocks after confirmed" |
| Fees: base fee 5,000 lamports per signature (50% burned, 50% validator), priority fee = ceil(compute_unit_price x compute_unit_limit / 1,000,000) lamports, 100% to validator | https://solana.com/docs/core/fees |
| First signature is the tx id, getSignatureStatuses returns slot / err / confirmationStatus | retry guide ("Response") |

## Simplifications to be aware of
- The General mode is chain-agnostic wording. Ethereum mode uses the mempool/nonce model, Solana mode swaps in leader forwarding, recent blockhash expiry and commitment levels.
- Ethereum "Justified" is shown after confirmations stack up, which in real time happens at the next epoch boundary, the sim compresses this.
- "Insufficient fee" on Solana is modelled as the fee payer not being able to pay the fee (rejected), since Solana has no hard minimum priority fee.
- The confirmation blocks (+1, +2, +3) are a generic illustration, Ethereum finality is checkpoint-based, not a block count.
