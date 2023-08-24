const { ethers, getNamedAccounts, network } = require("hardhat")
const { assert } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

//runs only in testnets not in developement chains
developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let fundMeAddress
          const sendValue = ethers.parseEther("1")
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              fundMe = await ethers.getContract("FundMe", deployer)
              fundMeAddress = fundMe.target
          })

          it("Allows people to fund and withdraw", async function () {
              const transactionResponseOne = await fundMe.fund({
                  value: sendValue,
              })
              const transactionReceiptOne = await transactionResponseOne.wait(1)
              const startingFundMeBalance = await ethers.provider.getBalance(
                  fundMeAddress,
              )
              const transactionResponse = await fundMe.withdraw()
              const transactionReceipt = await transactionResponse.wait(1)
              const endingFundMeBalance = await ethers.provider.getBalance(
                  fundMeAddress,
              )
              //assert.equal(startingFundMeBalance, sendValue)
              assert.equal(endingFundMeBalance, 0)
          })
      })
