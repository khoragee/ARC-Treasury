// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ArcTreasury {
    address public owner;
    IERC20 public usdc;

    uint256 public lowBalanceThreshold;
    uint256 public lastPayoutTime;
    uint256 public payoutInterval;
    uint256 public priceDropThreshold; // in basis points e.g. 500 = 5%

    bool public paused;

    struct Contributor {
        address wallet;
        uint256 amount;
        bool active;
    }

    Contributor[] public contributors;

    event PayoutExecuted(address indexed to, uint256 amount, uint256 timestamp);
    event TreasuryPaused(string reason);
    event TreasuryResumed();
    event FundsDeposited(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Treasury is paused");
        _;
    }

    constructor(
        address _usdc,
        uint256 _lowBalanceThreshold,
        uint256 _payoutInterval
    ) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
        lowBalanceThreshold = _lowBalanceThreshold;
        payoutInterval = _payoutInterval;
        lastPayoutTime = block.timestamp;
    }

    // Deposit USDC into treasury
    function deposit(uint256 amount) external onlyOwner {
        require(
            usdc.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );
        emit FundsDeposited(amount);
    }

    // Add a contributor
    function addContributor(address wallet, uint256 amount) external onlyOwner {
        contributors.push(Contributor(wallet, amount, true));
    }

    // Remove a contributor
    function removeContributor(uint256 index) external onlyOwner {
        contributors[index].active = false;
    }

    // Trigger: scheduled payout
    function executeScheduledPayout() external notPaused {
        require(
            block.timestamp >= lastPayoutTime + payoutInterval,
            "Too early"
        );
        _payAll();
        lastPayoutTime = block.timestamp;
    }

    // Trigger: low balance check
    function checkLowBalance() external view returns (bool) {
        return usdc.balanceOf(address(this)) < lowBalanceThreshold;
    }

    // Trigger: pause if price drops (called by owner with off-chain price data)
    function triggerPricePause(string calldata reason) external onlyOwner {
        paused = true;
        emit TreasuryPaused(reason);
    }

    function resume() external onlyOwner {
        paused = false;
        emit TreasuryResumed();
    }

    // Internal: pay all active contributors
    function _payAll() internal {
        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributors[i].active) {
                usdc.transfer(contributors[i].wallet, contributors[i].amount);
                emit PayoutExecuted(
                    contributors[i].wallet,
                    contributors[i].amount,
                    block.timestamp
                );
            }
        }
    }

    // Manual payout override by owner
    function manualPayout() external onlyOwner notPaused {
        _payAll();
    }

    // Withdraw all funds back to owner
    function withdrawAll() external onlyOwner {
        uint256 bal = usdc.balanceOf(address(this));
        usdc.transfer(owner, bal);
    }

    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}