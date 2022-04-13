const { default: Web3 } = require('web3');
const { ETHER_ADDRESS, ether } = require('./helpers');

/* eslint-disable no-undef */
var tokens = require('./helpers').tokens;
var EVM_REVERT = require('./helpers').EVM_REVERT;

const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
    let exchange
    let token
    const feePercent = 10

    beforeEach(async () => {
        // Deploy token
        token = await Token.new()
        // Transfer some tokens to  user1
        token.transfer(user1, tokens(100), { from: deployer })
        // Deploy exchange
        exchange = await Exchange.new(feeAccount, feePercent)
    })
    describe('deployment', () => {
        it('tracks the fee account', async () => {
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it('tracks the fee percent', async () => {
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
    })

    describe('fallback', () => {
        it('reverts when ether is sent', async () => {
            await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('depositing ether', async () => {
        let result
        let amount

        beforeEach(async () => {
            amount = ether(1);
            result = await exchange.depositEther({ from: user1, value: amount })
        })

        it('tracks the ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1)
            balance.toString().should.equal(amount.toString())
        })

        it('emits a Deposit event', async () => {
            const log = result.logs[0]
            log.event.should.eq('Deposit')
            const event = log.args
            event.token.should.equal(ETHER_ADDRESS, 'token address is correct')
            event.user.should.equal(user1, 'user address is correct')
            event.amount.toString().should.equal(amount.toString(), 'amount is correct')
            event.balance.toString().should.equal(amount.toString(), 'balance is correct')
        })
    })

    describe('withdrawing Ether', () => {
        let result
        let amount

        beforeEach(async () => {
            // Deposit Ether first
            amount = ether(1)
            await exchange.depositEther({ from: user1, value: amount })
        })

        describe('success', () => {
            beforeEach(async () => {
                // Withdraw Ether
                result = await exchange.withdrawEther(amount, { from: user1 })
            })

            it('withdraws Ether funds', async () => {
                const balance = await exchange.tokens(ETHER_ADDRESS, user1)
                balance.toString().should.equal('0')
            })

            it('emits a "Withdraw" event', () => {
                const log = result.logs[0]
                log.event.should.eq('Withdraw')
                const event = log.args
                event.token.should.equal(ETHER_ADDRESS)
                event.user.should.equal(user1)
                event.amount.toString().should.equal(amount.toString())
                event.balance.toString().should.equal('0')
            })
        })

        describe('failure', () => {
            it('rejects withdraws for insufficient balances', async () => {
                await exchange.withdrawEther(ether(100), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('depositing tokens', () => {
        let result
        let amount

        describe('success', () => {

            beforeEach(async () => {
                amount = tokens(10)
                await token.approve(exchange.address, amount, { from: user1 })
                result = await exchange.depositToken(token.address, tokens(10), { from: user1 })
            })

            it('tracks the token deposit', async () => {
                // Check exchange token balance
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                // Check tokens on exchange
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())
            })

            it('emits a Deposit event', async () => {
                const log = result.logs[0]
                log.event.should.eq('Deposit')
                const event = log.args
                event.token.should.equal(token.address, 'token address is correct')
                event.user.should.equal(user1, 'user address is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal(amount.toString(), 'balance is correct')
            })
        })

        describe('failure', () => {

            it('rejects Ether deposits', async () => {
                await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })

            it('fails when no tokens are approved', async () => {
                // Don't approve any tokens before depositing
                await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('withdrawing tokens', async () => {
        let result
        let amount

        describe('success', async () => {
            beforeEach(async () => {
                // Deposit the tokens first
                amount = ether(10)
                await token.approve(exchange.address, amount, { from: user1 })
                await exchange.depositToken(token.address, amount, { from: user1 })
                // Withdraw the tokens
                result = await exchange.withdrawToken(token.address, amount, { from: user1 })
            })

            it('withdraw token funds', async () => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal('0')
            })

            it('emits a "Withdraw" event', () => {
                const log = result.logs[0]
                log.event.should.eq('Withdraw')
                const event = log.args
                event.token.should.equal(token.address)
                event.user.should.equal(user1)
                event.amount.toString().should.equal(amount.toString())
                event.balance.toString().should.equal('0')
            })
        })

        describe('failure', async () => {
            it('reject Ether withdraws', async () => {
                await exchange.withdrawToken(ETHER_ADDRESS, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })

            it('fails for insufficient balances', async () => {
                await exchange.withdrawToken(token.address, amount, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('checking balances', () => {
        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: ether(1) })
        })

        it('returns user balance', async () => {
            const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
            result.toString().should.equal(ether(1).toString())
        })
    })

    describe('making orders', () => {
        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })

        it('tracks the newly created order', async () => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1, 'user is correct')
            order.tokenGet.should.equal(token.address, 'tokenGet is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })

        it('emits an "Order" event', () => {
            const log = result.logs[0]
            log.event.should.eq('Order')
            const event = log.args
            event.id.toString().should.equal('1', 'id is correct')
            event.user.should.equal(user1, 'user is correct')
            event.tokenGet.should.equal(token.address, 'tokenGet is correct')
            event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })
    })

    describe('order actions', async () => {

        beforeEach(async () => {
            // user1 deposits ether only
            await exchange.depositEther({ from: user1, value: ether(1) })
            // give tokens to user2
            await token.transfer(user2, tokens(100), { from: deployer })
            // user2 deposits tokens only
            await token.approve(exchange.address, tokens(2), { from: user2 })
            await exchange.depositToken(token.address, tokens(2), { from: user2 })
            // user1 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
          })

        describe('filling orders', async () => {
            let result

            describe('success', async () => {
                beforeEach(async () => {
                    // user2 fills order
                    result = await exchange.fillOrder('1', { from: user2 })
                })
                //user2 should receive 10% less ether
                it('executes the trade & charges fees', async () => {
                    // First check balances of user1 - Ether and token
                    etherBalanceOfUser1 = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    etherBalanceOfUser1.toString().should.equal('0', 'user1 Ether deducted')
                    tokenBalanceOfUser1 = await exchange.balanceOf(token.address, user1)
                    tokenBalanceOfUser1.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
                    // // Now user2's balances - including the fee deducted
                    etherBalanceOfUser2 = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    etherBalanceOfUser2.toString().should.equal(ether(1).toString(), 'user2 received Ether')
                    tokenBalanceOfUser2 = await exchange.balanceOf(token.address, user2)
                    tokenBalanceOfUser2.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
                    // // Now check fee account balance
                    feeAccountBalance = await exchange.balanceOf(token.address, feeAccount)
                    feeAccountBalance.toString().should.equal(tokens(0.1).toString(), 'fee account received fee')
                })

                it('updates filled orders', async () => {
                    const orderFilled = await exchange.orderFilled(1)
                    orderFilled.should.equal(true)
                })

                it('emits a "Trade" event', () => {
                    const log = result.logs[0]
                    log.event.should.eq('Trade')
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.userFill.should.equal(user2, 'userFill is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                  })
            })

            describe('failure', () => {

                it('rejects invalid order ids', () => {
                  const invalidOrderId = 99999
                  exchange.fillOrder(invalidOrderId, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
        
                it('rejects already-filled orders', () => {
                  // Fill the order
                  // eslint-disable-next-line no-unused-expressions
                  exchange.fillOrder('1', { from: user2 }).should.be.fulfilled
                  // Try to fill it again
                  exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
        
                it('rejects cancelled orders', () => {
                  // Cancel the order
                  // eslint-disable-next-line no-unused-expressions
                  exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled
                  // Try to fill the order
                  exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
              })
        })


        describe('canceling orders', async () => {
            let result

            describe('success', async () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder('1', { from: user1 })
                })

                it('updates canceled orders', async () => {
                    const orderCancelled = await exchange.orderCancelled(1)
                    orderCancelled.should.equal(true)
                })

                it('emits a "Cancel" event', () => {
                    const log = result.logs[0]
                    log.event.should.eq('Cancel')
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })

            describe('failure', async () => {
                it('rejects invalid order ids', async () => {
                    const invalidOrderId = 99999
                    await exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects unauthorized cancelations', async () => {
                    // Try to cancel an order from another user
                    await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
            })
        })
    })
})
