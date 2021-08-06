// SPDX-License-Identifier: MIT
pragma solidity >=0.8.6;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./abstracts/ERC20Reservable.sol";
import "./abstracts/ERC20Pausable.sol";
import "./abstracts/Convertible.sol";
import "./abstracts/TransactionFee.sol";
import "./abstracts/ETHlessTransfer.sol";

/**
 * @dev Extension of {ERC20} that adds a set of accounts with the {MinterRole},
 * which have permission to mint (create) new tokens as they see fit.
 *
 * At construction, the deployer of the contract is the only minter.
 */
contract Gluwacoin is
    ContextUpgradeable,
    ERC20Pausable,
    ERC20Reservable,
    Convertible,
    TransactionFee,
    ETHlessTransfer
{
    function initialize(uint256 fee) public initializer {
        __Context_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __Convertible_init_unchained(address(this), decimals());
        __ERC20Reservable_init_unchained();
        __ERC20Pausable_init_unchained();
        __ERC20ETHless_init_unchained();
        __TransactionFee_init_unchained(_msgSender(), fee);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function _convert(
        address account,
        IERC20 token,
        uint256 amount
    ) private returns (bool) {
        return true;
    }

    function _convertAll(address account, IERC20 token) private returns (bool) {
        return true;
    }

    function setFee(uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bool)
    {
        _setFee(amount);
        return true;
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
        return _convertAll(account, token);
    }

    function convertAll(IERC20 token) external returns (bool) {
        return _convertAll(_msgSender(), token);
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

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return super._pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return super._unpause();
    }

    /**
     * @dev Moves `amount` tokens from the `sender`'s account to `recipient`
     * and moves `fee` tokens from the `sender`'s account to a relayer's address.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits two {Transfer} events.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the `sender` must have a balance of at least the sum of `amount` and `fee`.
     * - the `nonce` is only used once per `sender`.
     */
    function transfer(
        address sender,
        address recipient,
        uint256 amount,
        uint256 fee,
        uint256 nonce,
        bytes calldata sig
    ) external whenNotPaused returns (bool success) {
        return _transfer(sender, recipient, amount, fee, nonce, sig);
    }

    function transfer(address recipient, uint256 amount)
        public
        override
        whenNotPaused
        returns (bool)
    {
        uint256 totalAmount = amount + _fee;
        address sender = _msgSender();
        _beforeTokenTransfer(sender, recipient, totalAmount);
        _collect(sender, _fee);
        _transfer(sender, recipient, amount);

        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        uint256 totalAmount = amount + _fee;
        _beforeTokenTransfer(sender, recipient, totalAmount);
        _collect(sender, _fee);
        _transfer(sender, recipient, amount);
        return true;
    }

    function burn(uint256 amount) public returns (bool) {
        _burn(_msgSender(), amount);
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
