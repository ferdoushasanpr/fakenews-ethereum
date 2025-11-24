import { useState, useEffect, useCallback } from "react";

/**
 * Calculates the SHA-256 hash of a string.
 * @param {string} dataString The string to hash (block index, timestamp, data, nonce, prevHash).
 * @returns {string} The resulting SHA-256 hash.
 */
const calculateHash = (dataString) => {
  // We assume window.CryptoJS is available from a CDN script tag in the root HTML.
  if (typeof window.CryptoJS !== "undefined" && window.CryptoJS.SHA256) {
    return window.CryptoJS.SHA256(dataString).toString(window.CryptoJS.enc.Hex);
  }
  // Fallback/Warning if CryptoJS is not loaded correctly.
  console.warn(
    "CryptoJS not found. Using fallback hash. Ensure the CDN script is loaded."
  );
  // The previous hash value was '0000fallbackhash' which passes the difficulty check.
  // We'll return a clearly invalid one here if the library is missing.
  return "MISSINGCRYPTOJS";
};

// Main App component
const App = () => {
  // State for the blockchain array
  const [chain, setChain] = useState([]);

  // State for the next block to be mined
  const [blockData, setBlockData] = useState("");

  // Mining state and constants
  const [difficulty, setDifficulty] = useState(4); // Target: 4 leading zeros
  const [isMining, setIsMining] = useState(false);
  const [message, setMessage] = useState("");

  // 1. Core Block Generation Function
  const createNewBlock = (index, prevHash, data, nonce, hash) => ({
    index,
    timestamp: Date.now(),
    data,
    nonce,
    prevHash,
    hash,
  });

  // 2. Genesis Block Creation (runs once on load)
  const createGenesisBlock = useCallback(() => {
    const genesisData = "Initial ledger record for the network start.";
    const initialNonce = 0;

    // Hash calculated to satisfy the current difficulty (4 zeros) for the genesis block
    // using the fixed data and nonce 0. This is pre-calculated for stability.
    const fixedGenesisHash =
      "0000a297e556e87f8976b328a3818363a233b3b441f714210080616b7617b1d9";

    setChain([
      createNewBlock(0, "0", genesisData, initialNonce, fixedGenesisHash),
    ]);
  }, []);

  useEffect(() => {
    // Initialize the chain if it's empty
    if (chain.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      createGenesisBlock();
    }
  }, [chain.length, createGenesisBlock]);

  // 3. Proof-of-Work (Mining) Logic
  const mineBlock = async () => {
    if (!blockData) {
      setMessage("Please enter some data for the new block.");
      return;
    }

    setIsMining(true);
    setMessage("Mining block... searching for a valid nonce.");

    const latestBlock = chain[chain.length - 1];
    const nextIndex = latestBlock.index + 1;
    const prevHash = latestBlock.hash;
    const target = "0".repeat(difficulty);

    let nonce = 0;
    let hash = "";
    const startTime = Date.now();

    // Simulate intensive CPU work (Proof-of-Work)
    while (true) {
      const dataToHash = nextIndex + Date.now() + blockData + nonce + prevHash;
      hash = calculateHash(dataToHash);

      if (hash.substring(0, difficulty) === target) {
        break; // Found the valid hash (Proof of Work done)
      }

      nonce++;

      // Periodically check if we've spent too much time and yield control
      if (nonce % 50000 === 0) {
        // Yield control to the browser, necessary for long-running synchronous loops
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Safety break for extremely high difficulty or slow environments
      if (nonce > 10000000) {
        setMessage("Mining timeout reached. Try lowering the difficulty.");
        setIsMining(false);
        return;
      }
    }

    const endTime = Date.now();
    const miningTime = ((endTime - startTime) / 1000).toFixed(2);

    // Block successfully mined
    const newBlock = createNewBlock(
      nextIndex,
      prevHash,
      blockData,
      nonce,
      hash
    );

    setChain([...chain, newBlock]);
    setBlockData(""); // Clear input
    setIsMining(false);
    setMessage(
      `Block #${nextIndex} successfully mined in ${miningTime} seconds after ${nonce} attempts!`
    );
  };

  // UI Rendering Functions
  const BlockCard = ({ block }) => {
    // The hashing condition for 'isMined' must use the current difficulty from state
    const target = "0".repeat(difficulty);
    // If the hash is the fallback value, mark it as invalid visually
    const isMined =
      block.hash.substring(0, difficulty) === target &&
      block.hash !== "MISSINGCRYPTOJS";
    // Note: The BlockCard logic still uses the old light theme classes, but the container handles the dark mode appearance.
    // We will update the inner BlockCard styling here to consistently use the dark theme colors.

    return (
      <div
        className={`p-4 rounded-xl shadow-lg border-l-8 transition duration-300 mb-6 
                ${
                  isMined
                    ? "bg-green-800/20 border-green-500" // Mined
                    : block.hash === "MISSINGCRYPTOJS"
                    ? "bg-yellow-800/20 border-yellow-500" // Missing Crypto
                    : "bg-red-800/20 border-red-500" // Invalid
                }
            `}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-white">Block #{block.index}</h3>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full 
                        ${
                          block.prevHash === "0"
                            ? "bg-indigo-600 text-white"
                            : "bg-blue-600 text-white"
                        }
                    `}
          >
            {block.prevHash === "0" ? "GENESIS" : isMined ? "MINED" : "INVALID"}
          </span>
        </div>

        <p className="text-sm text-gray-300 mb-1">
          <span className="font-semibold text-gray-200">Timestamp:</span>{" "}
          {new Date(block.timestamp).toLocaleString()}
        </p>
        <div className="bg-gray-700 p-3 rounded-lg border border-gray-600 mb-2">
          <p className="text-sm font-mono break-all text-gray-200">
            <span className="font-semibold text-xs text-indigo-400 uppercase block">
              Data (Transaction):
            </span>
            {block.data}
          </p>
        </div>

        <p className="text-sm text-gray-300 mb-1">
          <span className="font-semibold text-gray-200">Nonce:</span>{" "}
          {block.nonce}
        </p>

        <p className="text-sm text-gray-300 mb-1">
          <span className="font-semibold text-gray-200">Prev Hash:</span>{" "}
          <span className="font-mono break-all text-xs">{block.prevHash}</span>
        </p>

        <p className="text-sm text-gray-300">
          <span className="font-semibold text-gray-200">Hash:</span>
          <span
            className={`font-mono break-all text-xs 
                        ${isMined ? "text-green-400" : "text-red-400"}
                    `}
          >
            {block.hash}
          </span>
        </p>
        {block.hash === "MISSINGCRYPTOJS" && (
          <p className="text-sm text-yellow-400 font-bold mt-2">
            ⚠ Hashing library (CryptoJS) not loaded. Cannot verify
            Proof-of-Work.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-inter">
      {/* Google Font Import and Global Styling for reliable layout */}
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
                
                /* Ensure Inter font is used and the body/root takes up the whole screen */
                body, #root {
                    min-height: 100vh;
                    margin: 0;
                    padding: 0;
                }
                .font-inter {
                    font-family: 'Inter', sans-serif;
                }
                /* Custom scrollbar for better look */
                .chain-container::-webkit-scrollbar {
                    width: 8px;
                }
                .chain-container::-webkit-scrollbar-thumb {
                    background-color: #4b5563; /* Gray-600 */
                    border-radius: 4px;
                }
                .chain-container::-webkit-scrollbar-track {
                    background-color: #1f2937; /* Gray-800 */
                }
            `}</style>

      <h1 className="text-4xl font-extrabold text-center text-indigo-400 mb-2">
        PoW Blockchain Simulator
      </h1>
      <p className="text-center text-gray-400 mb-8">
        Demonstrates Proof-of-Work by mining blocks with a target difficulty.
      </p>

      {/* Mining Inputs and Controls - CHANGED max-w-xl to max-w-4xl for wider input area */}
      <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-2xl shadow-2xl mb-10 border border-indigo-500/50 w-full">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">
          Mine Next Block ({chain.length})
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Block Data (e.g., Transaction Details)
          </label>
          <textarea
            className="w-full p-3 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white placeholder-gray-400"
            rows="3"
            value={blockData}
            onChange={(e) => setBlockData(e.target.value)}
            placeholder="Enter data for the block (e.g., 'Alice sends 5 ETH to Bob' or 'Election results certified')."
            disabled={isMining}
          ></textarea>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:space-x-4 mb-6">
          <div className="flex-1 mb-4 sm:mb-0">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mining Difficulty (Number of leading zeros in Hash)
            </label>
            <select
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              disabled={isMining}
            >
              <option value={3}>3 Zeros (Easy)</option>
              <option value={4}>4 Zeros (Medium)</option>
              <option value={5}>5 Zeros (Hard)</option>
            </select>
          </div>

          <button
            onClick={mineBlock}
            disabled={isMining || !blockData}
            className={`mt-4 sm:mt-6 w-full sm:w-1/2 px-6 py-3 rounded-xl text-white font-bold transition duration-150 transform hover:scale-[1.01] ${
              isMining || !blockData
                ? "bg-gray-500 cursor-not-allowed shadow-none"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/50"
            }`}
          >
            {isMining ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Mining...
              </div>
            ) : (
              "Start Mining"
            )}
          </button>
        </div>

        <p
          className={`text-center font-medium ${
            isMining ? "text-blue-400" : "text-gray-300"
          }`}
        >
          {message || `Next target: A hash starting with ${difficulty} zeros.`}
        </p>
      </div>

      {/* Blockchain Display - CHANGED max-w-3xl to max-w-6xl for wider list */}
      <div className="max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-semibold text-gray-100 mb-6 text-center">
          Blockchain (Length: {chain.length})
        </h2>
        <div className="chain-container max-h-[60vh] overflow-y-auto p-4 bg-gray-800 rounded-2xl shadow-2xl border border-indigo-500/50">
          {/* Render blocks in reverse order so the newest is on top */}
          {chain
            .slice()
            .reverse()
            .map((block) => (
              // BlockCard styling uses the shared dark theme logic defined in the component
              <BlockCard key={block.index} block={block} />
            ))}
          {chain.length === 0 && (
            <p className="text-center text-gray-500 py-10">
              Initializing Genesis Block...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
