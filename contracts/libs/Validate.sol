// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @dev Signature verification
 */
library Validate {
    using Address for address;
    using ECDSA for bytes32;

    /**
     * @dev Throws if given `sig` is an incorrect signature of the `sender`.
     */
    function validateSignature(bytes32 hash, address sender, bytes memory sig) internal pure returns (bool) {
        bytes32 messageHash = hash.toEthSignedMessageHash();

        address signer = messageHash.recover(sig);
        require(signer == sender, "Validate: invalid signature");

        return true;
    }
}
