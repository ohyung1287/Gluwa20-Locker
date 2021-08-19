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

describe('Gluwacoin ERC20 Basic test with Conversion', function () {

    beforeEach(async function () {
        gluwacoin = await contractUtility.deployGluwacoin(deployer);
        baseToken1 = await contractUtility.deployERC20(deployer);
        baseToken2 = await contractUtility.deployERC20(deployer);
        baseToken3 = await contractUtility.deployERC20(deployer);
        await gluwacoin.setTokenExchange(baseToken1.address, new BN("18"), new BN("1"), new BN("1"), { from: deployer });
        await gluwacoin.setTokenExchange(baseToken2.address, new BN("6"), new BN("25"), new BN("100"), { from: deployer });

    });

    it('Token Settings', async function () {
       
    });

    it('Token Settings - by unauthorized users', async function () {
       
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
        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("3")), { from: deployer });
        await gluwacoin.convertFrom(user1, baseToken1.address, transferAmount.mul(new BN("2")), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("2")).toString());
    });


    it('Colltroled conversion - full amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("3")), { from: deployer });
        await gluwacoin.convertAllFrom(user1, baseToken1.address, { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")).toString());
    });

    it('Colltroled lock - no access right', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });

        try {
            await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("3")), { from: user2 });
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
            await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("5")), { from: deployer });
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

        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount, { from: deployer });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount);

        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("2")), { from: deployer });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("2")), { from: deployer });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
    });

    it('Lock - multiple locks within approved amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.lock(baseToken1.address, transferAmount, { from: user1 });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount);

        await gluwacoin.lock(baseToken1.address, transferAmount.mul(new BN("2")), { from: user1 });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.lock(baseToken1.address, transferAmount.mul(new BN("2")), { from: user1 });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("5")));
    });

    it('Withdraw locked amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("5")), { from: deployer });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("5")));

        await gluwacoin.withdraw(baseToken1.address, transferAmount.mul(new BN("2")), { from: user1 });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("3")));

        await gluwacoin.withdraw(baseToken1.address, transferAmount.mul(new BN("2")), { from: user1 });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount);
    });


    it('Withdraw more than locked amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("2")), { from: deployer });
        expect(await gluwacoin.getLocked(user1, baseToken1.address)).to.be.bignumber.equal(transferAmount.mul(new BN("2")));

        try {
            await gluwacoin.withdraw(baseToken1.address, transferAmount.mul(new BN("3")), { from: user1 });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("revert");
        }   
    });

    it('Colltroled lock - lock unsupported token', async function () {
        await baseToken3.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken3.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user1 });

        await gluwacoin.lockFrom(user1, baseToken3.address, transferAmount, { from: deployer });      
        await expectRevert(
            gluwacoin.lockFrom(user1, baseToken3.address, transferAmount, { from: deployer }),
            'Convertible: The base token is not supported'
        ); 
    });

    it('Colltroled conversion - full amount - no access right', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken1);
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("2")), { from: user1 });
        await gluwacoin.lockFrom(user1, baseToken1.address, transferAmount.mul(new BN("2")), { from: deployer });
       
        try {
            await gluwacoin.convertAllFrom(user1, baseToken1.address, { from: user2 });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("AccessControl: account ");
        }
    });


});
