// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');

var gluwacoin;
var baseToken1;
var baseToken2;
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
        baseToken1 = await contractUtility.deployERC20(deployer);
        baseToken2 = await contractUtility.deployERC20(deployer);
        gluwacoin = await contractUtility.deployGluwacoin(deployer, baseToken1.address);
        await gluwacoin.setTokenExchange(new BN("1"), new BN("1"), { from: deployer });
    });

    it('Basic conversion by user', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await contractUtility.convertToken(user1, transferAmount.mul(new BN("3")), gluwacoin, baseToken1);

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")).toString());
    });

    it('Partial conversion by user', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await contractUtility.convertToken(user1, transferAmount.mul(new BN("2")), gluwacoin, baseToken1);

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(transferAmount.toString());
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("2")).toString());
    });


    it('Colltroled conversion - partial amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(transferAmount);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("2")).toString());
    });


    it('Colltroled conversion - full amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("0"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")).toString());
    });

    it('Colltroled mint - no access right', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });

        try {
            await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("0"), { from: user2 });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });

    it('Colltroled lock - more than approved amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });

        try {
            await gluwacoin.mint(user1, transferAmount.mul(new BN("5")), new BN("0"), { from: deployer });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("revert");
        }
    });

    it('Colltroled lock - multiple locks within approved amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.mint(user1, transferAmount, new BN("0"), { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount);

        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
    });

    it('Lock - multiple locks within approved amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.methods['mint(uint256)'](transferAmount, { from: user1 });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount);


        await gluwacoin.methods['mint(uint256)'](transferAmount.mul(new BN("2")), { from: user1 });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.methods['mint(uint256)'](transferAmount.mul(new BN("2")), { from: user1 });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
    });

    it('Withdraw locked amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.methods['mint(uint256)'](transferAmount.mul(new BN("5")), { from: user1 });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("5")).toString());

        await gluwacoin.methods['burn(uint256)'](transferAmount.mul(new BN("2")), { from: user1 });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.methods['burn(uint256)'](transferAmount.mul(new BN("2")), { from: user1 });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount);

    });

    it('Controlled Withdraw - locked amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });
        
        await gluwacoin.mint(user1, transferAmount.mul(new BN("5")), new BN("0"), { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("5")).toString());

        await gluwacoin.methods['burn(address,uint256,uint256)'](user1, transferAmount.mul(new BN("2")), new BN("0"),  { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")));
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.methods['burn(address,uint256,uint256)'](user1, transferAmount.mul(new BN("2")), new BN("0"),  { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount); 
    });


    it('Withdraw more than locked amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.mint(user1, transferAmount.mul(new BN("5")), new BN("0"), { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("5")));


        try {
            await gluwacoin.methods['burn(address,uint256,uint256)'](user1, transferAmount.mul(new BN("7")), new BN("0"),  { from: deployer });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("revert");
        }   
    });

    it('Colltroled lock - lock unsupported token', async function () {
        await baseToken2.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken2.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });
      
        try {
            await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("0"), { from: deployer });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("revert");
        }
    });

    it('Colltroled conversion - no access right', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("2")), { from: user1 });
       
        try {
            await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: user2 });
            throw "error";
        }        
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });


    it('Colltroled burn - no access right', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("2")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });

       
        try {
            await gluwacoin.methods['burn(address,uint256,uint256)'](user1, transferAmount.mul(new BN("2")), new BN("0"),  { from: user2 });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });

    it('Colltroled burn - no access right self convert', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("2")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("2")), new BN("0"), { from: deployer });

        try {
            await gluwacoin.methods['burn(address,uint256,uint256)'](user1, transferAmount.mul(new BN("7")), new BN("0"),  { from: user1 });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });

});
