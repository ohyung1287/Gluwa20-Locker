pragma solidity >=0.5.0;

/** @title Library functions used by contracts within this ecosystem.*/
library ConversionModels {   
    
    struct TokenExchangeModel {      
        uint32 rate;
        /// @dev if the exchange rate = 0.12 the rate  = 12 and decimal place base  = 100
        uint32 decimalPlaceBase;        
    }
}