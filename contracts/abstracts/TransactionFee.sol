pragma solidity >=0.8.6;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract TransactionFee is Initializable {
    address private _feeCollector;
    uint256 internal _fee;

    function __TransactionFee_init_unchained(address account, uint256 amount)
        internal
        initializer
    {
        _feeCollector = account;
        _fee = amount;
    }

    function _setFeeCollectionAddress(address account) internal {
        _feeCollector = account;
    }

    function getFeeCollectionAddress() external view returns (address) {
        return _feeCollector;
    }

    function _getFeeCollectionAddress() internal view returns (address) {
        return _feeCollector;
    }

    function _setFee(uint256 amount) internal returns (bool) {
        _fee = amount;
        return true;
    }

    function getFee() external view returns (uint256) {
        return _fee;
    }

    uint256[50] private __gap;
}
