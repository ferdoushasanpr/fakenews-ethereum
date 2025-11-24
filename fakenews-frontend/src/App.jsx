import { useState, useEffect } from "react";
import { ethers } from "ethers";
import NewsPortalABI from "./NewsVerification.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const CONTRACT_ABI = NewsPortalABI;

const App = () => {
  const [ethereumAccount, setEthereumAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [newsChain, setNewsChain] = useState([]);
  const [newsContent, setNewsContent] = useState("");
  const [newsIsReal, setNewsIsReal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [contractCode, setContractCode] = useState(null);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  const testContractConnection = async (contractInstance) => {
    try {
      console.log("Testing contract connection...");

      const code = await contractInstance.runner.provider.getCode(
        CONTRACT_ADDRESS
      );
      setContractCode(code);
      console.log("Contract code length:", code.length);

      if (code === "0x") {
        throw new Error("No contract code at this address");
      }

      try {
        const totalCount = await contractInstance.getTotalNewsCount();
        console.log("Total news count:", totalCount.toString());
        return true;
      } catch (countError) {
        console.log("getTotalNewsCount failed, trying alternative methods...");
      }

      try {
        const news0 = await contractInstance.newsChain(0);
        console.log("News item 0:", news0);
        return true;
      } catch (newsError) {
        console.log("Direct news access failed:", newsError);
      }

      throw new Error("Contract methods not accessible - check ABI");
    } catch (error) {
      console.error("Contract test failed:", error);
      throw error;
    }
  };

  const connectWalletAndLoadContract = async () => {
    if (!window.ethereum) {
      showMessage(
        "Please install MetaMask to use the blockchain features.",
        "error"
      );
      return;
    }

    try {
      setLoading(true);
      clearMessage();

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      setEthereumAccount(account);

      let newsContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      try {
        await testContractConnection(newsContract);
        setContract(newsContract);
        showMessage("Successfully connected to contract!", "success");
        await loadNewsFromBlockchain(newsContract);
      } catch (firstError) {
        console.log("First ABI failed, trying alternative ABI...");

        newsContract = new ethers.Contract(CONTRACT_ADDRESS, signer);
        await testContractConnection(newsContract);
        setContract(newsContract);
        showMessage("Successfully connected with alternative ABI!", "success");
        await loadNewsFromBlockchain(newsContract);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        showMessage("Please connect your MetaMask wallet.", "error");
      } else if (error.message.includes("No contract code")) {
        showMessage(
          "No contract found at this address. Please deploy the contract first.",
          "error"
        );
      } else {
        showMessage(`Connection error: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNewsFromBlockchain = async (contractInstance = contract) => {
    if (!contractInstance) return;

    try {
      setLoading(true);
      console.log("Attempting to load news...");

      let news = [];

      try {
        news = await contractInstance.getNewsChain();
        console.log("Loaded news via getNewsChain:", news);
      } catch (error1) {
        console.log("getNewsChain failed, trying manual iteration...");

        try {
          const totalCount = await contractInstance.getTotalNewsCount();
          const count = parseInt(totalCount.toString());
          console.log("Total news count for iteration:", count);

          for (let i = 0; i < count; i++) {
            try {
              const newsItem = await contractInstance.newsChain(i);
              news.push(newsItem);
            } catch (itemError) {
              console.log(`Failed to get news item ${i}:`, itemError);
              break;
            }
          }
          console.log("Loaded news via iteration:", news);
        } catch (error2) {
          console.error("All news loading methods failed:", error2);
          throw new Error("Cannot load news data from contract");
        }
      }

      const processedNews = news
        .map((item, index) => {
          if (Array.isArray(item)) {
            return {
              reporter: item[0],
              content: item[1],
              isReal: item[2],
              timestamp: item[3],
            };
          } else if (item && typeof item === "object") {
            return {
              reporter: item.reporter || item[0],
              content: item.content || item[1],
              isReal: item.isReal !== undefined ? item.isReal : item[2],
              timestamp: item.timestamp || item[3],
            };
          }
          return item;
        })
        .filter((item) => item && item.content);

      setNewsChain(processedNews);
      console.log("Processed news chain:", processedNews);
    } catch (err) {
      console.error("Error loading blockchain news:", err);
      showMessage(`Error loading news: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const submitNewsToBlockchain = async () => {
    if (!contract) {
      showMessage("Please connect wallet first.", "error");
      return;
    }

    if (!newsContent.trim()) {
      showMessage("Please enter news content", "error");
      return;
    }

    try {
      setLoading(true);
      showMessage("Submitting transaction...", "info");

      console.log("Submitting news:", {
        content: newsContent,
        isReal: newsIsReal,
      });

      const tx = await contract.addNews(newsContent, newsIsReal);
      showMessage("Transaction submitted. Waiting for confirmation...", "info");

      console.log("Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      showMessage("News successfully added to blockchain!", "success");

      setTimeout(() => {
        loadNewsFromBlockchain();
      }, 2000);

      setNewsContent("");
    } catch (error) {
      console.error("Transaction error:", error);

      if (error.code === 4001) {
        showMessage("Transaction rejected by user.", "error");
      } else if (error.reason) {
        showMessage(`Transaction failed: ${error.reason}`, "error");
      } else {
        showMessage(`Error: ${error.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) {
      loadNewsFromBlockchain();
    }
  }, [contract]);

  useEffect(() => {
    if (messageType === "success") {
      const timer = setTimeout(clearMessage, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-center text-4xl mb-6 text-indigo-400">
        News Verification Blockchain
      </h1>

      {message && (
        <div
          className={`max-w-3xl mx-auto mb-4 p-3 rounded text-center ${
            messageType === "error"
              ? "bg-red-600"
              : messageType === "success"
              ? "bg-green-600"
              : "bg-blue-600"
          }`}
        >
          {message}
          {messageType === "error" && (
            <button onClick={clearMessage} className="ml-2 text-sm underline">
              Dismiss
            </button>
          )}
        </div>
      )}

      {contractCode && (
        <div className="max-w-3xl mx-auto mb-4 p-2 bg-yellow-600 rounded text-center text-sm">
          Contract Code: {contractCode === "0x" ? "NOT DEPLOYED" : "DEPLOYED"} |
          News Count: {newsChain.length}
        </div>
      )}

      <div className="mb-6 text-center">
        <button
          onClick={connectWalletAndLoadContract}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 rounded-lg font-bold disabled:bg-indigo-400 hover:bg-indigo-700"
        >
          {loading ? "Connecting..." : "Connect MetaMask"}
        </button>
        {ethereumAccount && (
          <p className="mt-2 text-green-400">Connected: {ethereumAccount}</p>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded-xl mb-10 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Submit News to Blockchain</h2>

        <textarea
          className="w-full p-3 bg-gray-700 rounded mb-3 border border-gray-600"
          placeholder="Enter news content..."
          value={newsContent}
          onChange={(e) => setNewsContent(e.target.value)}
          rows="4"
        />

        <div className="flex items-center mb-3">
          <label className="mr-4 flex items-center">
            <input
              type="radio"
              value="true"
              checked={newsIsReal === true}
              onChange={(e) => setNewsIsReal(e.target.value === "true")}
              className="mr-2"
            />
            Real ✅
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="false"
              checked={newsIsReal === false}
              onChange={(e) => setNewsIsReal(e.target.value === "true")}
              className="mr-2"
            />
            Fake ❌
          </label>
        </div>

        <button
          onClick={submitNewsToBlockchain}
          disabled={loading || !contract || !newsContent.trim()}
          className="w-full p-3 bg-green-600 rounded-lg font-bold disabled:bg-green-400 hover:bg-green-700"
        >
          {loading ? "Submitting..." : "Submit to Blockchain"}
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold">Stored News on Blockchain</h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-gray-700 rounded text-sm">
              Total: {newsChain.length}
            </span>
            <button
              onClick={() => loadNewsFromBlockchain()}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 rounded text-sm disabled:bg-gray-600 hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading news...</div>
        ) : newsChain.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No news items found. Submit some news to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {newsChain.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800 p-4 rounded-xl border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      item.isReal ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {item.isReal ? "REAL ✅" : "FAKE ❌"}
                  </span>
                  <span className="text-sm text-gray-400">
                    #{newsChain.length - index}
                  </span>
                </div>
                <p className="mb-3 text-lg">{item.content}</p>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Reporter: {item.reporter?.substring(0, 10)}...</span>
                  <span>
                    {item.timestamp
                      ? new Date(Number(item.timestamp) * 1000).toLocaleString()
                      : "Recent"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
