// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title WardrobeForgeCrates1155
/// @notice Users buy crate products, but the NFTs they receive are wearable item token IDs.
/// @author WardrobeForge
/// @dev This contract is designed for the "buy crate, mint item immediately" flow used by the app.
contract WardrobeForgeCrates1155 is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Configuration for a purchasable crate product.
    struct CrateConfig {
        uint256 priceWei;
        uint32 maxQuantityPerTx;
        bool active;
    }

    /// @notice Weighted reward entry for one crate loot table.
    struct RewardOption {
        uint256 tokenId;
        uint32 weight;
        bool active;
    }

    /// @notice Human-readable collection name for marketplace integrations.
    string public constant name = "WardrobeForge Wearables";
    /// @notice Short collection symbol for marketplace integrations.
    string public constant symbol = "WFW";

    /// @dev Base URI prefix used to construct token metadata URIs.
    string private _baseMetadataURI;
    /// @notice Address that receives native-token crate purchase proceeds.
    address public treasury;
    /// @notice Whether only allowlisted payer addresses may call `buyCrates`.
    bool public payerAllowlistEnabled;

    /// @notice Crate configuration keyed by `crateId`.
    mapping(uint256 => CrateConfig) public crateConfigs;
    /// @dev Reward tables keyed by `crateId`.
    mapping(uint256 => RewardOption[]) private _crateRewards;
    /// @notice Sum of active reward weights for each crate.
    mapping(uint256 => uint256) public crateTotalWeight;
    /// @notice Tracks whether a wearable item token ID may appear in crate reward tables.
    mapping(uint256 => bool) public itemTokenExists;
    /// @notice Addresses allowed to pay on behalf of users when allowlist mode is enabled.
    mapping(address => bool) public approvedPayers;
    /// @notice Tracks fiat-paid mint authorizations that have already been redeemed.
    mapping(bytes32 => bool) public usedPaidMintAuthorizations;

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
    event PaidCrateRedeemed(
        address indexed signer,
        address indexed recipient,
        uint256 indexed crateId,
        uint256 quantity,
        bytes32 paymentId
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
    error InvalidPaymentAuthorization();
    error PaymentAuthorizationExpired();
    error PaymentAuthorizationAlreadyUsed();

    /// @notice Deploys the crate purchase contract.
    /// @param initialOwner Account that controls admin-only configuration functions.
    /// @param initialTreasury Account that receives crate purchase proceeds.
    /// @param baseMetadataURI Initial base URI prefix for token metadata.
    constructor(address initialOwner, address initialTreasury, string memory baseMetadataURI)
        ERC1155("")
        Ownable(initialOwner)
    {
        if (initialTreasury == address(0)) revert InvalidRecipient();

        treasury = initialTreasury;
        _baseMetadataURI = baseMetadataURI;
    }

    /// @notice Main purchase function for direct wallet purchases or approved payer flows.
    /// @dev `msg.sender` can be a payment wallet while `recipient` is the user's wallet.
    function buyCrates(address recipient, uint256 crateId, uint256 quantity) external payable nonReentrant {
        if (recipient == address(0)) revert InvalidRecipient();
        if (payerAllowlistEnabled && !approvedPayers[msg.sender]) revert UnauthorizedPayer(msg.sender);

        uint256 totalPriceWei = _quoteCratePurchase(crateId, quantity);
        if (msg.value != totalPriceWei) revert IncorrectPayment(totalPriceWei, msg.value);

        emit CratePurchased(msg.sender, recipient, crateId, quantity, totalPriceWei);
        _openCrates(recipient, crateId, quantity);

        (bool ok,) = treasury.call{value: msg.value}("");
        if (!ok) revert TreasuryTransferFailed();
    }

    /// @notice Mints crates after off-chain fiat checkout. A relayer may pay Polygon gas.
    function redeemPaidCrates(
        address recipient,
        uint256 crateId,
        uint256 quantity,
        bytes32 paymentId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (recipient == address(0)) revert InvalidRecipient();
        if (block.timestamp > deadline) revert PaymentAuthorizationExpired();

        bytes32 authorizationHash = getPaidMintAuthorizationHash(recipient, crateId, quantity, paymentId, deadline);
        if (usedPaidMintAuthorizations[authorizationHash]) revert PaymentAuthorizationAlreadyUsed();

        address signer = authorizationHash.toEthSignedMessageHash().recover(signature);
        if (signer != owner()) revert InvalidPaymentAuthorization();

        usedPaidMintAuthorizations[authorizationHash] = true;
        emit PaidCrateRedeemed(signer, recipient, crateId, quantity, paymentId);
        emit CratePurchased(msg.sender, recipient, crateId, quantity, 0);
        _openCrates(recipient, crateId, quantity);
    }

    /// @notice Returns the signed payload hash for a fiat-paid mint authorization.
    function getPaidMintAuthorizationHash(
        address recipient,
        uint256 crateId,
        uint256 quantity,
        bytes32 paymentId,
        uint256 deadline
    ) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, recipient, crateId, quantity, paymentId, deadline));
    }

    /// @notice Returns the current payout table for a crate.
    /// @param crateId Numeric crate identifier used by frontend and checkout integrations.
    function getCrateRewards(uint256 crateId) external view returns (RewardOption[] memory) {
        return _crateRewards[crateId];
    }

    /// @notice Returns the native-token cost for a crate purchase.
    /// @param crateId Numeric crate identifier used by frontend and checkout integrations.
    /// @param quantity Number of crates to buy in a single purchase.
    function quoteCratePurchase(uint256 crateId, uint256 quantity) external view returns (uint256 totalPriceWei) {
        return _quoteCratePurchase(crateId, quantity);
    }

    function _quoteCratePurchase(uint256 crateId, uint256 quantity) internal view returns (uint256 totalPriceWei) {
        CrateConfig memory crate = crateConfigs[crateId];
        if (!crate.active) revert CrateNotActive();
        if (quantity == 0 || quantity > crate.maxQuantityPerTx) revert InvalidQuantity();

        return crate.priceWei * quantity;
    }

    /// @notice Updates the treasury address that receives purchase proceeds.
    /// @param newTreasury Replacement treasury address.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidRecipient();

        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /// @notice Updates the base metadata URI prefix.
    /// @param newBaseMetadataURI Replacement metadata URI prefix.
    function setBaseMetadataURI(string calldata newBaseMetadataURI) external onlyOwner {
        _baseMetadataURI = newBaseMetadataURI;
        emit BaseMetadataURIUpdated(newBaseMetadataURI);
    }

    /// @notice Enables or disables the payer allowlist.
    /// @param enabled Whether allowlist mode should be active.
    function setPayerAllowlistEnabled(bool enabled) external onlyOwner {
        payerAllowlistEnabled = enabled;
        emit PayerAllowlistModeUpdated(enabled);
    }

    /// @notice Adds or removes a payer from the allowlist.
    /// @param payer Address allowed to pay on behalf of end users.
    /// @param approved Whether the payer should be approved.
    function setApprovedPayer(address payer, bool approved) external onlyOwner {
        approvedPayers[payer] = approved;
        emit PayerApprovalUpdated(payer, approved);
    }

    /// @notice Enables or disables a wearable item token ID for crate rewards.
    /// @param tokenId Wearable token ID.
    /// @param enabled Whether the token ID may be used in reward tables.
    function setItemTokenEnabled(uint256 tokenId, bool enabled) external onlyOwner {
        itemTokenExists[tokenId] = enabled;
        emit ItemTokenRegistered(tokenId, enabled);
    }

    /// @notice Creates or updates one crate product definition.
    /// @param crateId Numeric crate identifier.
    /// @param priceWei Native-token price for one crate.
    /// @param maxQuantityPerTx Maximum quantity purchasable in one call.
    /// @param active Whether purchases for this crate are enabled.
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
    /// @dev Each reward points to a wearable item token ID, not to another crate token.
    /// @param crateId Numeric crate identifier.
    /// @param rewards Full reward table to store for the crate.
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

    /// @inheritdoc ERC1155
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string.concat(_baseMetadataURI, tokenId.toString(), ".json");
    }

    function _openCrates(address recipient, uint256 crateId, uint256 quantity) internal {
        CrateConfig memory crate = crateConfigs[crateId];
        if (!crate.active) revert CrateNotActive();
        if (quantity == 0 || quantity > crate.maxQuantityPerTx) revert InvalidQuantity();

        uint256 totalWeight = crateTotalWeight[crateId];
        if (_crateRewards[crateId].length == 0 || totalWeight == 0) revert EmptyRewardTable();

        for (uint256 roll = 0; roll < quantity; roll++) {
            uint256 tokenId = _drawReward(crateId, recipient, roll, totalWeight);
            _mint(recipient, tokenId, 1, "");
            emit CrateOpened(recipient, crateId, tokenId, roll + 1);
        }
    }

    /// @dev Placeholder randomness for scaffold purposes only.
    /// Replace this with Chainlink VRF or a trusted reveal design before production.
    /// Avoids timestamp-based entropy so the fallback mechanism does not depend on block time.
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
