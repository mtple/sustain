// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITIP20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract Sustain {
    ITIP20 public immutable token;

    uint256 public constant DEPOSIT = 1_000_000; // $1.00 (6 decimals)
    uint256 public constant RATE = 5_000; // $0.005/sec (6 decimals)
    uint256 public constant MIN_PAYMENT = 1_000; // $0.001 floor (quick tap)

    struct Stream {
        address artist;
        uint256 deposit;
        uint256 startTime;
        bool active;
    }

    mapping(address => Stream) public streams;

    event StreamStarted(
        address indexed listener,
        address indexed artist,
        uint256 startTime
    );

    event StreamStopped(
        address indexed listener,
        address indexed artist,
        uint256 payment,
        uint256 refund,
        uint256 duration
    );

    constructor(address _token) {
        token = ITIP20(_token);
    }

    function startStream(address artist) external {
        require(!streams[msg.sender].active, "Already streaming");
        require(artist != address(0), "Invalid artist");
        require(artist != msg.sender, "Cannot pay yourself");

        require(
            token.transferFrom(msg.sender, address(this), DEPOSIT),
            "Deposit transfer failed"
        );

        streams[msg.sender] = Stream({
            artist: artist,
            deposit: DEPOSIT,
            startTime: block.timestamp,
            active: true
        });

        emit StreamStarted(msg.sender, artist, block.timestamp);
    }

    function stopStream() external {
        Stream storage stream = streams[msg.sender];
        require(stream.active, "No active stream");

        uint256 elapsed = block.timestamp - stream.startTime;
        uint256 payment = elapsed * RATE;

        // Floor: quick taps still pay MIN_PAYMENT
        if (payment < MIN_PAYMENT) {
            payment = MIN_PAYMENT;
        }

        // Cap: can't exceed deposit
        if (payment > stream.deposit) {
            payment = stream.deposit;
        }

        uint256 refund = stream.deposit - payment;
        address artist = stream.artist;

        delete streams[msg.sender];

        if (payment > 0) {
            require(token.transfer(artist, payment), "Artist payment failed");
        }
        if (refund > 0) {
            require(token.transfer(msg.sender, refund), "Refund failed");
        }

        emit StreamStopped(msg.sender, artist, payment, refund, elapsed);
    }

    function getCurrentCost(address listener) external view returns (uint256) {
        Stream storage stream = streams[listener];
        if (!stream.active) return 0;

        uint256 elapsed = block.timestamp - stream.startTime;
        uint256 cost = elapsed * RATE;
        if (cost < MIN_PAYMENT) cost = MIN_PAYMENT;
        return cost > stream.deposit ? stream.deposit : cost;
    }

    function getStream(
        address listener
    )
        external
        view
        returns (
            address artist,
            uint256 deposit,
            uint256 startTime,
            bool active
        )
    {
        Stream storage stream = streams[listener];
        return (stream.artist, stream.deposit, stream.startTime, stream.active);
    }
}
