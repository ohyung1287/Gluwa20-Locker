// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, constants, expectRevert, time } = require('@openzeppelin/test-helpers');

var gluwacoin;
var baseToken;
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
        baseToken = await contractUtility.deployERC20(deployer);
    });

   

    it('basic conversion for other user', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);
        await  gluwacoin.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        expect(await gluwacoin.balanceOf(deployer)).to.be.bignumber.equal(convertAmount.toString());
        expect(await baseToken.balanceOf(deployer)).to.be.bignumber.equal(mintAmount.sub(convertAmount).toString());
    });

});
