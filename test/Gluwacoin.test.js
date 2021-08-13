// Load dependencies
const { accounts, privateKeys, contract, web3  } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN } = require('@openzeppelin/test-helpers');

var gluwacoin;
var baseToken;
var contractFactory = require("./utils/contractFactory.js");

const convertAmount = new BN('7000000000000');
const mintAmount = new BN("10000000000000000000000000");
const [ deployer, user1, user2 ] = accounts;
const [ deployer_privateKey, user1_privateKey, user2_privateKey ] = privateKeys;

describe('Gluwacoin ERC20 Basic test with Conversion', function () {    

    beforeEach(async function () {
        gluwacoin = await contractFactory.deployGluwacoin(deployer);
        baseToken = await contractFactory.deployERC20(deployer);
    });
  
    it('check token settings', async function () {
        expect(await gluwacoin.decimals()).to.be.bignumber.equal("18");
        expect(await baseToken.decimals()).to.be.bignumber.equal("6");
        expect(await gluwacoin.symbol()).to.equal("KRWC-G1");
        expect(await gluwacoin.name()).to.equal("KRWC-G1 Coin");
        expect(await baseToken.balanceOf(deployer)).to.be.bignumber.equal(mintAmount.toString());
    });

    it('basic conversion', async function () {
        await gluwacoin.setTokenExchange(baseToken.address, new BN("18"), new BN("1"), new BN("1"), {from: deployer});
        await contractFactory.convertToken(deployer, convertAmount, gluwacoin, baseToken);
        expect(await gluwacoin.balanceOf(deployer)).to.be.bignumber.equal(convertAmount.toString());
        expect(await baseToken.balanceOf(deployer)).to.be.bignumber.equal(mintAmount.sub(convertAmount).toString());
    });
});
