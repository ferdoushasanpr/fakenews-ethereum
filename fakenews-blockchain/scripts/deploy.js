const hre = require("hardhat");

const main = async () => {
  const NewsVerificationFactory = await hre.ethers.getContractFactory(
    "NewsVerification"
  );

  console.log("-----------------------------------------");
  console.log("Deploying NewsVerification contract...");
  const newsVerification = await NewsVerificationFactory.deploy();
  await newsVerification.waitForDeployment();

  const contractAddress = await newsVerification.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("-----------------------------------------");

  const [owner] = await hre.ethers.getSigners();
  console.log("Owner/Reporter Address:", owner.address);

  const contentReal =
    "The local bridge repair project was completed one month ahead of schedule.";
  const txReal = await newsVerification.addNews(contentReal, true);
  await txReal.wait();

  console.log("\n📰 News 1 (Real) added! Tx Hash:", txReal.hash);

  const contentFake =
    "A new species of giant squid has been sighted in the local pond.";
  const txFake = await newsVerification.addNews(contentFake, false);
  await txFake.wait();

  console.log("❌ News 2 (Fake) added! Tx Hash:", txFake.hash);
  console.log("-----------------------------------------");

  const newsChain = await newsVerification.getNewsChain();

  console.log(
    "\nRetrieving Full News Chain (Total Count:",
    newsChain.length + ")"
  );

  newsChain.forEach((item, index) => {
    const timestamp = Number(item.timestamp);
    const date = new Date(timestamp * 1000).toLocaleString();

    console.log(`\n--- Item #${index} ---`);
    console.log(`Status: ${item.isReal ? "✅ REAL" : "❌ FAKE"}`);
    console.log(`Reporter: ${item.reporter}`);
    console.log(`Time: ${date} (Timestamp: ${timestamp})`);
    console.log(`Content: "${item.content}"`);
  });

  console.log("\nScript execution finished.");
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
