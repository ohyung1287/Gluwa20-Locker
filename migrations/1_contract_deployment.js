const { web3 } = require('web3');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');



module.exports = async function (deployer, network, accounts) {
  const name = 'KRWC Gluwacoin';
  const symbol = 'KRWC-G';
  const rate = 1000;
  const rate_base = 1;
  const rinkeby_pairContract = '0x1c0036BAB1187028F687941139EF43062EEcB0F6';
  const Gluwacoin = artifacts.require('Gluwacoin');
  var adapter = Gluwacoin.interfaceAdapter;
  const web3 = adapter.web3;

  const GLUWA_ADMIN_ROLE = await web3.utils.keccak256("GLUWA_ADMIN_ROLE");
  const Gluwa_admin = "0xfd91d059F0D0D5F6AdeE0f4Aa1FDF31da2557BC9";

  const instance = await Gluwacoin.new();
  // initilaze contract
  await instance.initialize(rinkeby_pairContract, name, symbol);
  
  // set rate/rate_base
  await instance.setTokenExchange(rate,rate_base);

  // assign ADMIN_ROLE to target address
  await instance.grantRole(GLUWA_ADMIN_ROLE, Gluwa_admin);

};