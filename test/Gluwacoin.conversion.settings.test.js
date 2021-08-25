// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');

var gluwacoin;
var baseToken1;
var baseToken2;
var baseToken3;
var contractUtility = require("./utils/contractUtility");
var sign = require('./utils/signature');

const convertAmount = new BN('7000000000000');
const mintAmount = new BN("10000000000000000000000000");
const transferAmount = new BN('120000');
const transferFee = new BN('31');
const reserveFee = new BN('59');

const [deployer, user1, user2, user3] = accounts;
const [deployer_privateKey, user1_privateKey, user2_privateKey, user3_privateKey] = privateKeys;

describe('Gluwacoin ERC20 Basic test with Conversion for currency having the same decimals', function () {

    beforeEach(async function () {
        gluwacoin = await contractUtility.deployGluwacoin(deployer);
        baseToken1 = await contractUtility.deployERC20(deployer);
        baseToken2 = await contractUtility.deployERC20(deployer);
        baseToken3 = await contractUtility.deployERC20(deployer);
        await gluwacoin.setTokenExchange(baseToken1.address, new BN("18"), new BN("1"), new BN("1"), { from: deployer });
        await gluwacoin.setTokenExchange(baseToken2.address, new BN("6"), new BN("25"), new BN("100"), { from: deployer });

    });

    it('Validate token Settings', async function () {
        var tokenDetails1 = await gluwacoin.getTokenExchangeDetails(baseToken1.address);
        expect(tokenDetails1.rate).to.be.bignumber.equal(new BN("1"));
        expect(tokenDetails1.decimalPlaceBase).to.be.bignumber.equal(new BN("1"));

        var tokenDetails2 = await gluwacoin.getTokenExchangeDetails(baseToken2.address);
        expect(tokenDetails2.rate).to.be.bignumber.equal(new BN("25"));
        expect(tokenDetails2.decimalPlaceBase).to.be.bignumber.equal(new BN("100"));
        
    });

    it('Update token Settings - by authorized users', async function () {
        await gluwacoin.setTokenExchange(baseToken1.address, new BN("18"), new BN("15"), new BN("112"), { from: deployer });
        var tokenDetails1 = await gluwacoin.getTokenExchangeDetails(baseToken1.address);
        expect(tokenDetails1.rate).to.be.bignumber.equal(new BN("15"));
        expect(tokenDetails1.decimalPlaceBase).to.be.bignumber.equal(new BN("112"));
        
        //Any change to setting of a token should not affect the others' settings
        var tokenDetails2 = await gluwacoin.getTokenExchangeDetails(baseToken2.address);
        expect(tokenDetails2.rate).to.be.bignumber.equal(new BN("25"));
        expect(tokenDetails2.decimalPlaceBase).to.be.bignumber.equal(new BN("100"));
       
    });

    it('Update token Settings - by assiging new user', async function () {
        await gluwacoin.setTokenExchange(baseToken1.address, new BN("18"), new BN("15"), new BN("112"), { from: deployer });
        var tokenDetails1 = await gluwacoin.getTokenExchangeDetails(baseToken1.address);
        expect(tokenDetails1.rate).to.be.bignumber.equal(new BN("15"));
        expect(tokenDetails1.decimalPlaceBase).to.be.bignumber.equal(new BN("112"));

        await gluwacoin.grantRole(await gluwacoin.DEFAULT_ADMIN_ROLE(), user1, { from: deployer });
        
        await gluwacoin.setTokenExchange(baseToken1.address, new BN("18"), new BN("25"), new BN("100"), { from: user1 });
        var tokenDetails2 = await gluwacoin.getTokenExchangeDetails(baseToken1.address);
        expect(tokenDetails2.rate).to.be.bignumber.equal(new BN("25"));
        expect(tokenDetails2.decimalPlaceBase).to.be.bignumber.equal(new BN("100"));
       
    });


    it('Update token Settings - by unauthorized users', async function () {
        try {
            await gluwacoin.setTokenExchange(baseToken1.address, new BN("18"), new BN("15"), new BN("112"), { from: user1 });     
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });
});
