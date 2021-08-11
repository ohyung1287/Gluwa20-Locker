// Load dependencies
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect } = require('chai');

const { BN } = require('@openzeppelin/test-helpers');

const name = 'ERC20WrapperGluwacoin';
const symbol = 'WG';

// Load compiled artifacts
const Gluwacoin = artifacts.require('Gluwacoin');
console.info(JSON.stringify(accounts));
const [ deployer, other, another ] = accounts;
console.info(JSON.stringify(deployer));

var gluwacoin;

const Gluwacoin1 = contract.fromArtifact('Gluwacoin');


describe('Gluwacoin', function () {
    
  
    beforeEach(async function () {
        gluwacoin = await Gluwacoin.new();
      

    });
  
    it('check roles for owner', async function () {
      
    });
});
