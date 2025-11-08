var VehicleServiceTracker = artifacts.require("./VehicleServiceTracker.sol");

module.exports = function(deployer) {
  deployer.deploy(VehicleServiceTracker, {gas: 5000000});
};