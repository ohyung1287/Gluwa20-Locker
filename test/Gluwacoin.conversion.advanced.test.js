// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');

var gluwacoin;
var baseToken1;
var contractUtility = require("./utils/contractUtility");


const transferAmount = new BN('120000000');
const rate = new BN("25");
const rateBase = new BN("1000");


const [deployer, user1, user2, user3] = accounts;
const [deployer_privateKey, user1_privateKey, user2_privateKey, user3_privateKey] = privateKeys;

describe('Gluwacoin ERC20 Basic test with Conversion for currency having the different decimals', function () {

    beforeEach(async function () {
        baseToken1 = await contractUtility.deployERC20(deployer);
        gluwacoin = await contractUtility.deployGluwacoin(deployer, baseToken1.address);
        await gluwacoin.setTokenExchange(rate, rateBase, { from: deployer });      

    });

    it('Basic conversion by user', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount, { from: deployer });
        await contractUtility.convertToken(user1, transferAmount, gluwacoin, baseToken1);     

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(rate).div(rateBase).toString());
    });

    it('Partial conversion by user', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await contractUtility.convertToken(user1, transferAmount.mul(new BN("2")), gluwacoin, baseToken1);

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(transferAmount);
        var gluwacoinBalance = transferAmount.mul(new BN("2")).mul(rate).div(rateBase);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(gluwacoinBalance);
    });


    it('Colltroled conversion - partial amount', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount, new BN("29"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("2")));
        var gluwacoinBalance = transferAmount.sub(new BN("29")).mul(rate).div(rateBase);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(gluwacoinBalance);
    });


    it('Colltroled conversion - full amount', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("119"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        var gluwacoinBalance = transferAmount.mul(new BN("3")).sub(new BN("119")).mul(rate).div(rateBase);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(gluwacoinBalance);
    });

    it('Colltroled burn - full amount', async function () {
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("300000"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        var gluwacoinBalance = transferAmount.mul(new BN("3")).sub(new BN("300000")).mul(rate).div(rateBase);


        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")).sub(new BN("300000")));
        await gluwacoin.methods['burn(address,uint256,uint256)'](user1, gluwacoinBalance, new BN(0),  { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal("0");

        var received = gluwacoinBalance.mul(rateBase).div(rate);
        
        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(received);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal("0");

    });

    it('Colltroled burn - full amount - with fee', async function () {
       
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("300000"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        var gluwacoinBalance = transferAmount.mul(new BN("3")).sub(new BN("300000")).mul(rate).div(rateBase);


        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")).sub(new BN("300000")));
        await gluwacoin.methods['burn(address,uint256,uint256)'](user1, gluwacoinBalance, new BN("59"),  { from: deployer });
        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal("0");

        var received = gluwacoinBalance.mul(rateBase).div(rate).sub(new BN("59"));
        
        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal(received);
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal("0");
    });

    it('Colltroled burn - more than locked - with fee', async function () {
       
        await baseToken1.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("3")), { from: user1 });
        await gluwacoin.mint(user1, transferAmount.mul(new BN("3")), new BN("300000"), { from: deployer });

        await baseToken1.methods['transfer(address,uint256)'](user2, transferAmount.mul(new BN("5")), { from: deployer });
        await baseToken1.approve(gluwacoin.address, transferAmount.mul(new BN("5")), { from: user2 });
        await gluwacoin.mint(user2, transferAmount.mul(new BN("5")), new BN("800000"), { from: deployer });

        expect(await baseToken1.balanceOf(user1)).to.be.bignumber.equal("0");
        var gluwacoinBalance = transferAmount.mul(new BN("3")).sub(new BN("300000")).mul(rate).div(rateBase);
        var gluwacoinBalanceUser2 = transferAmount.mul(new BN("5")).sub(new BN("800000")).mul(rate).div(rateBase);

        await gluwacoin.methods['transfer(address,uint256)'](user1, gluwacoinBalanceUser2, { from: user2 });

        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(gluwacoinBalance.add(gluwacoinBalanceUser2));


        expect((await gluwacoin.getLockerByAcccount(user1)).amount).to.be.bignumber.equal(transferAmount.mul(new BN("3")).sub(new BN("300000")));
        
        await expectRevert(
            gluwacoin.methods['burn(address,uint256,uint256)'](user1, gluwacoinBalance.add(gluwacoinBalanceUser2), new BN("59"),  { from: deployer }),
            "Convertible: Locker does not have enough CTC for withdrawal"
        );
        
    });


});
