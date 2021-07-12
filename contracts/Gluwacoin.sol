// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5;

import "@openzeppelin/contracts/utils/Context.sol";
import "./abstracts/ETHLessTransfer.sol";
import "./abstracts/ERC20Pausable.sol";

/**
 * @dev Extension of {ERC20} that adds a set of accounts with the {MinterRole},
 * which have permission to mint (create) new tokens as they see fit.
 *
 * At construction, the deployer of the contract is the only minter.
 */
contract Gluwacoin {
    function initialize()
        public
        initializer
    {
        ConvertibleInit(address(this), decimals);
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

    function setFee(uint256 amount) external onlyAdmin returns (bool) {
        _setFee(amount);
        return true;
    }

    function setTokenExchange(
        IERC20 token,
        uint8 decimals,
        uint32 newExchangeRate,
        uint32 newExchangeRateDecimalPlaceBase
    ) external onlyAdmin returns (bool) {
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
    ) external onlyAdmin returns (bool) {
        return _lockFrom(account, token, amount);
    }

    function convertAllFrom(address account, IERC20 token)
        external
        onlyAdmin
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
    ) external onlyAdmin returns (bool) {
        return _convert(account, token, amount);
    }

    function convert(IERC20 token, uint256 amount) external returns (bool) {
        return _convert(_msgSender(), token, amount);
    }

    function pause() external onlyAdmin returns (bool) {
        return super._pause();
    }

    function unpause() external onlyAdmin returns (bool) {
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
        bytes memory sig
    ) public whenNotPaused returns (bool success) {
        _useNonce(sender, nonce);
        uint256 totalAmount = amount + fee;
        _beforeTokenTransfer(sender, totalAmount);

        _validateSignature(
            address(this),
            sender,
            recipient,
            amount,
            fee,
            nonce,
            sig
        );

        _collect(sender, fee);
        _transfer(sender, recipient, amount);

        return true;
    }

    function transfer(address recipient, uint256 amount)
        public
        whenNotPaused
        returns (bool)
    {
        uint256 totalAmount = amount + _fee;
        address sender = _msgSender();
        _beforeTokenTransfer(sender, totalAmount);

        _collect(sender, _fee);
        _transfer(sender, recipient, amount);

        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public whenNotPaused returns (bool) {
        uint256 totalAmount = amount + _fee;
        _beforeTokenTransfer(sender, totalAmount);
        _collect(sender, _fee);
        return ExtendedERC20.transferFrom(sender, recipient, amount);
    }

    function burn(uint256 amount) public returns (bool) {
        _burn(_msgSender(), amount);
        return true;
    }

    /** @dev check the amount of available tokens of sender to transfer.
     *
     * Do 2 checks:
     * - Total balance must be equal or higher than the transferring amount.
     * - Unreserving (the amount of tokens are not put as a reserve) must be equal or higher than the transferring amount.
     */
    function _beforeTokenTransfer(address from, uint256 amount) internal view {
        require(
            balanceOf(from) >= amount,
            "ERC20WithSafeTransfer: insufficient balance"
        );
    }

    /** @dev Collects `fee` from the sender.
     *
     * Emits a {Transfer} event.
     */
    function _collect(address sender, uint256 amount) internal {
        _transfer(sender, _getFeeCollectionAddress(), amount);
    }
}
