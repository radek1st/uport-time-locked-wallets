const TimeLockedWallet = artifacts.require("./TimeLockedWallet.sol");
const TimeLockedWalletFactory = artifacts.require("./TimeLockedWalletFactory.sol");

let ethToSend = web3.toWei(1, "ether");
let someGas = web3.toWei(0.01, "ether");
let timeLockedWalletFactory;
let architect;
let owner;
let timeLockedWalletAbi;

contract('TimeLockedWalletFactory', (accounts) => {

    before(async () => {
        architect = accounts[0];
        owner = accounts[1];
        timeLockedWalletFactory = await TimeLockedWalletFactory.new({from: architect});

    });

    it("Factory created contract is working well", async () => {
        // Create the wallet contract.
        let now = Math.floor((new Date).getTime() / 1000);
        await timeLockedWalletFactory.newTimeLockedWallet(
            owner, now, {from: architect, value: ethToSend}
        );

        // Check if wallet can be found in architect's wallets.
        let architectWallets = await timeLockedWalletFactory.getWallets.call(architect);
        assert(1 == architectWallets.length);

        // Check if wallet can be found in owners's wallets.
        let ownerWallets = await timeLockedWalletFactory.getWallets.call(owner);
        assert(1 == ownerWallets.length);
        
        // Check if this is the same wallet for both of them.
        assert(architectWallets[0] === ownerWallets[0]);
    });

});
