const {ethers} = require("hardhat");

export default async function deployGluwacoin(deployer) {
    var Gluwacoin = await ethers.getContractFactory("Gluwacoin");
    await Gluwacoin.deployed();
    return Gluwacoin;
}