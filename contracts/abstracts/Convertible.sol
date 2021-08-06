pragma solidity >=0.8.6;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libs/CommonTuples.sol";
import "../libs/ConversionModels.sol";

contract Convertible is Initializable, ContextUpgradeable {

    mapping(address => mapping(IERC20 => uint256)) private _locks;
    mapping(IERC20 => ConversionModels.TokenExchangeModel)
        private _baseTokens;

    mapping(IERC20 => uint8) private _baseTokenDecimals;
    
    uint8 private _convertedTokenDecimal;   
    IERC20 private _convertedToken;

    event Locked(address indexed sender, IERC20 indexed token, uint256 _value);

    function __Convertible_init(        
        address convertedToken,
        uint8 convertedTokenDecimal
    ) internal initializer {       
        __Context_init_unchained();
        __Convertible_init_unchained(convertedToken,convertedTokenDecimal);    
    }

    function __Convertible_init_unchained(        
        address convertedToken,
        uint8 convertedTokenDecimal
    ) internal initializer {       
        _convertedToken = IERC20(convertedToken);
        _convertedTokenDecimal = convertedTokenDecimal;
    }

    function getTokenExchangeDetails(IERC20 token)
        public
        view
        returns (ConversionModels.TokenExchangeModel memory)
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
        uint256 tokenBalance = token.balanceOf(account);

        require(
            _baseTokens[token].rate > 0,
            "Convertible: The base token is not supported."
        );
        require(
            tokenBalance >= amount,
            "Convertible: The locked amount is higher than the balance amount"
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
        uint256 lockedAmount = _locks[account][token];
        require(
            amount <= lockedAmount,
            "Convertible: The released amount is higher than the locked amount"
        );

        _locks[account][token] = lockedAmount - amount;

        return amount;
    }

    function withdraw(IERC20 token, uint256 amount) public returns (bool) {
        address sender = _msgSender();
        uint256 lockedAmount = _locks[sender][token];

        require(
            lockedAmount >= amount,
            "Convertible: The withdrawal amount is higher than the locked amount"
        );

        _locks[sender][token] -= amount;
        require(
            token.transfer(sender, amount),
            "Convertible: Can't lock the token amount"
        );

        return true;
    }

    function _calculateConversion(IERC20 token, uint256 amount)
        internal
        view
        returns (uint256)
    {
        ConversionModels.TokenExchangeModel storage rateModel = _baseTokens[token];
        require(
            rateModel.rate > 0,
            "Convertible: The base token is not supported."
        );
        return
            _decimalConversionFromBaseToken(
                _baseTokenDecimals[token],
                _convertedTokenDecimal,
                (amount * _baseTokens[token].rate)/(_baseTokens[token].decimalPlaceBase)
            );
    }

    //gas saving comparison
    function _calculateConversionV2(IERC20 token, uint256 amount)
        internal
        view
        returns (uint256)
    {
        require(
            _baseTokens[token].rate > 0,
            "Convertible: The base token is not supported."
        );

        return
            _decimalConversionFromBaseToken(
                _baseTokenDecimals[token],
                _convertedTokenDecimal,
                (amount * _baseTokens[token].rate) / _baseTokens[token].decimalPlaceBase              
            );
    }

    function _decimalConversionFromBaseToken(uint8 baseTokenDecimal, uint8 convertedTokenDecimal, uint256 amount)
        internal
        pure
        returns (uint256)
    {
        if (baseTokenDecimal < convertedTokenDecimal) {
            return amount * (10**(convertedTokenDecimal - baseTokenDecimal));
        } else {
            return amount / (10**(baseTokenDecimal - convertedTokenDecimal));
        }
    }

    function info()
        external
        view
        returns (         
            IERC20,
            uint8
        )
    {
        return (              
            _convertedToken,
            _convertedTokenDecimal
        );
    }

    uint256[50] private __gap;
}
