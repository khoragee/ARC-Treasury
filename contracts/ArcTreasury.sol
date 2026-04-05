// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ArcTreasury {
    address public owner;
    uint256 public lowBalanceThreshold;
    uint256 public lastPayoutTime;
    uint256 public payoutInterval;
    bool public isPaused;

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
        require(!isPaused, "Treasury is paused");
        _;
    }

    constructor(uint256 _lowBalanceThreshold, uint256 _payoutInterval) {
        owner = msg.sender;
        lowBalanceThreshold = _lowBalanceThreshold;
        payoutInterval = _payoutInterval;
        lastPayoutTime = block.timestamp;
    }

    receive() external payable {
        emit FundsDeposited(msg.value);
    }

    function addContributor(address wallet, uint256 amount) external onlyOwner {
        contributors.push(Contributor(wallet, amount, true));
    }

    function removeContributor(uint256 index) external onlyOwner {
        contributors[index].active = false;
    }

    function executeScheduledPayout() external notPaused {
        require(block.timestamp >= lastPayoutTime + payoutInterval, "Too early");
        _payAll();
        lastPayoutTime = block.timestamp;
    }

    function checkLowBalance() external view returns (bool) {
        return address(this).balance < lowBalanceThreshold;
    }

    function triggerPricePause(string calldata reason) external onlyOwner {
        isPaused = true;
        emit TreasuryPaused(reason);
    }

    function resume() external onlyOwner {
        isPaused = false;
        emit TreasuryResumed();
    }

    function _payAll() internal {
        require(contributors.length > 0, "No contributors");
        for (uint256 i = 0; i < contributors.length; i++) {
            if (contributors[i].active) {
                (bool success, ) = contributors[i].wallet.call{value: contributors[i].amount}("");
                require(success, "Transfer failed");
                emit PayoutExecuted(contributors[i].wallet, contributors[i].amount, block.timestamp);
            }
        }
    }

    function manualPayout() external onlyOwner notPaused {
        _payAll();
    }

    function withdrawAll() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        (bool success, ) = owner.call{value: bal}("");
        require(success, "Withdraw failed");
    }

    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
