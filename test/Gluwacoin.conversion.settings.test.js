// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');

var gluwacoin;
var baseToken1;
var contractUtility = require("./utils/contractUtility");

const convertAmount = new BN('7000000000000');
const mintAmount = new BN("10000000000000000000000000");
const transferAmount = new BN('120000');
const transferFee = new BN('31');
const reserveFee = new BN('59');

const [deployer, user1, user2, user3] = accounts;
const [deployer_privateKey, user1_privateKey, user2_privateKey, user3_privateKey] = privateKeys;
const originalRate = new BN("12");
const originalRateBase = new BN("15");


describe('Gluwacoin Setting Test Suit', function () {

    beforeEach(async function () {
        baseToken1 = await contractUtility.deployERC20(deployer);
        gluwacoin = await contractUtility.deployGluwacoin(deployer, baseToken1.address);
        await gluwacoin.setTokenExchange(originalRate, originalRateBase, { from: deployer });

    });

    it('Validate token Settings', async function () {
        var tokenDetails1 = await gluwacoin.getTokenExchangeDetails();
        expect(tokenDetails1.rate).to.be.bignumber.equal(new BN("12"));
        expect(tokenDetails1.decimalPlaceBase).to.be.bignumber.equal(new BN("15"));
    });

    it('Update token Settings - by authorized users', async function () {
        await gluwacoin.setTokenExchange(new BN("15"), new BN("112"), { from: deployer });
        var tokenDetails1 = await gluwacoin.getTokenExchangeDetails();
        expect(tokenDetails1.rate).to.be.bignumber.equal(new BN("15"));
        expect(tokenDetails1.decimalPlaceBase).to.be.bignumber.equal(new BN("112"));       
   
    });

    it('Update token Settings - by assiging new user', async function () {
        await gluwacoin.setTokenExchange(new BN("15"), new BN("112"), { from: deployer });
        

        try {
            await gluwacoin.setTokenExchange(new BN("125"), new BN("1212"), { from: user1 });     
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }

        var tokenDetails10 = await gluwacoin.getTokenExchangeDetails();
        expect(tokenDetails10.rate).to.be.bignumber.equal(new BN("15"));
        expect(tokenDetails10.decimalPlaceBase).to.be.bignumber.equal(new BN("112"));

        await gluwacoin.grantRole(await gluwacoin.DEFAULT_ADMIN_ROLE(), user1, { from: deployer });
        
        await gluwacoin.setTokenExchange(new BN("25"), new BN("100"), { from: user1 });
        var tokenDetails2 = await gluwacoin.getTokenExchangeDetails();
        expect(tokenDetails2.rate).to.be.bignumber.equal(new BN("25"));
        expect(tokenDetails2.decimalPlaceBase).to.be.bignumber.equal(new BN("100"));

        //deployer still can set the exchange when there is one more admin
        await gluwacoin.setTokenExchange(new BN("153"), new BN("1123"), { from: deployer });
        var tokenDetails3 = await gluwacoin.getTokenExchangeDetails();
        expect(tokenDetails3.rate).to.be.bignumber.equal(new BN("153"));
        expect(tokenDetails3.decimalPlaceBase).to.be.bignumber.equal(new BN("1123"));
       
    });

    it('Update token Settings - and convert with new setting', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("2")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });
        
        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));        

        var converted = transferAmount.mul(new BN("2")).mul(originalRate).div(originalRateBase);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(converted);

      
        await gluwacoin.grantRole(await gluwacoin.DEFAULT_ADMIN_ROLE(), user1, { from: deployer });        
        
        var rate  = new BN("15");
        var rateBase = new BN("125");
        await gluwacoin.setTokenExchange(rate, rateBase, { from: deployer });

        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("0"), { from: deployer });
        
        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        var gluwacoinBalance = converted.add(transferAmount.mul(new BN("3")).mul(rate).div(rateBase)).toString();
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(gluwacoinBalance);       
    });

    it('Update token Settings - and convert with new -- paying fee', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("2")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });
        
        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));        
        var converted = transferAmount.mul(new BN("2")).mul(originalRate).div(originalRateBase);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(converted);

      
        await gluwacoin.grantRole(await gluwacoin.DEFAULT_ADMIN_ROLE(), user1, { from: deployer });        
        
        var rate  = new BN("15");
        var rateBase = new BN("125");
        await gluwacoin.setTokenExchange(rate, rateBase, { from: deployer });

        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("17"), { from: deployer });
        
        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        var gluwacoinBalance = converted.add(transferAmount.mul(new BN("3")).sub(new BN("17")).mul(rate).div(rateBase)).toString();
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(gluwacoinBalance);       
    });


    it('Update token Settings - by unauthorized users', async function () {
        try {
            await gluwacoin.setTokenExchange(new BN("15"), new BN("112"), { from: user1 });     
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });
});
