pragma solidity >=0.8.7;

library GluwacoinModels {
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

    struct TokenExchangeModel {
        uint32 rate;
        /// @dev if the exchange rate = 0.12 the rate  = 12 and decimal place base  = 100
        uint32 decimalPlaceBase;
    }

    enum LockerState {
        /*0*/
        Pending, 
        /*1*/
        Active, 
        /*2*/
        Withdrawn
    }   

    struct Locker {
        // Index of this Locker
        uint256 idx;
        // address of the Locker owner
        address owner;             
        uint256 amount;
        LockerState state;
        TokenExchangeModel exchangeRate;      
    }

}
