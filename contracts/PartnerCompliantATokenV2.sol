// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IATokenPolicy} from "./IATokenPolicy.sol";

/// @notice Minimal non-upgradeable CVA fallback based on Cleanverse's RuleV2 template.
/// @dev Every token movement is gated by the external Cleanverse policy contract.
contract PartnerCompliantATokenV2 is ERC20, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IATokenPolicy public immutable policy;
    uint8 private immutable _tokenDecimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address policy_,
        address admin_
    ) ERC20(name_, symbol_) Ownable(admin_) {
        require(policy_ != address(0), "policy=0");
        require(admin_ != address(0), "admin=0");

        policy = IATokenPolicy(policy_);
        _tokenDecimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(MINTER_ROLE, admin_);
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    function setRuleV2(IATokenPolicy.RuleV2 calldata rule)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        policy.setRuleV2FromToken(rule);
    }

    function addRuleV2(IATokenPolicy.RuleV2 calldata rule)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        policy.addRuleV2FromToken(rule);
    }

    function removeRuleV2(uint256 index)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        policy.removeRuleV2FromToken(index);
    }

    function getRulesV2()
        external
        view
        returns (IATokenPolicy.RuleV2[] memory)
    {
        return policy.getRulesV2(address(this));
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (!policy.canTransfer(address(this), from, to, amount)) {
            revert IATokenPolicy.TransferNotAllowed();
        }
        super._update(from, to, amount);
    }
}
