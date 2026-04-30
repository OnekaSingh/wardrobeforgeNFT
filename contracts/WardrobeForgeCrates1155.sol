// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title WardrobeForgeCrates1155
/// @notice Users buy crate products, but the NFTs they receive are wearable item token IDs.
/// @dev This scaffold is designed for the "buy crate, mint item immediately" flow discussed for Wert.
contract WardrobeForgeCrates1155 is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    struct CrateConfig {
        uint256 priceWei;
        uint32 maxQuantityPerTx;
        bool active;
    }

    struct RewardOption {
        uint256 tokenId;
        uint32 weight;
        bool active;
    }

    string public name = "WardrobeForge Wearables";
    string public symbol = "WFW";

    string private _baseMetadataURI;
    address public treasury;
    bool public payerAllowlistEnabled;

    mapping(uint256 => CrateConfig) public crateConfigs;
    mapping(uint256 => RewardOption[]) private _crateRewards;
    mapping(uint256 => uint256) public crateTotalWeight;
    mapping(uint256 => bool) public itemTokenExists;
    mapping(address => bool) public approvedPayers;

    event TreasuryUpdated(address indexed treasury);
    event PayerAllowlistModeUpdated(bool enabled);
    event PayerApprovalUpdated(address indexed payer, bool approved);
    event BaseMetadataURIUpdated(string baseMetadataURI);
    event ItemTokenRegistered(uint256 indexed tokenId, bool enabled);
    event CrateConfigured(uint256 indexed crateId, uint256 priceWei, uint32 maxQuantityPerTx, bool active);
    event CrateRewardsReplaced(uint256 indexed crateId, uint256 rewardCount, uint256 totalWeight);
    event CratePurchased(
        address indexed payer,
        address indexed recipient,
        uint256 indexed crateId,
        uint256 quantity,
        uint256 totalPriceWei
    );
    event CrateOpened(
        address indexed recipient,
        uint256 indexed crateId,
        uint256 indexed tokenId,
        uint256 rollNumber
    );

    error InvalidRecipient();
    error CrateNotActive();
    error InvalidQuantity();
    error IncorrectPayment(uint256 expected, uint256 actual);
    error UnauthorizedPayer(address payer);
    error EmptyRewardTable();
    error InvalidRewardWeight();
    error UnknownItemToken(uint256 tokenId);
    error TreasuryTransferFailed();

    constructor(address initialOwner, address initialTreasury, string memory baseMetadataURI)
        ERC1155("")
        Ownable(initialOwner)
    {
        if (initialTreasury == address(0)) revert InvalidRecipient();

        treasury = initialTreasury;
        _baseMetadataURI = baseMetadataURI;
    }

    /// @notice Main purchase function for Wert or any other payer flow.
    /// @dev `msg.sender` can be a payment wallet while `recipient` is the user's wallet.
    function buyCrates(address recipient, uint256 crateId, uint256 quantity) external payable nonReentrant {
        if (recipient == address(0)) revert InvalidRecipient();
        if (payerAllowlistEnabled && !approvedPayers[msg.sender]) revert UnauthorizedPayer(msg.sender);

        CrateConfig memory crate = crateConfigs[crateId];
        if (!crate.active) revert CrateNotActive();
        if (quantity == 0 || quantity > crate.maxQuantityPerTx) revert InvalidQuantity();

        uint256 totalPriceWei = crate.priceWei * quantity;
        if (msg.value != totalPriceWei) revert IncorrectPayment(totalPriceWei, msg.value);

        RewardOption[] storage rewards = _crateRewards[crateId];
        uint256 totalWeight = crateTotalWeight[crateId];
        if (rewards.length == 0 || totalWeight == 0) revert EmptyRewardTable();

        emit CratePurchased(msg.sender, recipient, crateId, quantity, totalPriceWei);

        for (uint256 roll = 0; roll < quantity; roll++) {
            uint256 tokenId = _drawReward(crateId, recipient, roll, totalWeight);
            _mint(recipient, tokenId, 1, "");
            emit CrateOpened(recipient, crateId, tokenId, roll + 1);
        }

        (bool ok,) = treasury.call{value: msg.value}("");
        if (!ok) revert TreasuryTransferFailed();
    }

    /// @notice Returns current payout table for a crate.
    function getCrateRewards(uint256 crateId) external view returns (RewardOption[] memory) {
        return _crateRewards[crateId];
    }

    /// @notice Convenience helper for frontend and backend quoting.
    function quoteCratePurchase(uint256 crateId, uint256 quantity) external view returns (uint256 totalPriceWei) {
        CrateConfig memory crate = crateConfigs[crateId];
        if (!crate.active) revert CrateNotActive();
        if (quantity == 0 || quantity > crate.maxQuantityPerTx) revert InvalidQuantity();

        return crate.priceWei * quantity;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidRecipient();

        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setBaseMetadataURI(string calldata newBaseMetadataURI) external onlyOwner {
        _baseMetadataURI = newBaseMetadataURI;
        emit BaseMetadataURIUpdated(newBaseMetadataURI);
    }

    function setPayerAllowlistEnabled(bool enabled) external onlyOwner {
        payerAllowlistEnabled = enabled;
        emit PayerAllowlistModeUpdated(enabled);
    }

    function setApprovedPayer(address payer, bool approved) external onlyOwner {
        approvedPayers[payer] = approved;
        emit PayerApprovalUpdated(payer, approved);
    }

    function setItemTokenEnabled(uint256 tokenId, bool enabled) external onlyOwner {
        itemTokenExists[tokenId] = enabled;
        emit ItemTokenRegistered(tokenId, enabled);
    }

    function configureCrate(uint256 crateId, uint256 priceWei, uint32 maxQuantityPerTx, bool active) external onlyOwner {
        if (maxQuantityPerTx == 0) revert InvalidQuantity();

        crateConfigs[crateId] = CrateConfig({
            priceWei: priceWei,
            maxQuantityPerTx: maxQuantityPerTx,
            active: active
        });

        emit CrateConfigured(crateId, priceWei, maxQuantityPerTx, active);
    }

    /// @notice Replaces the full reward table for one crate.
    /// @dev Each reward points to an item token ID, not to another crate token.
    function replaceCrateRewards(uint256 crateId, RewardOption[] calldata rewards) external onlyOwner {
        delete _crateRewards[crateId];

        uint256 totalWeight;
        for (uint256 i = 0; i < rewards.length; i++) {
            RewardOption calldata reward = rewards[i];
            if (!itemTokenExists[reward.tokenId]) revert UnknownItemToken(reward.tokenId);
            if (reward.weight == 0) revert InvalidRewardWeight();

            _crateRewards[crateId].push(reward);
            if (reward.active) {
                totalWeight += reward.weight;
            }
        }

        crateTotalWeight[crateId] = totalWeight;
        emit CrateRewardsReplaced(crateId, rewards.length, totalWeight);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string.concat(_baseMetadataURI, tokenId.toString(), ".json");
    }

    /// @dev Placeholder randomness for scaffold purposes only.
    /// Replace this with Chainlink VRF or a trusted reveal design before production.
    function _drawReward(
        uint256 crateId,
        address recipient,
        uint256 roll,
        uint256 totalWeight
    ) internal view returns (uint256 tokenId) {
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    blockhash(block.number - 1),
                    recipient,
                    msg.sender,
                    crateId,
                    roll
                )
            )
        ) % totalWeight;

        RewardOption[] storage rewards = _crateRewards[crateId];
        uint256 cumulativeWeight;
        for (uint256 i = 0; i < rewards.length; i++) {
            RewardOption storage reward = rewards[i];
            if (!reward.active) continue;

            cumulativeWeight += reward.weight;
            if (random < cumulativeWeight) {
                return reward.tokenId;
            }
        }

        revert EmptyRewardTable();
    }
}
