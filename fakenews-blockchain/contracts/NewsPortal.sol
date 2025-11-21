// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NewsVerification {

    address private owner;

    struct NewsItem {
        address reporter;
        string content;
        bool isReal;
        uint256 timestamp;
    }

    NewsItem[] public newsChain;

    event NewsAdded(
        uint256 indexed newsId,
        address indexed reporter,
        bool isReal,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action.");
        _;
    }

    function addNews(string memory _content, bool _isReal) public onlyOwner {
        NewsItem memory newNews = NewsItem({
            reporter: msg.sender,
            content: _content,
            isReal: _isReal,
            timestamp: block.timestamp
        });

        newsChain.push(newNews);

        emit NewsAdded(newsChain.length - 1, msg.sender, _isReal, block.timestamp);
    }

    function getNewsChain() public view returns (NewsItem[] memory) {
        return newsChain;
    }

    function getTotalNewsCount() public view returns (uint256) {
        return newsChain.length;
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}