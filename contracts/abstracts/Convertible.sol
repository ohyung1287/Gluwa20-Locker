pragma solidity >=0.8.7;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libs/GluwacoinModels.sol";
import "../libs/HashMapIndex.sol";

contract Convertible is Initializable, ContextUpgradeable {
    using HashMapIndex for HashMapIndex.HashMapping;

    uint8 private _baseTokenDecimal;
    uint8 private _convertedTokenDecimal;
    IERC20 private _baseToken;
    GluwacoinModels.TokenExchangeModel private _exchangeRate;

    HashMapIndex.HashMapping private _lockerIndex;

    mapping(bytes32 => GluwacoinModels.Locker) internal _locker;
    mapping(address => bytes32) internal _lockerOwner;

    event Locked(
        bytes32 indexed lockerHash,
        address indexed sender,
        uint256 _value
    );

    event Mint(address indexed _mintTo, uint256 _value);
    event Burnt(address indexed _burnFrom, uint256 _value);

    function __Convertible_init_unchained(
        IERC20 token,
        uint8 convertedTokenDecimal
    ) internal initializer {
        _baseToken = token;
        _convertedTokenDecimal = convertedTokenDecimal;
        _lockerIndex.firstIdx = 1;
        _lockerIndex.nextIdx = 1;
        _lockerIndex.count = 0;
    }

    function getTokenExchangeDetails()
        public
        view
        returns (GluwacoinModels.TokenExchangeModel memory)
    {
        return _exchangeRate;
    }

    function getLocker(bytes32 lockerHash)
        public
        view
        returns (GluwacoinModels.Locker memory)
    {
        return _locker[lockerHash];
    }

    function _setTokenExchange(
        uint32 newExchangeRate,
        uint32 newExchangeRateDecimalPlaceBase
    ) internal returns (bool) {
        _exchangeRate.rate = newExchangeRate;
        _exchangeRate.decimalPlaceBase = newExchangeRateDecimalPlaceBase;
        return true;
    }

    function _lockFrom(
        address account,
        uint256 amount,
        uint256 fee
    ) internal returns (bool) {
        require(
            _baseToken.transferFrom(account, address(this), amount),
            "Convertible: Can't lock the token amount"
        );
        bytes32 lockerHash;
        uint256 lockedAmount = amount - fee;

        bytes32 existingLockerHash = _lockerOwner[account];

        if (_locker[existingLockerHash].idx > 0) {
            _locker[existingLockerHash].amount += lockedAmount;
        } else {
            lockerHash = keccak256(
                abi.encodePacked(_lockerIndex.nextIdx, address(this), account)
            );

            _locker[lockerHash] = GluwacoinModels.Locker({
                idx: _lockerIndex.nextIdx,
                owner: account,
                amount: lockedAmount,
                exchangeRate: _exchangeRate,
                state: GluwacoinModels.LockerState.Active
            });

            _lockerIndex.add(lockerHash);
            _lockerOwner[account] = lockerHash;
        }

        emit Mint(account, amount);

        emit Locked(lockerHash, account, lockedAmount);

        return true;
    }

    function _withdraw(
        address account,
        uint256 amount,
        uint256 fee
    ) internal returns (bool) {
        bytes32 lockerHash = _lockerOwner[account];
        require(
            _locker[lockerHash].amount >= amount,
            "Convertible: Can't withdraw token from the locker"
        );
        uint256 withdrawnAmount = _calculateWithdrawal(
            amount,
            _locker[lockerHash].exchangeRate.rate,
            _locker[lockerHash].exchangeRate.decimalPlaceBase
        );
        require(
            withdrawnAmount > fee,
            "Convertible: Withdrawn amount must be higher than fee"
        );
        _locker[lockerHash].amount -= withdrawnAmount;
        _baseToken.transfer(account, withdrawnAmount - fee);

        emit Burnt(account, amount);

        return true;
    }

    function _withdrawBaseToken(address collector, uint256 amount)
        internal
        returns (bool)
    {
        _baseToken.transfer(collector, amount);
        return true;
    }

    function _calculateConversion(uint256 amount)
        internal
        view
        returns (uint256)
    {
        return (amount * _exchangeRate.rate) / _exchangeRate.decimalPlaceBase;
    }

    function _calculateWithdrawal(
        uint256 amount,
        uint32 rate,
        uint32 decimalPlaceBase
    ) internal pure returns (uint256) {
        return (amount * decimalPlaceBase) / rate;
    }

    uint256[50] private __gap;
}
