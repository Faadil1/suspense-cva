// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IATokenPolicy} from "./IATokenPolicy.sol";

contract SuspenseVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum AllocationState {
        NONE,
        READY,
        PAID,
        SUSPENDED,
        RELEASED
    }

    struct Allocation {
        address recipient;
        uint256 amount;
        AllocationState state;
    }

    IERC20 public immutable token;
    IATokenPolicy public immutable policy;

    mapping(bytes32 => Allocation) public allocations;

    error InvalidArrayLengths();
    error InvalidAllocation();
    error DuplicateAllocation(bytes32 allocationId);
    error InsufficientFunding(uint256 required, uint256 available);
    error NotSuspended(bytes32 allocationId);
    error StillBlocked(bytes32 allocationId, bytes4 cleanverseSelector);

    event AllocationCreated(
        bytes32 indexed allocationId,
        address indexed recipient,
        uint256 amount
    );

    event AllocationPaid(
        bytes32 indexed allocationId,
        address indexed recipient,
        uint256 amount
    );

    event AllocationSuspended(
        bytes32 indexed allocationId,
        address indexed recipient,
        uint256 amount,
        bytes4 cleanverseSelector
    );

    event AllocationReleased(
        bytes32 indexed allocationId,
        address indexed recipient,
        uint256 amount
    );

    constructor(
        address token_,
        address policy_,
        address owner_
    ) Ownable(owner_) {
        require(token_ != address(0), "token=0");
        require(policy_ != address(0), "policy=0");
        require(owner_ != address(0), "owner=0");

        token = IERC20(token_);
        policy = IATokenPolicy(policy_);
    }

    function distribute(
        bytes32[] calldata allocationIds,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        uint256 length = allocationIds.length;

        if (
            length == 0 ||
            recipients.length != length ||
            amounts.length != length
        ) {
            revert InvalidArrayLengths();
        }

        uint256 requiredFunding;

        for (uint256 i = 0; i < length; ++i) {
            if (recipients[i] == address(0) || amounts[i] == 0) {
                revert InvalidAllocation();
            }

            if (allocations[allocationIds[i]].state != AllocationState.NONE) {
                revert DuplicateAllocation(allocationIds[i]);
            }

            requiredFunding += amounts[i];
        }

        uint256 available = token.balanceOf(address(this));
        if (available < requiredFunding) {
            revert InsufficientFunding(requiredFunding, available);
        }

        for (uint256 i = 0; i < length; ++i) {
            bytes32 allocationId = allocationIds[i];
            address recipient = recipients[i];
            uint256 amount = amounts[i];

            allocations[allocationId] = Allocation({
                recipient: recipient,
                amount: amount,
                state: AllocationState.READY
            });

            emit AllocationCreated(allocationId, recipient, amount);

            (bool allowed, bytes4 selector) = _policyAllows(
                recipient,
                amount
            );

            if (!allowed) {
                allocations[allocationId].state =
                    AllocationState.SUSPENDED;

                emit AllocationSuspended(
                    allocationId,
                    recipient,
                    amount,
                    selector
                );

                continue;
            }

            allocations[allocationId].state = AllocationState.PAID;
            token.safeTransfer(recipient, amount);

            emit AllocationPaid(
                allocationId,
                recipient,
                amount
            );
        }
    }

    function release(bytes32 allocationId)
        external
        onlyOwner
        nonReentrant
    {
        Allocation storage allocation = allocations[allocationId];

        if (allocation.state != AllocationState.SUSPENDED) {
            revert NotSuspended(allocationId);
        }

        (bool allowed, bytes4 selector) = _policyAllows(
            allocation.recipient,
            allocation.amount
        );

        if (!allowed) {
            revert StillBlocked(allocationId, selector);
        }

        allocation.state = AllocationState.RELEASED;

        token.safeTransfer(
            allocation.recipient,
            allocation.amount
        );

        emit AllocationReleased(
            allocationId,
            allocation.recipient,
            allocation.amount
        );
    }

    function _policyAllows(
        address recipient,
        uint256 amount
    )
        internal
        view
        returns (bool allowed, bytes4 selector)
    {
        try policy.canTransfer(
            address(token),
            address(this),
            recipient,
            amount
        ) returns (bool result) {
            return (result, bytes4(0));
        } catch (bytes memory reason) {
            if (reason.length >= 4) {
                assembly {
                    selector := mload(add(reason, 32))
                }
            }

            return (false, selector);
        }
    }
}
