pragma solidity >=0.8.6;

library GluwacoinModel {
    /**
     * @dev Enum of the different domains of signature.
     */
    enum SigDomain {
        /*0*/
        Nothing,
        /*1*/
        Burn,
        /*2*/
        Mint,
        /*3*/
        Transfer,
        /*4*/
        Reserve
    }

    struct AddressUint256Tuple {
        address addressVal;
        uint256 uintVal;
    }

    struct TokenExchangeModel {
        uint32 rate;
        /// @dev if the exchange rate = 0.12 the rate  = 12 and decimal place base  = 100
        uint32 decimalPlaceBase;
    }
}
