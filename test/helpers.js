/* eslint-disable no-undef */
const tokens = (n) => {
	return new web3.utils.BN(
		web3.utils.toWei(n.toString(), 'ether')
		)
}

const EVM_REVERT = 'VM Exception while processing transaction: revert'

module.exports = {
	tokens,EVM_REVERT
}
