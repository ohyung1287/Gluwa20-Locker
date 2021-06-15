pragma solidity >=0.8.5;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ExtendedERC20.sol";
import "../libs/CommonTuples.sol";
import "../libs/ConversionModels.sol";

contract Convertible is Initializable, Context {
    using SafeMath for uint256;

    mapping (address => CommonTuples.AddressUint256Tuple) private _locks;    
    mapping (address => ConversionModels.ExchangeRateModel) private _exchangeRate;  
    uint256 private _baseTokenDecimal;
    uint256 private _convertedTokenDecimal;
    IERC20 private _baseToken;
    IERC20 private _convertedToken;

    event Locked(address indexed sender, uint256 _value);
   
    function ConvertibleInit(uint256 exchangeRate, address baseToken, uint256 baseTokenDecimal, address convertedToken, uint256 convertedTokenDecimal) internal initializer {
        _exchangeRate = exchangeRate;
        _baseToken = IERC20(baseToken);
        _baseTokenDecimal = baseTokenDecimal;
        _convertedToken = IERC20(convertedToken);
        _convertedTokenDecimal = convertedTokenDecimal;
    }

    function exchangeRate() public view returns (uint256) {
        return _exchangeRate;
    }

    function balanceOfBaseToken(address account) public view returns (uint256) {        
        return _baseToken.balanceOf(account);
    }

    function getLocked(address account) public view returns (uint256) {        
        return _locks[account];
    }

    function _setExchangeRate(uint256 newExchangeRate) internal returns (bool) {
        _exchangeRate = newExchangeRate;
        return true;
    }

    function lock(uint256 amount) public returns (bool) {        
        return _lockFrom(_msgSender(), amount);
    }

    function _lockFrom(address account, uint256 amount) internal returns (bool) {        
        uint256 tokenBalance = balanceOfBaseToken(account);

        require(tokenBalance >= amount, "Convertible: The locked amount is higher than the balance amount");
        require(_baseToken.transferFrom(account, address(this), amount), "Convertible: Can't lock the token amount");
          
        _locks[account] =  _locks[account].add(amount);

        emit Locked(account, amount);

        return true;
    }

    function _release(address account, uint256 amount) internal returns (uint256) {        
        uint256 lockedAmount = _locks[account];        
        require(amount <= lockedAmount, "Convertible: The released amount is higher than the locked amount");        
          
        _locks[account] = lockedAmount - amount;

        return amount;
    }

    function _releaseAll(address account) internal returns (uint256) {        
        uint256 lockedAmount = _locks[account];      
        require(lockedAmount > 0, "Convertible: Nothing to release");        

        _locks[account] = 0;

        return lockedAmount;
    }

    function withdraw(uint256 amount) public returns (bool) {
        address sender = _msgSender();
        uint256 lockedAmount = _locks[sender];

        require(lockedAmount >= amount, "Convertible: The withdrawal amount is higher than the locked amount");

        _locks[sender] -= amount;
        require(_baseToken.transfer(sender, amount), "Convertible: Can't lock the token amount");      

        return true;
    }

    function withdrawAll() public returns (bool) {
        address sender = _msgSender();
        uint256 lockedAmount = _locks[sender];
        
        _locks[sender] = 0;
        require(_baseToken.transfer(sender, lockedAmount), "Convertible: Can't withdraw all the token amount");

        return true;
    }

    function _calculateConversion(uint256 amount) internal view returns (uint256) {      
        return _decimalConversionFromBaseToken(amount.mul(_exchangeRate));  
    }

    function _decimalConversionFromBaseToken(uint256 amount) internal view returns (uint256) {
        if (_baseTokenDecimal < _convertedTokenDecimal) {
            return amount.mul(10**(_convertedTokenDecimal - _baseTokenDecimal));
        }
        else{
            return amount.div(10**(_baseTokenDecimal- _convertedTokenDecimal));
        }
    }

    function info() external view returns (uint256, IERC20, uint256, IERC20, uint256) {
        return (_exchangeRate, _baseToken, _baseTokenDecimal, _convertedToken, _convertedTokenDecimal);
    }

}