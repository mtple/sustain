// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Sustain} from "../src/Sustain.sol";

contract MockTIP20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool public failTransferFrom;
    mapping(address => bool) public failTransferTo;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setFailTransferFrom(bool fail) external {
        failTransferFrom = fail;
    }

    function setFailTransferTo(address to, bool fail) external {
        failTransferTo[to] = fail;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransferTo[to]) return false;
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (failTransferFrom) return false;
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "insufficient allowance");
        allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}

contract SustainTest is Test {
    Sustain internal sustain;
    MockTIP20 internal token;

    address internal supporter = address(0xA11CE);
    address internal creator = address(0xB0B);

    uint256 internal constant START_BALANCE = 200_000_000;
    uint256 internal constant DEFAULT_DEPOSIT = 1_000_000;

    function setUp() external {
        token = new MockTIP20();
        sustain = new Sustain(address(token));

        token.mint(supporter, START_BALANCE);
        vm.prank(supporter);
        token.approve(address(sustain), type(uint256).max);
    }

    function test_ConstructorRevertIfZeroToken() external {
        vm.expectRevert("Invalid token");
        new Sustain(address(0));
    }

    function test_StartStream_Succeeds() external {
        vm.prank(supporter);
        sustain.startStream(creator, DEFAULT_DEPOSIT);

        (address streamCreator, uint256 deposit,, bool active) = sustain.getStream(supporter);
        assertEq(streamCreator, creator);
        assertEq(deposit, DEFAULT_DEPOSIT);
        assertTrue(active);
        assertEq(token.balanceOf(address(sustain)), DEFAULT_DEPOSIT);
    }

    function test_StartStream_RevertIfDepositTooSmall() external {
        uint256 tooSmall = sustain.MIN_PAYMENT() - 1;
        vm.prank(supporter);
        vm.expectRevert("Deposit too small");
        sustain.startStream(creator, tooSmall);
    }

    function test_StartStream_RevertIfDepositTooLarge() external {
        uint256 tooLarge = sustain.MAX_DEPOSIT() + 1;
        vm.prank(supporter);
        vm.expectRevert("Deposit too large");
        sustain.startStream(creator, tooLarge);
    }

    function test_StartStream_RevertIfAlreadyStreaming() external {
        _startDefaultStream();
        vm.prank(supporter);
        vm.expectRevert("Already streaming");
        sustain.startStream(creator, DEFAULT_DEPOSIT);
    }

    function test_StartStream_RevertIfZeroCreator() external {
        vm.prank(supporter);
        vm.expectRevert("Invalid recipient");
        sustain.startStream(address(0), DEFAULT_DEPOSIT);
    }

    function test_StartStream_RevertIfSelfPayment() external {
        vm.prank(supporter);
        vm.expectRevert("Cannot pay yourself");
        sustain.startStream(supporter, DEFAULT_DEPOSIT);
    }

    function test_StartStream_RevertIfTransferFromFails() external {
        token.setFailTransferFrom(true);
        vm.prank(supporter);
        vm.expectRevert("Deposit transfer failed");
        sustain.startStream(creator, DEFAULT_DEPOSIT);
    }

    function test_StopStream_RevertIfNoActiveStream() external {
        vm.prank(supporter);
        vm.expectRevert("No active stream");
        sustain.stopStream(supporter);
    }

    function test_StopStream_QuickTapPaysAndRefundsInstantly() external {
        _startDefaultStream();
        vm.prank(supporter);
        sustain.stopStream(supporter);

        assertEq(token.balanceOf(creator), sustain.MIN_PAYMENT());
        assertEq(token.balanceOf(supporter), START_BALANCE - sustain.MIN_PAYMENT());
        assertEq(token.balanceOf(address(sustain)), 0);
        assertEq(sustain.claimable(creator), 0);
        assertEq(sustain.refundable(supporter), 0);
    }

    function test_StopStream_BillsByDurationInstantly() external {
        _startDefaultStream();
        vm.warp(block.timestamp + 3);

        vm.prank(supporter);
        sustain.stopStream(supporter);

        uint256 expected = 3 * sustain.RATE();
        assertEq(token.balanceOf(creator), expected);
        assertEq(token.balanceOf(supporter), START_BALANCE - expected);
        assertEq(sustain.claimable(creator), 0);
        assertEq(sustain.refundable(supporter), 0);
    }

    function test_StopStream_BillsAtMostSixtySeconds() external {
        _startDefaultStream();
        vm.warp(block.timestamp + sustain.MAX_HOLD_SECONDS() + 30);

        vm.prank(supporter);
        sustain.stopStream(supporter);

        uint256 expected = sustain.MAX_HOLD_SECONDS() * sustain.RATE();
        assertEq(token.balanceOf(creator), expected);
        assertEq(token.balanceOf(supporter), START_BALANCE - expected);
        assertEq(sustain.claimable(creator), 0);
        assertEq(sustain.refundable(supporter), 0);
    }

    function test_StopStream_CapsPaymentAtDepositIfLowerThanMaxHoldCost() external {
        vm.prank(supporter);
        sustain.startStream(creator, 10_000);

        vm.warp(block.timestamp + sustain.MAX_HOLD_SECONDS());
        vm.prank(supporter);
        sustain.stopStream(supporter);

        assertEq(token.balanceOf(creator), 10_000);
        assertEq(token.balanceOf(supporter), START_BALANCE - 10_000);
        assertEq(sustain.claimable(creator), 0);
        assertEq(sustain.refundable(supporter), 0);
    }

    function test_StopStream_FallbackAccruesRefundIfRefundTransferFails() external {
        _startDefaultStream();
        token.setFailTransferTo(supporter, true);

        vm.prank(supporter);
        sustain.stopStream(supporter);

        (,,, bool active) = sustain.getStream(supporter);
        assertFalse(active);
        assertEq(token.balanceOf(creator), sustain.MIN_PAYMENT());
        assertEq(sustain.claimable(creator), 0);
        assertEq(sustain.refundable(supporter), DEFAULT_DEPOSIT - sustain.MIN_PAYMENT());
    }

    function test_StopStream_FallbackAccruesCreatorIfCreatorTransferFails() external {
        _startDefaultStream();
        token.setFailTransferTo(creator, true);

        vm.warp(block.timestamp + 3);
        vm.prank(supporter);
        sustain.stopStream(supporter);

        uint256 expected = 3 * sustain.RATE();
        assertEq(token.balanceOf(supporter), START_BALANCE - expected);
        assertEq(sustain.claimable(creator), expected);
        assertEq(sustain.refundable(supporter), 0);
    }

    function test_StopStream_ThirdPartyCanCloseAfterMaxHold() external {
        _startDefaultStream();
        vm.warp(block.timestamp + sustain.MAX_HOLD_SECONDS());

        address anyone = address(0xCAFE);
        vm.prank(anyone);
        sustain.stopStream(supporter);

        (,,, bool active) = sustain.getStream(supporter);
        assertFalse(active);

        uint256 expected = sustain.MAX_HOLD_SECONDS() * sustain.RATE();
        assertEq(token.balanceOf(creator), expected);
        assertEq(token.balanceOf(supporter), START_BALANCE - expected);
    }

    function test_StopStream_ThirdPartyRevertIfStreamStillActive() external {
        _startDefaultStream();
        vm.warp(block.timestamp + sustain.MAX_HOLD_SECONDS() - 1);

        address anyone = address(0xCAFE);
        vm.prank(anyone);
        vm.expectRevert("Stream still active");
        sustain.stopStream(supporter);
    }

    function test_GetCurrentCost_ZeroWhenInactive() external view {
        assertEq(sustain.getCurrentCost(supporter), 0);
    }

    function test_GetCurrentCost_FloorAndMaxHoldCap() external {
        _startDefaultStream();
        assertEq(sustain.getCurrentCost(supporter), sustain.MIN_PAYMENT());

        vm.warp(block.timestamp + sustain.MAX_HOLD_SECONDS() + 500);
        assertEq(sustain.getCurrentCost(supporter), sustain.MAX_HOLD_SECONDS() * sustain.RATE());
    }

    function test_Claim_Succeeds() external {
        _accrueCreatorFallback();
        uint256 expected = 3 * sustain.RATE();
        token.setFailTransferTo(creator, false);

        vm.prank(creator);
        sustain.claim();

        assertEq(sustain.claimable(creator), 0);
        assertEq(token.balanceOf(creator), expected);
    }

    function test_Claim_RevertIfNoClaimableBalance() external {
        vm.prank(creator);
        vm.expectRevert("No claimable balance");
        sustain.claim();
    }

    function test_Claim_RevertIfTransferFails() external {
        _accrueCreatorFallback();
        token.setFailTransferTo(creator, true);

        vm.prank(creator);
        vm.expectRevert("Claim transfer failed");
        sustain.claim();

        assertEq(sustain.claimable(creator), 3 * sustain.RATE());
    }

    function test_ClaimRefund_Succeeds() external {
        _accrueRefundFallback();
        token.setFailTransferTo(supporter, false);

        vm.prank(supporter);
        sustain.claimRefund();

        assertEq(sustain.refundable(supporter), 0);
        assertEq(token.balanceOf(supporter), START_BALANCE - 3 * sustain.RATE());
    }

    function test_ClaimRefund_RevertIfNoRefundableBalance() external {
        vm.prank(supporter);
        vm.expectRevert("No refundable balance");
        sustain.claimRefund();
    }

    function test_ClaimRefund_RevertIfTransferFails() external {
        _accrueRefundFallback();
        token.setFailTransferTo(supporter, true);

        vm.prank(supporter);
        vm.expectRevert("Refund transfer failed");
        sustain.claimRefund();

        assertEq(sustain.refundable(supporter), DEFAULT_DEPOSIT - 3 * sustain.RATE());
    }

    function testFuzz_StopStream_PaymentBounds(uint256 elapsed, uint256 depositAmount) external {
        elapsed = bound(elapsed, 0, 1_000_000);
        depositAmount = bound(depositAmount, sustain.MIN_PAYMENT(), sustain.MAX_DEPOSIT());

        vm.prank(supporter);
        sustain.startStream(creator, depositAmount);
        vm.warp(block.timestamp + elapsed);

        vm.prank(supporter);
        sustain.stopStream(supporter);

        uint256 billedElapsed = elapsed > sustain.MAX_HOLD_SECONDS() ? sustain.MAX_HOLD_SECONDS() : elapsed;
        uint256 expected = billedElapsed * sustain.RATE();
        if (expected < sustain.MIN_PAYMENT()) expected = sustain.MIN_PAYMENT();
        if (expected > depositAmount) expected = depositAmount;

        assertEq(token.balanceOf(creator), expected);
        assertEq(token.balanceOf(supporter), START_BALANCE - expected);
        assertEq(sustain.claimable(creator), 0);
        assertEq(sustain.refundable(supporter), 0);
    }

    function testFuzz_GetCurrentCost_MatchesExpected(uint256 elapsed, uint256 depositAmount) external {
        elapsed = bound(elapsed, 0, 1_000_000);
        depositAmount = bound(depositAmount, sustain.MIN_PAYMENT(), sustain.MAX_DEPOSIT());

        vm.prank(supporter);
        sustain.startStream(creator, depositAmount);
        vm.warp(block.timestamp + elapsed);

        uint256 billedElapsed = elapsed > sustain.MAX_HOLD_SECONDS() ? sustain.MAX_HOLD_SECONDS() : elapsed;
        uint256 expected = billedElapsed * sustain.RATE();
        if (expected < sustain.MIN_PAYMENT()) expected = sustain.MIN_PAYMENT();
        if (expected > depositAmount) expected = depositAmount;

        assertEq(sustain.getCurrentCost(supporter), expected);
    }

    function _startDefaultStream() internal {
        vm.prank(supporter);
        sustain.startStream(creator, DEFAULT_DEPOSIT);
    }

    function _accrueCreatorFallback() internal {
        _startDefaultStream();
        token.setFailTransferTo(creator, true);
        vm.warp(block.timestamp + 3);
        vm.prank(supporter);
        sustain.stopStream(supporter);
    }

    function _accrueRefundFallback() internal {
        _startDefaultStream();
        token.setFailTransferTo(supporter, true);
        vm.warp(block.timestamp + 3);
        vm.prank(supporter);
        sustain.stopStream(supporter);
    }
}
