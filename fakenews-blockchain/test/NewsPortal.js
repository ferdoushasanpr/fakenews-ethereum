const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NewsVerification", function () {
  let NewsVerification;
  let newsVerification;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    NewsVerification = await ethers.getContractFactory("NewsVerification");
    newsVerification = await NewsVerification.deploy();
    await newsVerification.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await newsVerification.getOwner()).to.equal(owner.address);
    });

    it("Should start with an empty news chain", async function () {
      expect(await newsVerification.getTotalNewsCount()).to.equal(0);
      expect(await newsVerification.getNewsChain())
        .to.be.an("array")
        .with.lengthOf(0);
    });
  });

  describe("Adding News", function () {
    const testContent = "Inflation rate dropped to 3% last quarter.";
    const testIsReal = true;

    it("Should allow the owner to add a new news item", async function () {
      await newsVerification.addNews(testContent, testIsReal);

      expect(await newsVerification.getTotalNewsCount()).to.equal(1);

      const chain = await newsVerification.getNewsChain();
      const firstNews = chain[0];

      expect(firstNews.content).to.equal(testContent);
      expect(firstNews.isReal).to.equal(testIsReal);
      expect(firstNews.reporter).to.equal(owner.address);

      expect(firstNews.timestamp).to.be.greaterThan(0);
    });

    it("Should emit a NewsAdded event on success", async function () {
      const tx = await newsVerification.addNews(testContent, testIsReal);

      const receipt = await tx.wait();

      const block = await ethers.provider.getBlock(receipt.blockHash);

      const expectedTimestamp = block.timestamp;

      await expect(tx)
        .to.emit(newsVerification, "NewsAdded")
        .withArgs(0, owner.address, testIsReal, expectedTimestamp);
    });

    it("Should correctly store a 'fake' news item", async function () {
      const fakeContent = "Pigs can fly on Tuesdays.";
      const isFake = false;

      await newsVerification.addNews(fakeContent, isFake);

      const chain = await newsVerification.getNewsChain();
      const fakeNews = chain[0];

      expect(fakeNews.content).to.equal(fakeContent);
      expect(fakeNews.isReal).to.equal(isFake);
    });

    it("Should fail if a non-owner tries to add a news item", async function () {
      const nonOwnerContract = newsVerification.connect(addr1);

      await expect(
        nonOwnerContract.addNews(testContent, testIsReal)
      ).to.be.revertedWith("Only the owner can perform this action.");

      expect(await newsVerification.getTotalNewsCount()).to.equal(0);
    });
  });

  describe("Data Retrieval", function () {
    it("Should retrieve all news items correctly after multiple additions", async function () {
      await newsVerification.addNews("First news item (real)", true);
      await newsVerification.addNews("Second news item (fake)", false);

      expect(await newsVerification.getTotalNewsCount()).to.equal(2);

      const chain = await newsVerification.getNewsChain();
      expect(chain).to.be.an("array").with.lengthOf(2);

      expect(chain[0].content).to.equal("First news item (real)");
      expect(chain[0].isReal).to.be.true;

      expect(chain[1].content).to.equal("Second news item (fake)");
      expect(chain[1].isReal).to.be.false;
    });
  });
});
