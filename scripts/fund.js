//only to be explict they are all in global scope
const { deployments, getNamedAccounts, ethers } = require("hardhat")

async function main() {
    const { deployer } = await getNamedAccounts()
    //To run the deploy scripts with the tag all
    //This will deploy the mocks and FundMe contract
    await deployments.fixture("all")
    const fundMe = await ethers.getContract("FundMe", deployer)
    console.log("Funding contract...")
    const transactionResponse = await fundMe.fund({
        value: ethers.parseEther("0.1"),
    })
    await transactionResponse.wait(1)
    console.log("Funded!")

    //yarn hardhat node - runs a local network with all contracts deployed
    //yarn hardhat run scripts/fund.js --network localhost
    //You can add your scripts do the package.json
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
