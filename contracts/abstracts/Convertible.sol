pragma solidity >=0.8.6;

import "./ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libs/GluwacoinModel.sol";

contract Convertible is Initializable, ContextUpgradeable {
    mapping(IERC20 => GluwacoinModel.TokenExchangeModel) private _baseTokens;

    mapping(IERC20 => uint8) private _baseTokenDecimals;

    uint8 private _convertedTokenDecimal;

    mapping(address => mapping(IERC20 => uint256)) internal _locks;

    event Locked(address indexed sender, IERC20 indexed token, uint256 _value);

    function __Convertible_init_unchained(
        uint8 convertedTokenDecimal
    ) internal initializer {
        _convertedTokenDecimal = convertedTokenDecimal;
    }

    function getTokenExchangeDetails(IERC20 token)
        public
        view
        returns (GluwacoinModel.TokenExchangeModel memory)
    {
        return _baseTokens[token];
    }

    function getLocked(address account, IERC20 token)
        public
        view
        returns (uint256)
    {
        return _locks[account][token];
    }

    function _setTokenExchange(
        IERC20 token,
        uint8 decimals,
        uint32 newExchangeRate,
        uint32 newExchangeRateDecimalPlaceBase
    ) internal returns (bool) {
        _baseTokenDecimals[token] = decimals;
        _baseTokens[token].rate = newExchangeRate;
        _baseTokens[token].decimalPlaceBase = newExchangeRateDecimalPlaceBase;
        return true;
    }

    function lock(IERC20 token, uint256 amount) public returns (bool) {
        return _lockFrom(_msgSender(), token, amount);
    }

    function _lockFrom(
        address account,
        IERC20 token,
        uint256 amount
    ) internal returns (bool) {
        require(
            _baseTokens[token].rate > 0,
            "Convertible: The base token is not supported."
        );
        
        require(
            token.transferFrom(account, address(this), amount),
            "Convertible: Can't lock the token amount"
        );

        _locks[account][token] = _locks[account][token] + amount;

        emit Locked(account, token, amount);

        return true;
    }

    function _release(
        address account,
        IERC20 token,
        uint256 amount
    ) internal returns (uint256) {        
        _locks[account][token] -= amount;
        return amount;
    }
    
    function withdraw(IERC20 token, uint256 amount) public returns (bool) {    
        _locks[_msgSender()][token] -= amount;
        require(
            token.transfer(_msgSender(), amount),
            "Convertible: Can't withdraw the token amount"
        );

        return true;
    }

    function _calculateConversion(IERC20 token, uint256 amount)
        internal
        view
        returns (uint256)
    {
        GluwacoinModel.TokenExchangeModel storage rateModel = _baseTokens[
            token
        ];
        require(
            rateModel.rate > 0,
            "Convertible: The base token is not supported."
        );
        return
            _decimalConversionFromBaseToken(
                _baseTokenDecimals[token],
                _convertedTokenDecimal,
                (amount * _baseTokens[token].rate) /
                    (_baseTokens[token].decimalPlaceBase)
            );
    }    

    function _decimalConversionFromBaseToken(
        uint8 baseTokenDecimal,
        uint8 convertedTokenDecimal,
        uint256 amount
    ) internal pure returns (uint256) {
        if (baseTokenDecimal < convertedTokenDecimal) {
            return amount * (10**(convertedTokenDecimal - baseTokenDecimal));
        } else {
            return amount / (10**(baseTokenDecimal - convertedTokenDecimal));
        }
    }    

    uint256[50] private __gap;
}
