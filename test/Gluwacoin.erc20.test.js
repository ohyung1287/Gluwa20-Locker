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

const [deployer, user1, user2, user3, user4] = accounts;
const [deployer_privateKey, user1_privateKey, user2_privateKey, user3_privateKey, user4_privateKey] = privateKeys;

describe('Gluwacoin ERC20 Basic test', function () {

    beforeEach(async function () {
        gluwacoin = await contractUtility.deployGluwacoin(deployer);
        baseToken = await contractUtility.deployERC20(deployer);
    });

    it('check token settings', async function () {
        expect(await gluwacoin.decimals()).to.be.bignumber.equal("18");
        expect(await baseToken.decimals()).to.be.bignumber.equal("6");
        expect(await gluwacoin.symbol()).to.equal("KRWC-G1");
        expect(await gluwacoin.name()).to.equal("KRWC-G1 Coin");
        expect(await baseToken.balanceOf(deployer)).to.be.bignumber.equal(mintAmount.toString());
    });

    it('basic conversion', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);
        expect(await gluwacoin.balanceOf(deployer)).to.be.bignumber.equal(convertAmount.toString());
        expect(await baseToken.balanceOf(deployer)).to.be.bignumber.equal(mintAmount.sub(convertAmount).toString());
    });

    it('normal transfer & ethless transfer', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);
        await gluwacoin.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")).toString());
        var nonce = Date.now();
        var signature = sign.signTransfer(3, 1, gluwacoin.address, user1, user1_privateKey, user2, transferAmount, transferFee, nonce);
        var deployer_token = await gluwacoin.balanceOf(deployer);
        await gluwacoin.methods['transfer(address,address,uint256,uint256,uint256,bytes)'](user1, user2, transferAmount, transferFee, nonce, signature, { from: deployer });
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("2")).sub(transferFee).toString());
        expect(await gluwacoin.balanceOf(user2)).to.be.bignumber.equal(transferAmount.toString());
        expect(await gluwacoin.balanceOf(deployer)).to.be.bignumber.equal(deployer_token.add(transferFee));
    });

    it('anyone can do ethless transfer', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);
        gluwacoin.methods['transfer(address,uint256)'](user1, transferAmount.mul(new BN("3")), { from: deployer });
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")).toString());
        var nonce = Date.now();
        var signature = sign.signTransfer(3, 1, gluwacoin.address, user1, user1_privateKey, user2, transferAmount, transferFee, nonce);
        await gluwacoin.methods['transfer(address,address,uint256,uint256,uint256,bytes)'](user1, user2, transferAmount, transferFee, nonce, signature, { from: user3 });
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal(transferAmount.mul(new BN("2")).sub(transferFee).toString());
        expect(await gluwacoin.balanceOf(user2)).to.be.bignumber.equal(transferAmount.toString());
        expect(await gluwacoin.balanceOf(user3)).to.be.bignumber.equal("0");
    });
    
    it('Approve and transfer on the behalf', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);
        await gluwacoin.approve(user1, transferAmount.mul(new BN("3")), { from: deployer });
        expect(await gluwacoin.allowance(deployer, user1)).to.be.bignumber.equal(transferAmount.mul(new BN("3")).toString());
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal("0");

        await gluwacoin.transferFrom(deployer, user2, transferAmount, { from: user1 });
        await gluwacoin.transferFrom(deployer, user3, transferAmount, { from: user1 });

        expect(await gluwacoin.balanceOf(user2)).to.be.bignumber.equal(transferAmount.toString());
        expect(await gluwacoin.balanceOf(user3)).to.be.bignumber.equal(transferAmount.toString());
        expect(await gluwacoin.balanceOf(deployer)).to.be.bignumber.equal(convertAmount.sub(transferAmount.mul(new BN("2"))).toString());
        expect(await gluwacoin.allowance(deployer, user1)).to.be.bignumber.equal(transferAmount.toString());
        expect(await gluwacoin.balanceOf(user1)).to.be.bignumber.equal("0");
    });

    it('Ethless reserve token', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('100'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum);
        
        await gluwacoin.reserve(deployer, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum, signature, { from: user1 });
        
        var reserve = await gluwacoin.getReservation(deployer, nonce);

        expect(reserve.amount).to.be.bignumber.equal(transferAmount);
        expect(reserve.fee).to.be.bignumber.equal(reserveFee);
        expect(reserve.recipient).to.equal(user2);
        expect(reserve.executor).to.equal(user3);
        expect(reserve.expiryBlockNum).to.be.bignumber.equal(expiryBlockNum);
        expect(reserve.status.toString()).to.equal("1");
    });

    it('Reclaim reserved token', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('100'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum);
        
        await gluwacoin.reserve(deployer, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum, signature, { from: user1 });
        expect(await gluwacoin.reservedBalanceOf(deployer)).to.be.bignumber.equal(transferAmount.add(reserveFee));
        expect(await gluwacoin.unreservedBalanceOf(deployer)).to.be.bignumber.equal(convertAmount.sub(transferAmount.add(reserveFee)));

     
        await gluwacoin.reclaim(deployer, nonce, { from: user3 });

        var reserve = await gluwacoin.getReservation(deployer, nonce);
        expect(reserve.amount).to.be.bignumber.equal(transferAmount);
        expect(reserve.fee).to.be.bignumber.equal(reserveFee);
        expect(reserve.recipient).to.equal(user2);
        expect(reserve.executor).to.equal(user3);
        expect(reserve.expiryBlockNum).to.be.bignumber.equal(expiryBlockNum);
        expect(reserve.status.toString()).to.equal("2");

        expect(await gluwacoin.reservedBalanceOf(deployer)).to.be.bignumber.equal("0");
    });

    it('Reclaim reserved token by sender before expiryBlockNum', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('100'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum);
        
        await gluwacoin.reserve(deployer, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum, signature, { from: user1 });
        expect(await gluwacoin.reservedBalanceOf(deployer)).to.be.bignumber.equal(transferAmount.add(reserveFee));
        expect(await gluwacoin.unreservedBalanceOf(deployer)).to.be.bignumber.equal(convertAmount.sub(transferAmount.add(reserveFee)));
     

        await expectRevert(
            gluwacoin.reclaim(deployer, nonce, { from: deployer }),
            'ERC20Reservable: reservation has not expired or you are not the executor and cannot be reclaimed'
        ); 
    });

    it('Execute reserved token', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('20'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum);
        
        await gluwacoin.reserve(deployer, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum, signature, { from: user1 });
        expect(await gluwacoin.reservedBalanceOf(deployer)).to.be.bignumber.equal(transferAmount.add(reserveFee));

        await gluwacoin.execute(deployer, nonce, { from: deployer });

        var reserve = await gluwacoin.getReservation(deployer, nonce);
        expect(reserve.amount).to.be.bignumber.equal(transferAmount);
        expect(reserve.fee).to.be.bignumber.equal(reserveFee);
        expect(reserve.recipient).to.equal(user2);
        expect(reserve.executor).to.equal(user3);
        expect(reserve.expiryBlockNum).to.be.bignumber.equal(expiryBlockNum);
        expect(reserve.status.toString()).to.equal("3");

        expect(await gluwacoin.reservedBalanceOf(deployer)).to.be.bignumber.equal("0");
        expect(await gluwacoin.balanceOf(user2)).to.be.bignumber.equal(transferAmount);
        expect(await gluwacoin.balanceOf(user3)).to.be.bignumber.equal(reserveFee);

    });

    it('Execute reserved token by non-executor or the token owner', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('20'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum);
        
        await gluwacoin.reserve(deployer, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum, signature, { from: user1 });
        expect(await gluwacoin.reservedBalanceOf(deployer)).to.be.bignumber.equal(transferAmount.add(reserveFee));

        await expectRevert(
            gluwacoin.execute(deployer, nonce, { from: user1 }),
            'ERC20Reservable: this address is not authorized to execute this reservation'
        );   

    });

    it('Insufficient transfer amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var signature = sign.signTransfer(3, 1, gluwacoin.address, user1, user1_privateKey, user2, convertAmount.sub(transferFee.div(new BN("2"))), transferFee, nonce);

        await expectRevert(
            gluwacoin.methods['transfer(address,address,uint256,uint256,uint256,bytes)'](user1, user2, convertAmount.sub(transferFee.div(new BN("2"))), transferFee, nonce, signature, { from: user3 }),
            'ERC20ETHless: the balance is not sufficient'
        );
    
    });

    it('Insufficient reserve amount', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('100'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, convertAmount, reserveFee, nonce, expiryBlockNum);

        await expectRevert(
            gluwacoin.reserve(deployer, user2, user3, convertAmount, reserveFee, nonce, expiryBlockNum, signature, { from: user1 }),
            'ERC20Reservable: insufficient unreserved balance'
        );
    
    });

    it('Invalid reverse signature', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var latestBlock = await time.latestBlock();
        var expiryBlockNum = latestBlock.add(new BN('100'));
        var signature = sign.signReserve(4, 1, gluwacoin.address, deployer, deployer_privateKey, user2, user3, transferAmount, reserveFee, nonce, expiryBlockNum);

        await expectRevert(
            gluwacoin.reserve(deployer, user2, user3, transferAmount, reserveFee, nonce, latestBlock.add(new BN('101')), signature, { from: user1 }),
            'Validate: invalid signature'
        );
    
    });

    it('Invalid transfer signature', async function () {
        await contractUtility.initialConvertTokenWithBasicSetup(deployer, convertAmount, gluwacoin, baseToken);

        var nonce = Date.now();
        var signature = sign.signTransfer(3, 1, gluwacoin.address, deployer, deployer_privateKey, user2, transferAmount, transferFee, nonce);
        nonce = Date.now();
        await expectRevert(            
            gluwacoin.methods['transfer(address,address,uint256,uint256,uint256,bytes)'](deployer, user2, transferAmount, transferFee, nonce, signature, { from: user3 }),
            'Validate: invalid signature'
        );
    
    });
});
