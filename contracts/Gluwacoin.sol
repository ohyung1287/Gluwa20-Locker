pragma solidity >=0.8.7;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./abstracts/ERC20Reservable.sol";
import "./abstracts/Convertible.sol";
import "./abstracts/ERC20ETHless.sol";

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
    ERC20ETHless
{

    function initialize(
        IERC20 token,
        string memory name_,
        string memory symbol_
    ) external initializer {
        __ERC20ETHless_init_unchained(name_, symbol_);
        __Convertible_init_unchained(token, decimals());
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setTokenExchange(
        uint32 newExchangeRate,
        uint32 newExchangeRateDecimalPlaceBase
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return
            _setTokenExchange(newExchangeRate, newExchangeRateDecimalPlaceBase);
    }

    function getLockerByAcccount(address account)
        external
        view
        returns (GluwacoinModels.Locker memory)
    {
        bytes32 lockerHash = _lockerOwner[account];
        return _locker[lockerHash];
    }

    /**
     * @dev Gluwa triggers the withdraw (burn) onbehalf of users.
     * `fee` is used to pay gas for the transaction.
     *
     * Requirements:
     * - the account must have at least `amount` of `gluwacoin` in the locker.
     * - `withdrawn amount` must be greater than fee.
     * - `fee` will be deducted from the `amount` of `base token`.
     */
    function burn(
        address account,
        uint256 amount,
        uint256 fee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        _burn(account, amount);
        return _withdraw(account, amount, fee);
    }

    /**
     * @dev Users burn Gluwacoin to withdraw token by themselves.
     * `fee` will be 0 as users will need to pay gas from their account.
     *
     * Requirements:
     * - Only owner can `withdraw`.
     * - the account must have sufficient eth to pay gas.
     */
    function burn(uint256 amount) external returns (bool) {
        _burn(_msgSender(), amount);
        return _withdraw(_msgSender(), amount, 0);
    }

    /**
     * @dev Gluwa triggers the conversion (mint) onbehalf of users.
     * `fee` is used to pay gas for the transaction.
     *
     * Requirements:
     * - the account must have at least `amount` of `base token`.
     * - `amount` must be greater than fee.
     * - `fee` will be deducted from the `amount` of `base token`.
     */
    function mint(
        address account,
        uint256 amount,
        uint256 fee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        return _convert(account, amount, fee);
    }

    /**
     * @dev Users convert (mint) token by themselves.
     * `fee` will be 0 as users will need to pay gas from their account.
     *
     * Requirements:
     * - the account must have at least `amount` of `base token`.
     * - the account must have sufficient eth to pay gas.
     */
    function mint(uint256 amount) external returns (bool) {
        return _convert(_msgSender(), amount, 0);
    }

    function _convert(
        address account,
        uint256 amount,
        uint256 fee
    ) private returns (bool) {
        _lockFrom(account, amount, fee);

        uint256 convertedAmount = _calculateConversion(amount - fee);
        _mint(account, convertedAmount);

        return true;
    }

    /** @dev The contract admin can withdraw an amount of the received `fee` from the contract.
     */
    function collectFee(address collector, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bool)
    {
        return _withdrawBaseToken(collector, amount);
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
    ) internal override(ERC20ETHless, ERC20Reservable) {
        ERC20ETHless._beforeTokenTransfer(from, to, amount);
        ERC20Reservable._beforeTokenTransfer(from, to, amount);
    }

    uint256[50] private __gap;
}
