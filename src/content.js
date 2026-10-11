// All copy for Web3 Lab ep.01. Chain-specific text: {g, e, s} = General / Ethereum / Solana.
// Facts are sourced in docs/sources.md. Numbers shown as "example" are illustrative.
export const CHAINS = [
  { id: 'g', label: 'General' },
  { id: 'e', label: 'Ethereum' },
  { id: 's', label: 'Solana' },
];
export const pick = (v, c) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[c] ?? v.g) : v);

export const CHAPTERS = [
  {
    key: 'sign', title: 'Sign', sub: 'The wallet builds and signs', dur: 7,
    lede: { g: 'A transaction is a message your wallet writes, then signs. The signature is the proof, the key never leaves.',
            e: 'Your wallet writes a typed transaction, then signs it with your private key. Only the signature travels.',
            s: 'Your wallet writes a message with instructions and a recent blockhash, then signs it. The key stays local.' },
    steps: [
      { at: 0, title: 'Build the transaction', body: {
        g: 'The wallet fills in who gets paid, how much, a fee and a counter that keeps your transactions in order.',
        e: 'Fields like to, value, nonce, gasLimit, maxFeePerGas and maxPriorityFeePerGas. A plain transfer uses 21,000 gas.',
        s: 'A header, a list of instructions, the accounts they touch and a recent blockhash that works like a timestamp.' } },
      { at: 2.6, title: 'Sign with the private key', body: {
        g: 'The private key turns the message into a signature. Anyone can check it with your address, nobody can forge it.',
        e: 'The key signs the payload and produces v, r, s. The signed bytes also give the transaction its hash.',
        s: 'The fee payer signs the message. The first signature doubles as the transaction id.' } },
      { at: 5.0, title: 'Only the signature leaves', body: {
        g: 'What goes out is the signed transaction. The private key stays in the wallet, every time.',
        e: 'The signed, encoded transaction is what gets sent. The private key is never part of it.',
        s: 'The signed transaction is what gets sent. The private key is never part of it.' } },
    ],
    note: {
      g: ['Signed message', 'Proves approval without revealing the key'],
      e: ['Type 2 tx (EIP-1559)', 'Fee = base fee + priority fee (tip), capped by maxFeePerGas'],
      s: ['Message + signatures', 'Recent blockhash also sets an expiry'],
    },
  },
  {
    key: 'broadcast', title: 'Broadcast', sub: 'RPC node and gossip', dur: 6,
    lede: { g: 'The wallet hands the signed transaction to a node. The node checks it, then tells the rest of the network.',
            e: 'An execution client checks the signature and balance, then gossips the transaction to its peers.',
            s: 'An RPC node forwards the transaction straight to the current and next leaders, no gossip round.' },
    steps: [
      { at: 0, title: 'Send to an RPC node', body: {
        g: 'Wallets talk to a node over RPC. Submitting returns a hash right away, it does not mean the transaction is done.',
        e: 'The wallet calls the JSON-RPC API, eth_sendRawTransaction, on an execution client.',
        s: 'The wallet calls sendTransaction. A success reply only means the node received it.' } },
      { at: 1.8, title: 'The node checks it', body: {
        g: 'Is the signature valid, can the sender pay, is the counter right. Bad transactions stop here.',
        e: 'The client verifies the signature and that the sender has enough ETH, then adds it to its local mempool.',
        s: 'Preflight checks the signatures, that the blockhash is within the last 150 blocks, and simulates the transaction.' } },
      { at: 3.0, title: { g: 'Spread to peers', e: 'Gossip to peers', s: 'Forward to leaders' }, body: {
        g: 'Most chains gossip the transaction peer to peer. Some send it straight to whoever builds the next block.',
        e: 'Peers that hear it add it to their own mempool and pass it on, so it spreads widely and fast.',
        s: 'The leader schedule is known per epoch (about 2 days), so the node sends it to upcoming leaders and retries every 2 s.' } },
    ],
    note: {
      g: ['Two styles', 'Gossip to many peers, or forward to the next block producer'],
      e: ['Gossip network', 'Every node keeps its own local mempool'],
      s: ['No gossip round', 'UDP to the leader TPU, rebroadcast every 2 s'],
    },
  },
  {
    key: 'mempool', title: { g: 'Mempool', e: 'Mempool', s: 'Leader queue' }, sub: { g: 'Pending, sorted by fee', e: 'Pending, sorted by fee', s: 'No public mempool' }, dur: 8,
    lede: { g: 'Now it waits. Block space is limited, so the producer picks the transactions that pay the most first.',
            e: 'It sits in the mempool as pending. The base fee is the entry ticket, the tip decides who goes first.',
            s: 'Solana has no mempool. The transaction waits at the leader, which schedules higher priority fees first.' },
    steps: [
      { at: 0, title: { g: 'Wait as pending', e: 'Wait in the mempool', s: 'Wait at the leader' }, body: {
        g: 'Until a block includes it, the transaction is just pending. Only nodes that heard about it know it exists.',
        e: 'Every node holds a list of pending transactions. Yours sits there until a proposer picks it.',
        s: 'Until a leader processes it, only the client and relaying RPC nodes know about it.' } },
      { at: 2.6, title: 'Higher tip, earlier pick', body: {
        g: 'Drag the fee. Pay more and you move up the queue, pay too little and you miss the next block.',
        e: 'Offered price must at least equal the base fee. Above that, a bigger tip makes you more attractive to the proposer.',
        s: 'Priority fee = compute unit price x compute unit limit. It raises the chance the leader schedules you ahead.' } },
      { at: 5.2, title: { g: 'Order and expiry', e: 'Nonce keeps order', s: 'Blockhash sets a deadline' }, body: {
        g: 'Chains stop replays with a counter or an expiry. Get it wrong and the transaction waits or gets dropped.',
        e: 'Only the next nonce can be processed. A gap holds this and every later transaction until it is filled.',
        s: 'The recent blockhash must be within 151 blocks, about 60 to 90 s. After that it expires and is safe to re-sign.' } },
    ],
    note: {
      g: ['Fee market', 'Limited space, highest bids first'],
      e: ['Base fee burned', 'Tip goes to the validator'],
      s: ['No mempool', 'Leader orders by priority fee'],
    },
  },
  {
    key: 'block', title: 'Block', sub: 'Pick, execute, link', dur: 7,
    lede: { g: 'One validator gets to build the next block. It picks transactions, runs them, and links the block to the last one.',
            e: 'Every 12 s slot, one validator is chosen to propose. It executes the payload and links it to its parent.',
            s: 'The scheduled leader produces blocks in ~400 ms slots and hashes transactions into its Proof of History stream.' },
    steps: [
      { at: 0, title: { g: 'A producer is chosen', e: 'A proposer is chosen', s: 'The leader takes its slots' }, body: {
        g: 'Proof of stake chains pick who builds next from the validator set, in turn or at random.',
        e: 'One validator per 12 s slot, picked pseudo-randomly with RANDAO.',
        s: 'The leader schedule is set ahead of time, each leader produces 4 consecutive slots.' } },
      { at: 2.0, title: 'Execute and update state', body: {
        g: 'Transactions run in order. Balances change, sender pays value plus fee, receiver gets the value.',
        e: 'The execution client runs the transactions locally and computes the new state root.',
        s: 'The banking stage executes the transactions and PoH records which ones landed in the block.' } },
      { at: 4.5, title: 'Link to the previous block', body: {
        g: 'Each block carries the hash of the one before it. Change any old block and every hash after it breaks.',
        e: 'The block header holds parent_hash and state_root, then the block is gossiped to the network.',
        s: 'The block\'s last PoH hash becomes the blockhash that new transactions use as their recent blockhash.' } },
    ],
    note: {
      g: ['Hash chain', 'Every block points to its parent'],
      e: ['12 s slot', 'One proposer per slot, empty slots can happen'],
      s: ['~400 ms slot', 'Can fluctuate between 400 and 600 ms'],
    },
  },
  {
    key: 'consensus', title: 'Consensus', sub: 'Votes, confirmations, finality', dur: 8,
    lede: { g: 'Included is not final yet. Validators re-check the block and vote, and with enough stake behind it, it locks in.',
            e: 'Validators re-execute and attest. When two-thirds of staked ETH links two checkpoints, the block is finalized.',
            s: 'Validators vote on the block. Supermajority vote means confirmed, maximum lockout means finalized.' },
    steps: [
      { at: 0, title: 'Validators re-check and vote', body: {
        g: 'Other validators run the same transactions. If they agree with the result, they vote for the block.',
        e: 'A committee attests each slot, so every validator votes once per epoch of 32 slots.',
        s: 'Validators send votes for the block, weighted by their stake.' } },
      { at: 3.0, title: 'Confirmations stack up', body: {
        g: 'Every new block on top is one more confirmation. The deeper it sits, the harder it is to undo.',
        e: 'The block moves from head of chain, to justified, as attestations pile up.',
        s: 'processed, then confirmed once more than two-thirds of active stake voted for it.' } },
      { at: 5.4, title: 'Finality', body: {
        g: 'Finalized means reverting it would cost a huge part of the stake. Exchanges usually wait for this point.',
        e: 'Finalized after about 2 epochs, 64 slots x 12 s = 12.8 min. ethereum.org rounds it to about 15 min.',
        s: 'finalized at maximum lockout, typically at least 32 slots, about 13 s, after confirmed.' } },
    ],
    note: {
      g: ['Two-thirds rule', 'Supermajority of stake decides'],
      e: ['Casper FFG', 'Reverting costs at least 1/3 of staked ETH'],
      s: ['Commitment levels', 'processed, confirmed, finalized'],
    },
  },
  {
    key: 'receipt', title: 'Receipt', sub: 'Status, fee, explorer', dur: 7,
    lede: { g: 'The network keeps a record of what happened. Anyone can look it up by hash.',
            e: 'The receipt holds status, gas used and the effective gas price, readable from any node or explorer.',
            s: 'Look up the signature and you get its slot, fee, result and confirmation status.' },
    steps: [
      { at: 0, title: 'Read the receipt', body: {
        g: 'Success or failure, which block, how much it cost. Same data on every honest node.',
        e: 'eth_getTransactionReceipt returns status 1 or 0, gasUsed, effectiveGasPrice, blockNumber and logs.',
        s: 'getSignatureStatuses returns the slot, any error and confirmationStatus.' } },
      { at: 2.6, title: 'Where the fee went', body: {
        g: 'Part of the fee pays the block producer. Some chains burn a part of it.',
        e: 'Fee = gasUsed x effectiveGasPrice. The base fee is burned, the tip goes to the validator. Paid even if it fails.',
        s: 'Base fee 5,000 lamports per signature, half burned and half to the validator, priority fee all to the validator.' } },
      { at: 4.6, title: 'Verify, don\'t trust', body: {
        g: 'An explorer is just a window on public data. Paste the hash and check it yourself.',
        e: 'Paste the hash in any explorer or query your own node, the answer is the same.',
        s: 'Paste the signature in any explorer or query any RPC node, the answer is the same.' } },
    ],
    note: {
      g: ['Public record', 'Anyone can verify, nobody can edit'],
      e: ['status 0 still pays', 'Failed execution still uses gas'],
      s: ['Signature = tx id', 'First signature identifies the tx'],
    },
  },
];

let acc = 0;
export const STARTS = CHAPTERS.map((c) => { const s = acc; acc += c.dur; return s; });
export const TOTAL = acc;
export const chapterAt = (T) => { let i = 0; for (let k = 0; k < STARTS.length; k++) if (T >= STARTS[k] - 1e-6) i = k; return i; };
export const stepAt = (ch, lt) => { const st = CHAPTERS[ch].steps; let i = 0; st.forEach((s, k) => { if (lt >= s.at - 1e-6) i = k; }); return i; };
