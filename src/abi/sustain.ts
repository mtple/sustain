export const sustainAbi = [
  // --- Read functions ---
  {
    type: "function",
    name: "TOKEN",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "RATE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_PAYMENT",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_DEPOSIT",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_HOLD_SECONDS",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "streams",
    inputs: [{ name: "supporter", type: "address" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "deposit", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimable",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "refundable",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getStream",
    inputs: [{ name: "supporter", type: "address" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "deposit", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentCost",
    inputs: [{ name: "supporter", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // --- Write functions ---
  {
    type: "function",
    name: "startStream",
    inputs: [
      { name: "creator", type: "address" },
      { name: "depositAmount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "stopStream",
    inputs: [{ name: "supporter", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRefund",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // --- Events ---
  {
    type: "event",
    name: "StreamStarted",
    inputs: [
      { name: "supporter", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "startTime", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StreamStopped",
    inputs: [
      { name: "supporter", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "closer", type: "address", indexed: false },
      { name: "payment", type: "uint256", indexed: false },
      { name: "refund", type: "uint256", indexed: false },
      { name: "duration", type: "uint256", indexed: false },
      { name: "creatorPaidDirect", type: "bool", indexed: false },
      { name: "supporterRefundedDirect", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CreatorPaidDirect",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SupporterRefundedDirect",
    inputs: [
      { name: "supporter", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CreatorAccrued",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalClaimable", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SupporterRefunded",
    inputs: [
      { name: "supporter", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "totalRefundable", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RefundClaimed",
    inputs: [
      { name: "supporter", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
