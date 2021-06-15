// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5;
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils//Address.sol";
import "./Validate.sol";
/**
 * @dev Extension of {ERC20} that allows users to send ETHless transfer by hiring a transaction relayer to pay the
 * gas fee for them. The relayer gets paid in this ERC20 token for `fee`.
 */
contract ETHlessTransfer {
    using Address for address;
    using ECDSA for bytes32;

    mapping (address => mapping (uint256 => bool)) private _usedNonces;
    
    function _validateSignature(address contractAddress, address sender, address recipient, uint256 amount, uint256 fee, uint256 nonce, bytes memory sig) internal pure {
        bytes32 hash = keccak256(abi.encodePacked(contractAddress, sender, recipient, amount, fee, nonce));
        Validate.validateSignature(hash, sender, sig);
    }

    function _useNonce(address signer, uint256 nonce) internal {
        require(!_usedNonces[signer][nonce], "ETHless: the nonce has already been used for this address");
        _usedNonces[signer][nonce] = true;
    }
}

    