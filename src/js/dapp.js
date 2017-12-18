
DApp = {
    web3Provider: null,
    factoryContract: null,
    factoryContractView: null,
    walletContract: null,
    walletContractView: null,
    tokenContract: null,
    tokenContractView: null,
    currentAccount: null,
    table: null,
    wallets: {},
    uport: null,

    //Rinkeby:
    factoryAddress: "0x6b2315851d97477ddd9c0921ad9ee17d70737e77",
    tokenAddress: "0x3b03d5853a6478ca46a2326f7bcb2e86927185ea",
    tokenDecimalMultiplier: null,

    init: function() {
        console.log("[x] Initializing DApp.");
        this.initWeb3();
        this.initContract();
    },

    /**************************************************************************
     * Smart Contracts interaction methods.
     *************************************************************************/

    initWeb3: function() {

        // Is there is an injected web3 instance?
        // if (typeof web3 !== 'undefined') {
        //     DApp.web3Provider = web3.currentProvider;
        // } else {
            const Connect = window.uportconnect.Connect;
            const SimpleSigner = window.uportconnect.SimpleSigner;
            DApp.uport = new Connect('TimeLockedWallet',{
                clientId: '2ohbsSeyMjpYPAQmVVRBh2EVL5wmmdJ8ypx',
                signer: SimpleSigner('2552c7c595d4436a119001ec4d04c413b2e8079bcd63289c3d6186aef04fcc7f'),
                network: 'rinkeby'
            });
            
            DApp.web3Provider = DApp.uport.getProvider();
            window.web3 = DApp.uport.getWeb3();
        // }
    },

    initContract: function(){
        $.getJSON('../contracts/TimeLockedWalletFactory.json', function(factoryContract){

            var truffleFactoryContract = TruffleContract(factoryContract);
            truffleFactoryContract.setProvider(DApp.web3Provider);
            DApp.factoryContractView = truffleFactoryContract.at(DApp.factoryAddress);
            
            DApp.factoryContract = DApp.uport.contract(TruffleContract(factoryContract).abi).at(DApp.factoryAddress);
            console.log("[x] TimeLockedWalletFactory contract initialized.");

            //hardcoding token for simplicity
            $.getJSON('../contracts/TopCoderToken.json', function(tokenContract){
                var truffleTokenContract = TruffleContract(tokenContract);
                truffleTokenContract.setProvider(DApp.web3Provider);
                DApp.tokenContractView = truffleTokenContract.at(DApp.tokenAddress);

                DApp.tokenContractView.decimals.call().then(function(decimals){
                    DApp.tokenDecimalMultiplier = 10.0**decimals;
                    console.log("Multiplier", DApp.tokenDecimalMultiplier);
                })
                
                DApp.tokenContract = DApp.uport.contract(TruffleContract(tokenContract).abi).at(DApp.tokenAddress);

                console.log("[x] token contract initialized.");

                $.getJSON('../contracts/TimeLockedWallet.json', function(walletContract){
                    var truffleWalletContract = TruffleContract(walletContract);
                    truffleWalletContract.setProvider(DApp.web3Provider);
                    DApp.walletContractView = truffleWalletContract;
                    
                    DApp.walletContract = DApp.uport.contract(TruffleContract(walletContract).abi);
                    console.log("[x] TimeLockedWallet contract initialized.");

                    console.log("Checking for existing logon");
                    console.log(localStorage.credentials);
                    DApp.uport.requestCredentials({
                        requested: ['name', 'avatar'],
                        notifications: true 
                    })
                    .then((credentials) => {
                        const decodedId = window.uportconnect.MNID.decode(credentials.address)
                        console.log(decodedId);
                        credentials.rinkebyID = decodedId.address
                        localStorage.credentials = JSON.stringify(credentials);
                        localStorage.address = DApp.uport.getProvider().address;
                        DApp.currentAccount = DApp.uport.getProvider().address;
                        DApp.initUserProfile(credentials);
                    })
                    .catch((error) => {
                        console.log("Rejected: ", error);
                        $('#error').removeClass('hidden');
                        $('#errorButton').html("uPort login rejected! This demo DApp only works with uPort.");
                    })                       
                });
            });
        });
    },

    logout: function(){
        localStorage.clear();
    },

    initUserProfile: function(credentials){
        var login = '<a class="nav-link" target="_blank" href="https://rinkeby.etherscan.io/address/' + DApp.currentAccount + '"><b>' + credentials.name + 
            '</b><img src="' + credentials.avatar.uri + '" class="d-inline-block align-center" width="70" height="70" hspace="20" alt=""></a>';
        $("#login").append(login);

        console.log(credentials.avatar.uri, credentials.address, credentials.publicKey, credentials.publicEncKey, credentials.pushToken);  
        
        console.log("[x] Using account", DApp.currentAccount);
        DApp.initCreateWalletForm();
        DApp.prefillCreateWalletForm();
        DApp.initTable();
        DApp.loadWallets();
        DApp.initTopupWalletForm();
        DApp.initClaimForm();
    },

    loadWallets: function(){
        DApp.factoryContractView.getWallets.call(DApp.currentAccount)                
            .then(function(walletAddresses){
                console.log("[x] Number of existing wallets:", walletAddresses.length);
                walletAddresses.forEach(DApp.loadSingleWallet);
            });
    },

    loadSingleWallet: function(walletAddress){
        DApp.walletContractView.at(walletAddress)
            .then(function(walletInstance){
                return walletInstance.info();
            })
            .then(function(info){
                var from        = info[0];
                var to          = info[1];
                var unlockDate  = info[2].toNumber();
                var createdAt   = info[3].toNumber();
                var ether       = info[4].toNumber();
                if(walletAddress == '0xbbb7d980f7e34ffad5e8ad2d1319c7eb6088fce0')
                    console.log("zzzzzz", info);
                DApp.addWalletToTable(from, to, walletAddress, createdAt, unlockDate);
                DApp.addFundsToWallet(walletAddress, 'wei', ether);
            });

        // Load Token wallets.
        DApp.tokenContractView.balanceOf.call(walletAddress)
            .then(function(info){
                var amount = info.toNumber();
                DApp.addFundsToWallet(walletAddress, 'token', amount);
            });
    },

    createNewWallet: function(receiverAddress, ethAmount, unlockDate){
            var tx = {
                from: DApp.currentAccount,
                value: web3.toWei(ethAmount, "ether")
            };

            DApp.factoryContract.newTimeLockedWallet(receiverAddress, unlockDate, tx)
                .then(function(tx){
                    DApp.handleTransaction(tx);
                })
                .catch((error) => {
                    console.log("Rejected wallet creation request: ", error);
                    $('#error').removeClass('hidden');
                    $('#errorButton').html("Request to create wallet has been rejected!");
                });
    },

    claimFunds: function(walletAddress, currency){
        if(currency === "ether") {
            DApp.walletContract.at(walletAddress).withdraw({from: DApp.currentAccount})
                .then(function(tx){
                    DApp.handleTransaction(tx);
                })
                .catch((error) => {
                    console.log("Rejected Ether Claim: ", error);
                    $('#error').removeClass('hidden');
                    $('#errorButton').html("Request to Claim Ether has been rejected!");
                });
        } else if (currency == "token") {
            //gas given by walletInstance.withdrawTokens.estimateGas(1); 33322
            var gas = 80000;

            DApp.walletContract.at(walletAddress).withdrawTokens(DApp.tokenAddress, {from: DApp.currentAccount, gas: gas})
                .then(function(tx){
                    DApp.handleTransaction(tx);
                })
                .catch((error) => {
                    console.log("Rejected Token Claim: ", error);
                    $('#error').removeClass('hidden');
                    $('#errorButton').html("Request to Claim tokens has been rejected!");
                });
        } else {
            throw new Error("Unknown currency!");
        }
    },

    topupWallet: function(walletAddress, amount, currency){
        if(currency === "ether") {
            console.log("Topup with plain old Ether: " + amount);
            console.log("in wei: " + web3.toWei(amount, "ether"));

            DApp.walletContract.at(walletAddress).topup({from: DApp.currentAccount, value: web3.toWei(amount, "ether")})
                .then(function(tx){
                    DApp.handleTransaction(tx);
                })                
                .catch((error) => {
                    console.log("Rejected Ether Topup: ", error);
                    $('#error').removeClass('hidden');
                    $('#errorButton').html("Request to Topup Ether has been rejected!");
                });
        } else if(currency === "token") {
            console.log("Topup Token");
            DApp.tokenContract.transfer(walletAddress, amount * DApp.tokenDecimalMultiplier, {from: DApp.currentAccount})
                .then(function(tx){
                    DApp.handleTransaction(tx);
                })
                .catch((error) => {
                    console.log("Rejected Token Topup: ", error);
                    $('#error').removeClass('hidden');
                    $('#errorButton').html("Request to Topup tokens has been rejected!");
                });
        } else {
            throw new Error("Unknown currency!");
        }
    },

    handleTransaction: function(tx){
        DApp.waitForMined(tx, { blockNumber: null }, // see next area
            function pendingCB () {
                $("#spinner").removeClass('hidden');
                console.log("Confirming transaction...");                  
            },
            function successCB (response) {
                console.log("XXXXXX: ", response);
                if(response.status == "0x0"){
                    console.log("Transaction failed.");
                    $('#error').removeClass('hidden');
                    $('#errorButton').html("Transaction failed.");
                }
                $("#spinner").addClass('hidden');
                DApp.clearTable();
                DApp.loadWallets();
            }
        )
    },

    // Callback handler for whether it was mined or not
    waitForMined: function(txHash, response, pendingCB, successCB){
      if (response.blockNumber) {
        successCB(response);
      } else {
        pendingCB();
        DApp.pollingLoop(txHash, response, pendingCB, successCB);
      }
    },

    // Recursive polling to do continuous checks for when the transaction was mined
    pollingLoop: function(txHash, response, pendingCB, successCB){
      setTimeout(function () {
        web3.eth.getTransactionReceipt(txHash, (error, response) => {
          if (error) { throw error }
            if (response === null) {
              response = { blockNumber: null }
            } // Some ETH nodes do not return pending tx
            DApp.waitForMined(txHash, response, pendingCB, successCB)
        })
      }, 1000) // check again in one sec.
    },

    /**************************************************************************
     * Wallet amounts tracking methods.
     *************************************************************************/    
    addFundsToWallet: function(walletAddress, token, amount){
        if(typeof DApp.wallets[walletAddress] == "undefined"){
            DApp.wallets[walletAddress] = {};
        }
        if(typeof DApp.wallets[walletAddress][token] == "undefined"){
            DApp.wallets[walletAddress][token] = 0;
        }
        DApp.wallets[walletAddress][token] += amount;

        //refresh doesn't work so using a workaround
        //DApp.table.bootstrapTable('refresh');
        DApp.table.bootstrapTable('updateRow', {index: 1000, row: null})
    },

    getKnownWalletBallance: function(walletAddress, token){
        if(typeof DApp.wallets[walletAddress] == "undefined") return 0;
        if(typeof DApp.wallets[walletAddress][token] == "undefined") return 0;
        var value = DApp.wallets[walletAddress][token];
        return value
    },

    /**************************************************************************
     * Form methods.
     *************************************************************************/
    initCreateWalletForm: function(){
        $("#create-wallet-form").submit(function(event) {
            event.preventDefault();
            var form = $(this);
            var ethAddress = form.find("#ethereumAddress").val();
            var ethAmount = form.find("#etherAmount").val();
            var unlockDate = new Date(form.find("#unlockDate").val()).getTime() / 1000;
            DApp.createNewWallet(ethAddress, ethAmount, unlockDate);
        });
    },

    prefillCreateWalletForm: function(){
        $("#create-wallet-form #ethereumAddress").val(DApp.currentAccount);
        $("#create-wallet-form #etherAmount").val(0.0);
        var date = new Date();
        date.setMinutes(date.getMinutes() + 10);
        date = date.toISOString();
        date = date.slice(0, -8)
        $("#create-wallet-form #unlockDate").val(date);
    },

    initTopupWalletForm: function(){
        $("#topup-wallet-form").submit(function(event) {
            event.preventDefault();
            var form = $(this);
            var targetWalletAddress = form.find('#knownWalletAddresses option').filter(":selected").val();
            var amount = form.find("#amount").val();
            var currency = form.find("#currency").val();
            DApp.topupWallet(targetWalletAddress, amount, currency);
        });
    },

    updateKnownWalletAddresses: function(walletAddress){
        // Add new address option to dropdown.
        $("#knownWalletAddresses").append("<option value='" + walletAddress + "'>" + walletAddress + "</option>");

        // Get rid of duplicate addresses
        var usedNames = {};
        $("select[id='knownWalletAddresses'] > option").each(function () {
            if(usedNames[this.text]) {
                $(this).remove();
            } else {
                usedNames[this.text] = this.value;
            }
        });
    },

    updateClaimWalletAddresses: function(walletAddress, to){
        //Only pick owned accounts
        if(DApp.currentAccount === to){
            // Add new address option to dropdown.
            $("#claimWalletAddresses").append("<option value='" + walletAddress + "'>" + walletAddress + "</option>");

            // Get rid of duplicate addresses
            var usedNames = {};
            $("select[id='claimWalletAddresses'] > option").each(function () {
                if(usedNames[this.text]) {
                    $(this).remove();
                } else {
                    usedNames[this.text] = this.value;
                }
            });
        }
    },

    updateClaimForm: function(){
        var form = $('#claim-funds-form');
        var wallet = $('#claimWalletAddresses').val();
        var currency = form.find("#claimableCurrency").val();
        if(currency == "ether"){
            var weiValue = DApp.getKnownWalletBallance(wallet, 'wei');
            var ethValue = web3.fromWei(weiValue, 'ether');
            form.find("#claimableAmount").val(ethValue);
        } else if(currency == "token") {
            var tokenValue = DApp.getKnownWalletBallance(wallet, 'token') / DApp.tokenDecimalMultiplier;
            form.find("#claimableAmount").val(tokenValue); 
        } else { 
            console.log("Unknown currency set: " + currency);
        }

        //Update Unlock In
        DApp.table.bootstrapTable('getData').forEach(function(row) {
            if(row["wallet"] == wallet) {
                var unlockDate = row["unlockDate"];
                var now = Math.floor(Date.now() / 1000);

                var weiValue = DApp.getKnownWalletBallance(row['wallet'], 'wei');
                var ethValue = web3.fromWei(weiValue, 'ether');
                var tokenValue = DApp.getKnownWalletBallance(row['wallet'], 'token') / DApp.tokenDecimalMultiplier;
                var hasFunds = true;
                if(ethValue == 0 && tokenValue == 0){
                    hasFunds = false;
                }

                if(now >= unlockDate && hasFunds) {
                    $("#unlockIn").val('OPEN');
                    $("#claim-submit-button").prop('disabled', false);
                } else {
                    $("#unlockIn").val(DApp.dateFormatter(unlockDate));
                    $("#claim-submit-button").prop('disabled', true);
                }
            }
        });
    },

    initClaimForm: function(){
        console.log("initClaimForm");

        $('#claim-funds-form #claimWalletAddresses').change(DApp.updateClaimForm);
        $('#claim-funds-form #claimableCurrency').change(DApp.updateClaimForm);
        $('a[data-toggle="tab"]').on('shown.bs.tab', DApp.updateClaimForm);

        $("#claim-funds-form").submit(function(event) {
            event.preventDefault();
            var form = $(this);
            var walletAddress = form.find('#claimWalletAddresses option').filter(":selected").val();
            var currency = form.find("#claimableCurrency").val();

            DApp.claimFunds(walletAddress, currency);
        });
    },


    /**************************************************************************
     * Table methods
     *************************************************************************/
    initTable: function(){
        DApp.table = $("#wallets-table");
        DApp.table.bootstrapTable({
            iconsPrefix: 'fa',
            icons: {
                // paginationSwitchDown: 'glyphicon-collapse-down icon-chevron-down',
                // paginationSwitchUp: 'glyphicon-collapse-up icon-chevron-up',
                // refresh: 'glyphicon-refresh icon-refresh',
                // toggle: 'glyphicon-list-alt icon-list-alt',
                // columns: 'glyphicon-th icon-th',
                detailOpen: 'fa-plus',
                detailClose: 'fa-minus'
            },
            detailView: true,
            detailFormatter: DApp.detailFormatter,
            sortName: 'createdAt',
            sortOrder: 'desc',
            columns: [
                { 
                    field: 'from', 
                    title: 'From',
                    formatter: DApp.hashFormatter,
                    searchable: true
                }, { 
                    field: 'type',        
                    title: 'Type',
                    formatter: DApp.typeFormatter       
                },{ 
                    field: 'to',
                    title: 'To',
                    formatter: DApp.hashFormatter
                },{ 
                    field: 'wallet',      
                    title: 'Wallet',
                    formatter: DApp.hashFormatter     
                },{ 
                    field: 'createdAt',
                    title: 'Age',
                    formatter: DApp.dateFormatter,
                    sortable: true
                },{ 
                    field: 'unlockDate',
                    title: 'Unlock In',
                    formatter: DApp.dateFormatter,
                    sortable: true
                },{ 
                    field: 'value',
                    title: "Value",
                    formatter: DApp.valueFormatter,
                    sortable: false
                },{ 
                    field: 'actions',
                    title: "Actions",
                    formatter: DApp.actionFormatter
                }
            ],
        });
    },

    addWalletToTable: function(from, to, wallet, createdAt, unlockDate, value, currency = "Ether"){
        newRow = {
            type: DApp.discoverType(from, to),
            from: from,
            to: to,
            wallet, wallet,
            createdAt: createdAt,
            unlockDate: unlockDate,
        }
        DApp.table.bootstrapTable('append', newRow);

        DApp.updateKnownWalletAddresses(wallet);
        DApp.updateClaimWalletAddresses(wallet, to);
    },

    clearTable: function() {
        DApp.table.bootstrapTable('removeAll');
        DApp.wallets = {};
    },

    discoverType: function(from, to){
        if(from == to && from == DApp.currentAccount){
            return "self";
        } else if(from == DApp.currentAccount){
            return "out";
        } else if(to == DApp.currentAccount){
            return "in";
        } else {
            throw new Error("Unknown type!");
        }
    },

    typeFormatter: function(type){
        var badgeClass = {
            "self": "badge-info",
            "in":   "badge-success",
            "out":  "badge-warning"
        };

        return `<span class="badge ${badgeClass[type]}">${type}</span>`;
    },

    hashFormatter: function(hash, row, index){
        shortHash = hash.slice(0, 10);
        return `<a href="https://rinkeby.etherscan.io/address/${hash}" target="_blank">${shortHash}...</a>`;
    },

    dateFormatter: function(timestamp, row, index){
        return moment(timestamp*1000).fromNow();
    },

    valueFormatter: function(cell, row){
        var weiValue = DApp.getKnownWalletBallance(row['wallet'], 'wei');
        var ethValue = web3.fromWei(weiValue, 'ether');
        var tokenValue = DApp.getKnownWalletBallance(row['wallet'], 'token') / DApp.tokenDecimalMultiplier;

        if(ethValue == 0 && tokenValue == 0){
            return 'Wallet empty';
        } 
        var html = '';
        if(ethValue > 0) { html += `${ethValue} Ether</br>`}
        if(tokenValue > 0) { html += `${tokenValue} token`}

        return html;
    },

    detailFormatter: function(index, row){
        var table = $("<table></table");
        return table.bootstrapTable({
            showHeader: false,
            columns: [
                { 
                    field: 'key', 
                    title: 'Key',
                    cellStyle: DApp.detailViewKeyColumnFormatter 
                }, { 
                    field: 'value',        
                    title: 'Value',
                }
            ],
            data: [
                {
                    key: "From",
                    value: row['from']
                }, {
                    key: "Type",
                    value: DApp.typeFormatter(row['type'])
                },{
                    key: "To",
                    value: row['to']
                },{
                    key: "Wallet Address",
                    value: row['wallet']
                },{
                    key: "Age",
                    value: DApp.dateFormatter(row['createdAt'])
                },{
                    key: "Unlock In",
                    value: DApp.dateFormatter(row['unlockDate'])
                },{
                    key: "Value",
                    value: DApp.valueFormatter(false, row)
                }
            ],
        });
    },

    detailViewKeyColumnFormatter: function(value, row, index, field){
        return {
            classes: 'font-weight-bold',
        };
    },

    actionFormatter: function(value, row, index, field){
        var unlockDate = row["unlockDate"];
        var now = Math.floor(Date.now() / 1000);

        var weiValue = DApp.getKnownWalletBallance(row['wallet'], 'wei');
        var ethValue = web3.fromWei(weiValue, 'ether');
        var tokenValue = DApp.getKnownWalletBallance(row['wallet'], 'token') / DApp.tokenDecimalMultiplier;
        var hasFunds = true;
        if(ethValue == 0 && tokenValue == 0){
            hasFunds = false;
        }

        if(now >= unlockDate && row["to"] == DApp.currentAccount && hasFunds) {
            var html = `<button class="btn btn-danger" onClick="DApp.handleTopupButtonClick('${row['wallet']}')">Topup</button>` +
                    `<button class="btn btn-warning text-white" onClick="DApp.handleClaimButtonClick('${row['wallet']}')">Claim</button>`;
        } else {
            var html = `<button class="btn btn-danger" onClick="DApp.handleTopupButtonClick('${row['wallet']}')">Topup</button>`;
        }
        return html;
    },

    handleTopupButtonClick: function(walletAddress){
        $('#knownWalletAddresses').val(walletAddress).change();
        $('#topup-tab').tab('show');
    },

    handleClaimButtonClick: function(walletAddress){
        $('#claimWalletAddresses').val(walletAddress).change();
        DApp.updateClaimForm();
        $('#claim-tab').tab('show');
    },

    handleErrorButtonClick: function() {
        $('#error').addClass('hidden');
        //location.reload();
    }
}

$(function() {
    DApp.init();
});
