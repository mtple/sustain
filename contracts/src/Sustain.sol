// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITIP20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract Sustain {
    ITIP20 public immutable TOKEN;

    uint256 public constant RATE = 5_000; // $0.005/sec (6 decimals)
    uint256 public constant MIN_PAYMENT = 1_000; // $0.001 floor (quick tap)
    uint256 public constant MAX_DEPOSIT = 100_000_000; // $100.00 (6 decimals)
    uint256 public constant MAX_HOLD_SECONDS = 60;

    struct Stream {
        address creator;
        uint256 deposit;
        uint256 startTime;
        bool active;
    }

    mapping(address => Stream) public streams;
    mapping(address => uint256) public claimable;
    mapping(address => uint256) public refundable;

    event StreamStarted(address indexed supporter, address indexed creator, uint256 startTime);

    event StreamStopped(
        address indexed supporter,
        address indexed creator,
        address closer,
        uint256 payment,
        uint256 refund,
        uint256 duration,
        bool creatorPaidDirect,
        bool supporterRefundedDirect
    );

    event CreatorPaidDirect(address indexed creator, uint256 amount);
    event SupporterRefundedDirect(address indexed supporter, uint256 amount);
    event CreatorAccrued(address indexed creator, uint256 amount, uint256 totalClaimable);
    event SupporterRefunded(address indexed supporter, uint256 amount, uint256 totalRefundable);
    event Claimed(address indexed creator, uint256 amount);
    event RefundClaimed(address indexed supporter, uint256 amount);

    constructor(address _token) {
        require(_token != address(0), "Invalid token");
        TOKEN = ITIP20(_token);
    }

    function startStream(address creator, uint256 depositAmount) external {
        require(!streams[msg.sender].active, "Already streaming");
        require(creator != address(0), "Invalid recipient");
        require(creator != msg.sender, "Cannot pay yourself");
        require(depositAmount >= MIN_PAYMENT, "Deposit too small");
        require(depositAmount <= MAX_DEPOSIT, "Deposit too large");

        require(TOKEN.transferFrom(msg.sender, address(this), depositAmount), "Deposit transfer failed");

        streams[msg.sender] =
            Stream({creator: creator, deposit: depositAmount, startTime: block.timestamp, active: true});

        emit StreamStarted(msg.sender, creator, block.timestamp);
    }

    function stopStream(address supporter) external {
        Stream storage stream = streams[supporter];
        require(stream.active, "No active stream");

        uint256 elapsed = block.timestamp - stream.startTime;

        // Only the supporter can stop early; anyone else must wait for max hold
        if (msg.sender != supporter) {
            require(elapsed >= MAX_HOLD_SECONDS, "Stream still active");
        }

        uint256 billedElapsed = elapsed > MAX_HOLD_SECONDS ? MAX_HOLD_SECONDS : elapsed;
        uint256 payment = billedElapsed * RATE;

        // Floor: quick taps still pay MIN_PAYMENT
        if (payment < MIN_PAYMENT) {
            payment = MIN_PAYMENT;
        }

        // Cap: can't exceed deposit
        if (payment > stream.deposit) {
            payment = stream.deposit;
        }

        uint256 refund = stream.deposit - payment;
        address creator = stream.creator;
        bool creatorPaidDirect;
        bool supporterRefundedDirect;

        delete streams[supporter];

        if (payment > 0) {
            bool paid = TOKEN.transfer(creator, payment);
            if (!paid) {
                claimable[creator] += payment;
                emit CreatorAccrued(creator, payment, claimable[creator]);
            } else {
                creatorPaidDirect = true;
                emit CreatorPaidDirect(creator, payment);
            }
        }
        if (refund > 0) {
            bool refunded = TOKEN.transfer(supporter, refund);
            if (!refunded) {
                refundable[supporter] += refund;
                emit SupporterRefunded(supporter, refund, refundable[supporter]);
            } else {
                supporterRefundedDirect = true;
                emit SupporterRefundedDirect(supporter, refund);
            }
        }

        emit StreamStopped(
            supporter, creator, msg.sender, payment, refund, billedElapsed, creatorPaidDirect, supporterRefundedDirect
        );
    }

    function getCurrentCost(address supporter) external view returns (uint256) {
        Stream storage stream = streams[supporter];
        if (!stream.active) return 0;

        uint256 elapsed = block.timestamp - stream.startTime;
        uint256 billedElapsed = elapsed > MAX_HOLD_SECONDS ? MAX_HOLD_SECONDS : elapsed;
        uint256 cost = billedElapsed * RATE;
        if (cost < MIN_PAYMENT) cost = MIN_PAYMENT;
        return cost > stream.deposit ? stream.deposit : cost;
    }

    function claim() external {
        uint256 amount = claimable[msg.sender];
        require(amount > 0, "No claimable balance");

        claimable[msg.sender] = 0;
        require(TOKEN.transfer(msg.sender, amount), "Claim transfer failed");

        emit Claimed(msg.sender, amount);
    }

    function claimRefund() external {
        uint256 amount = refundable[msg.sender];
        require(amount > 0, "No refundable balance");

        refundable[msg.sender] = 0;
        require(TOKEN.transfer(msg.sender, amount), "Refund transfer failed");

        emit RefundClaimed(msg.sender, amount);
    }

    function getStream(address supporter)
        external
        view
        returns (address creator, uint256 deposit, uint256 startTime, bool active)
    {
        Stream storage stream = streams[supporter];
        return (stream.creator, stream.deposit, stream.startTime, stream.active);
    }
}
