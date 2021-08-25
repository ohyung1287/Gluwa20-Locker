const { accounts, defaultSender, contract, web3, provider, isHelpersConfigured } = require('@openzeppelin/test-environment');
const { BN } = require('@openzeppelin/test-helpers');

const Gluwacoin = contract.fromArtifact('Gluwacoin');
const ERC20Contract = contract.fromArtifact('ERC20Contract');
const mintAmount = new BN('10000000000000000000000000');


async function deployGluwacoin(deployer) {
    const instance = await Gluwacoin.new();
    await instance.initialize("KRWC-G1 Coin", "KRWC-G1", { from: deployer });
    return instance;

}

async function deployERC20(deployer) {
    const instance = await ERC20Contract.new();
    await instance.initialize("USDC-G1", "USDC-G1", mintAmount, { from: deployer });
    return instance;
}

async function convertToken(account, amount, convertTokenContract, baseTokenContract) {
    await baseTokenContract.approve(convertTokenContract.address, amount, { from: account });
    await convertTokenContract.lock(baseTokenContract.address, amount, { from: account });
    await convertTokenContract.convert(baseTokenContract.address, amount, { from: account });
}


async function initialConvertTokenWithBasicSetup(account, amount, convertTokenContract, baseTokenContract) {
    await convertTokenContract.setTokenExchange(baseTokenContract.address, new BN("18"), new BN("1"), new BN("1"), { from: account });
    await convertToken(account, amount, convertTokenContract, baseTokenContract);
}


function bigIntAdd(num1,num2)
{
    var num_1 = new BN(num1)
    return num_1.add(new BN(num2));    
}

function bigIntSub(num1,num2)
{
    var num_1 = new BN(num1)
    return num_1.sub(new BN(num2));    
}

function bigIntMul(num1,num2)
{
    var num_1 = new BN(num1)
    return num_1.mul(new BN(num2));    
}


function bigIntDiv(num1,num2)
{
    var num_1 = new BN(num1)
    return num_1.div(new BN(num2));    
}

function decimalConversion(sourceAmount, sourceDecimals,targetDecimals)
{   
    var temp = 10**(targetDecimals - sourceDecimals);
    if (sourceDecimals < targetDecimals)
        return sourceAmount.mul(new BN(temp));
    return sourceAmount.div(new BN(temp));
}

module.exports = { deployGluwacoin, deployERC20, convertToken, initialConvertTokenWithBasicSetup, bigIntAdd, bigIntSub, bigIntMul, bigIntDiv, decimalConversion};