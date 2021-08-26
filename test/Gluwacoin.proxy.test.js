// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { BN } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

var contractUtility = require("./utils/contractUtility");

// Load compiled artifacts
const Gluwacoin = artifacts.require('Gluwacoin');
const GluwacoinV0 = artifacts.require('GluwacoinV0');

const [deployer, user1, user2, user3, user4] = accounts;
const [deployer_privateKey, user1_privateKey, user2_privateKey, user3_privateKey, user4_privateKey] = privateKeys;
// Start test block
describe('Gluwacoin Proxy', function () {
    const name = 'KRWC-G Coin';
    const symbol = 'KRWCG';

    beforeEach(async function () {
        this.token = await deployProxy(
            Gluwacoin,
            [name, symbol],
            { from: deployer, initializer: 'initialize' }
        );
    });

    it('retrieve returns a value previously initialized', async function () {
        expect(await this.token.name()).to.equal(name);
        expect(await this.token.symbol()).to.equal(symbol);
        expect((await this.token.decimals()).toString()).to.equal("18");
    });

    it('retrieve returns a value previously initialized after an upgrade', async function () {
        var baseToken1 = await contractUtility.deployERC20(deployer);

        const newToken = await upgradeProxy(
            this.token.address, GluwacoinV0, { from: deployer });

        console.info(await newToken.DEFAULT_ADMIN_ROLE_V0());
        
        try {
            await newToken.setTokenExchange(baseToken1.address, new BN("18"), new BN("1"), new BN("1"), { from: deployer });
            throw "error";
        }
        catch (error) {
            expect(String(error)).to.contain("setTokenExchange is not a function");
        }

        expect(await newToken.name()).to.equal(name);
        expect(await newToken.symbol()).to.equal(symbol);
        expect((await newToken.decimals()).toString()).to.equal("6");
        expect(await newToken.DEFAULT_ADMIN_ROLE_V0()).to.equal("0x3078630000000000000000000000000000000000000000000000000000000000");
    });
});