# Time Locked Wallet - TopCoder/ConsenSys Hackathon

https://github.com/radek1st/uport-time-locked-wallets

## Time Locked Wallets - Use Cases

There are many different applications of the Ethereum smart contracts, 
the most popular at the moment being cryptocurrencies aka ERC20 tokens and crowd funding token sales aka ICOs.
In this hackathon, I would like to explore something different, like the idea of locking funds in crypto wallet contracts. 

Here are several examples, starting with, probably the most common reason at the moment, to lock the funds called `vesting`. 
Imagine that you have just
raised a successful ICO and your company still holds a majority of the tokens distributed between the team members.
It would be beneficial to all the parties to ensure that the tokens hold by employees cannot be traded straight away.
If they are no controls in place, employees might take action and sell all of them, cash out and quit the company.
At the same time it would negatively affect the market price and make all the contributors to the project unhappy.
  
Another idea is to use smart contract as a crypto will/testament. 
Imagine I would like to store my crypto savings in a contract
which will be accessible by members of the family, but only after something has happened to me. Let's say I should
'check-in' with the wallet, by evoking some contract call every so-often. If I don't check in on time, something might have
happened to me and they can withdraw the funds. Either by reaching a consensus between the family members 
or by explicitly setting in the contract the proportions of the funds corresponding to each of them.  

Different application of locking funds could be to create a small pension fund or time based safe/saving account that prevents the owner
from withdrawing the funds before a certain time in the future. It could be particurarly useful for addicted crypto traders 
in helping keep their Ether intact e.g. `HODL wallet`. Also, what is a use case for this hackathon, 
to put some crypto money away for later for someone else, like a future birthday gift.

## Demo

Why don't I introduce the actors of the demo first. Lets assume Alice is going to be the creator of the time locked wallet and
Bob will be the recipient/owner of the funds.

Here comes the demo outline:

* Alice creates a time locked wallet for Bob and sends some ETH
* Alice additionally sends some ERC20 TopCoder tokens
* Bob can see the wallets he has access to and the ones he created
* Bob cannot withdraw any funds before the wallet time lock expires or is empty
* Bob withdraws the ETH when the wallet gets unlocked
* Bob withdraws all TopCoder tokens 

The demo is recorded and uploaded here: https://youtu.be/q4sUnL3KhOU.

## Technical Details

There are three contracts of essence to this demo:
`TimeLockedWallet.sol`, `TimeLockedWalletFactory.sol` and `TopCoderToken.sol`.

`TimeLockedWalletFactory` is deployed to Rinkeby test network here:
https://rinkeby.etherscan.io/address/0x6b2315851d97477ddd9c0921ad9ee17d70737e77#code and `TopCoderToken` here: https://rinkeby.etherscan.io/address/0x3b03d5853a6478ca46a2326f7bcb2e86927185ea#code. 
A new `TimeLockedWallet` contract is deployed automatically by
calling `newTimeLockedWallet` on the `TimeLockedWalletFactory`.

## Running Locally

Firstly, install [Node](https://nodejs.org/en/) and [Git](https://git-scm.com/) on your machine.
Once it's done install Truffle with:
```
npm install -g truffle
```

Checkout this project source code:
```
git clone https://github.com/radek1st/uport-time-locked-wallets
cd uport-time-locked-wallets
```

And then compile and migrate the contracts: 
```
truffle develop
> compile
> migrate
```

Finally, you can run the DApp:
```
npm run dev
```
which will launch a browser tab on `http://localhost:3000/`. 

Install the [uPort](https://www.uport.me/) app on your smartphone and give it a go.

## Issues

I've discovered the following issues:

* When sending Ether using payable methods on uPort wrapped contract object, invalid value is sent. I filed a bug report here: https://github.com/uport-project/uport-connect/issues/90
* Rinkeby Etherscan is not reflecting correctly TimeLockedWallet contracts, probably because they were deployed from within the factory contract. Neither it is showing correctly all Ether transactions.
