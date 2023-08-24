//ethers variable is available in global scope
//I am just being explict
const { deployments, getNamedAccounts, ethers } = require("hardhat")

async function main() {
    const { deployer } = await getNamedAccounts()
    //To run the deploy scripts with the tag all
    //This will deploy the mocks and FundMe contract
    await deployments.fixture("all")
    const fundMe = await ethers.getContract("FundMe", deployer)
    console.log("Withdrawing from contract...")
    const transactionResponse = await fundMe.withdraw()
    await transactionResponse.wait(1)
    console.log("Got it back!")

    //yarn hardhat node - runs a local network with all contracts deployed
    //yarn hardhat run scripts/withdraw.js --network localhost
    //You can add your scripts do the package.json
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
