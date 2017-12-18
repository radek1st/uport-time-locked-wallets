var TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");
var TopCoderToken = artifacts.require("TopCoderToken");

module.exports = function(deployer) {
  deployer.deploy(TimeLockedWalletFactory);
  deployer.deploy(TopCoderToken);
};
