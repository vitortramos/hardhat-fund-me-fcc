const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

//runs only in in developement chains not in testnets
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          let fundMeAddress
          let mockV3AggregatorAddress

          beforeEach(async function () {
              //deploy our fundMe contract
              //using hardhat deploy
              //const accounts = await ethers.getSigners() //return a list of ten fake accounts
              //const accountZero = accounts[0]
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture("all")
              fundMe = await ethers.getContract("FundMe", deployer)
              fundMeAddress = fundMe.target
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer,
              )
              mockV3AggregatorAddress = mockV3Aggregator.target
          })

          describe("constructor", async function () {
              it("Sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3AggregatorAddress)
              })
          })

          describe("receive", async function () {
              it("receive method should call fund function", async function () {
                  const accounts = await ethers.getSigners()
                  const accountOne = accounts[1]
                  const sendValue = ethers.parseEther("1")
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMeAddress)
                  //Act
                  await accountOne.sendTransaction({
                      to: fundMeAddress,
                      value: sendValue,
                  })

                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMeAddress,
                  )

                  //Assert
                  assert.equal(
                      startingFundMeBalance + sendValue,
                      endingFundMeBalance,
                  )
              })
          })

          describe("fallback", async function () {
              it("fallback method should call fund function", async function () {
                  const accounts = await ethers.getSigners()
                  const accountOne = accounts[1]
                  const sendValue = ethers.parseEther("1")
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMeAddress)
                  //Act
                  /* await expect(
                await accountOne.sendTransaction({
                    to: fundMeAddress,
                    value: sendValue,
                    data: "0x123456",
                }),
            ).to.be.revertedWithCustomError(fundMe, "FundMe__FallbackCalled") */

                  await accountOne.sendTransaction({
                      to: fundMeAddress,
                      value: sendValue,
                      data: "0x123456",
                  })
                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMeAddress,
                  )

                  //Assert
                  assert.equal(
                      startingFundMeBalance + sendValue,
                      endingFundMeBalance,
                  )
              })
          })

          describe("fund", async function () {
              it("Fails if you don´t send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!",
                  )
              })
              it("Updates the amount funded data structure", async function () {
                  //const sendValue = 1000000000000000000 //eth
                  //Same as
                  const sendValue = ethers.parseEther("1")
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer,
                  )
                  //response will be a big number
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funder to array of funders", async function () {
                  const sendValue = ethers.parseEther("1")
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)

                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", async function () {
              //contract should have money before the withdraw
              beforeEach(async function () {
                  const sendValue = ethers.parseEther("1")
                  await fundMe.fund({ value: sendValue })
              })

              it("Withdraw ETH from a single funder", async function () {
                  //Arrange
                  console.log(fundMeAddress)
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMeAddress)
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  //Get gas fee from transactionReceipt
                  const { gasUsed, gasPrice, fee } = transactionReceipt
                  console.log(gasUsed)
                  console.log(fee)
                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMeAddress,
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance + startingDeployerBalance,
                      endingDeployerBalance + fee,
                  )

                  //await expect( attackerConnectedContract.withdraw() ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
              })

              it("Withdraw ETH from multiple funders", async function () {
                  //Arrange
                  const sendValue = ethers.parseEther("1")
                  const accounts = await ethers.getSigners()
                  for (let i = 0; i < accounts.length; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i],
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMeAddress)
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  //Get gas fee from transactionReceipt
                  const { gasUsed, gasPrice, fee } = transactionReceipt
                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMeAddress,
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance + startingDeployerBalance,
                      endingDeployerBalance + fee,
                  )
                  //Make sure that funders are reset properly
                  expect(fundMe.getFunder(0)).to.be.reverted
                  for (let i = 0; i < accounts.length; i++) {
                      //console.log(accounts[i].address)
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address,
                          ),
                          0,
                      )
                  }
              })

              it("It only allows the owner to withdraw", async function () {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerContract = fundMe.connect(attacker)

                  //Assert
                  await expect(
                      attackerContract.withdraw(),
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
              })
          })

          describe("cheaperWithdraw", async function () {
              //contract should have money before the withdraw
              beforeEach(async function () {
                  const sendValue = ethers.parseEther("1")
                  await fundMe.fund({ value: sendValue })
              })

              it("Withdraw ETH from a single funder", async function () {
                  //Arrange
                  console.log(fundMeAddress)
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMeAddress)
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  //Get gas fee from transactionReceipt
                  const { gasUsed, gasPrice, fee } = transactionReceipt
                  console.log(gasUsed)
                  console.log(fee)
                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMeAddress,
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance + startingDeployerBalance,
                      endingDeployerBalance + fee,
                  )

                  //await expect( attackerConnectedContract.withdraw() ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
              })

              it("Withdraw ETH from multiple funders", async function () {
                  //Arrange
                  const sendValue = ethers.parseEther("1")
                  const accounts = await ethers.getSigners()
                  for (let i = 0; i < accounts.length; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i],
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMeAddress)
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  //Get gas fee from transactionReceipt
                  const { gasUsed, gasPrice, fee } = transactionReceipt
                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMeAddress,
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  //Assert
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance + startingDeployerBalance,
                      endingDeployerBalance + fee,
                  )
                  //Make sure that funders are reset properly
                  expect(fundMe.getFunder(0)).to.be.reverted
                  for (let i = 0; i < accounts.length; i++) {
                      //console.log(accounts[i].address)
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address,
                          ),
                          0,
                      )
                  }
              })

              it("It only allows the owner to withdraw", async function () {
                  //Arrange
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerContract = fundMe.connect(attacker)

                  //Assert
                  await expect(
                      attackerContract.cheaperWithdraw(),
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
              })
          })
      })
