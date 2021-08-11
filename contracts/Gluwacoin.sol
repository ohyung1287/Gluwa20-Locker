// SPDX-License-Identifier: MIT
pragma solidity >=0.8.6;

import "./abstracts/ContextUpgradeable.sol";
import "./abstracts/ERC20Reservable.sol";
import "./abstracts/Convertible.sol";
import "./abstracts/ETHlessTransfer.sol";

/**
 * @dev Extension of {ERC20} that adds a set of accounts with the {MinterRole},
 * which have permission to mint (create) new tokens as they see fit.
 *
 * At construction, the deployer of the contract is the only minter.
 */
contract Gluwacoin is
    ContextUpgradeable,
    ERC20Reservable,
    Convertible,
    ETHlessTransfer
{
    function initialize(string memory name_, string memory symbol_)
        external
        initializer
    {
        __ERC20ETHless_init_unchained(name_, symbol_);
        __Convertible_init_unchained(decimals());
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setTokenExchange(
        IERC20 token,
        uint8 decimals,
        uint32 newExchangeRate,
        uint32 newExchangeRateDecimalPlaceBase
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return
            _setTokenExchange(
                token,
                decimals,
                newExchangeRate,
                newExchangeRateDecimalPlaceBase
            );
    }

    function lockFrom(
        address account,
        IERC20 token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return _lockFrom(account, token, amount);
    }

    function convertAllFrom(address account, IERC20 token)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bool)
    {
        uint256 lockedAmount = _locks[account][token];
        _release(account, token, lockedAmount);

        uint256 convertedAmount = _calculateConversion(token, lockedAmount);
        _mint(account, convertedAmount);

        return true;
    }

    function convertFrom(
        address account,
        IERC20 token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return _convert(account, token, amount);
    }

    function convert(IERC20 token, uint256 amount) external returns (bool) {
        return _convert(_msgSender(), token, amount);
    }

    function _convert(
        address account,
        IERC20 token,
        uint256 amount
    ) private returns (bool) {
        _release(account, token, amount);

        uint256 convertedAmount = _calculateConversion(token, amount);
        _mint(account, convertedAmount);

        return true;
    }

    /** @dev check the amount of available tokens of sender to transfer.
     * Must override all the parent's functions
     * Do 2 checks:
     * - Total balance must be equal or higher than the transferring amount.
     * - Unreserving (the amount of tokens are not put as a reserve) must be equal or higher than the transferring amount.
     */

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ETHlessTransfer, ERC20Reservable) {
        ETHlessTransfer._beforeTokenTransfer(from, to, amount);
        ERC20Reservable._beforeTokenTransfer(from, to, amount);
    }

    uint256[50] private __gap;
}
