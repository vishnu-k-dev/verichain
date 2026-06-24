// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TranscriptRegistry
 * @notice A simple on-chain registry of academic transcripts.
 *
 * The institution (the account that deploys the contract = `owner`) issues
 * transcripts. Each transcript is stored on-chain with the student's details and
 * an optional SHA-256 hash of the PDF. Anyone can read/verify a transcript for
 * free — that's the whole point: the blockchain is the tamper-proof source of truth.
 */
contract TranscriptRegistry {
    struct Transcript {
        string id;          // human-friendly certificate id, e.g. "VC-7F3A21"
        string studentName;
        string rollNo;
        string course;
        string grade;       // e.g. "First Class" or a CGPA like "8.7"
        bytes32 fileHash;    // SHA-256 of the PDF (0x0 if no file was attached)
        address issuer;
        uint256 issuedAt;    // block timestamp
        bool revoked;
        bool exists;
    }

    address public owner;

    mapping(string => Transcript) private _byId;   // id => transcript
    mapping(bytes32 => string) private _idByHash;  // fileHash => id
    string[] private _ids;                         // for listing

    event TranscriptIssued(string id, string studentName, bytes32 fileHash, uint256 issuedAt);
    event TranscriptRevoked(string id, uint256 revokedAt);

    error NotOwner();
    error AlreadyExists();
    error DoesNotExist();
    error AlreadyRevoked();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Issue a new transcript. Only the owner (institution) can call this.
    function issue(
        string calldata id,
        string calldata studentName,
        string calldata rollNo,
        string calldata course,
        string calldata grade,
        bytes32 fileHash
    ) external onlyOwner {
        if (_byId[id].exists) revert AlreadyExists();

        _byId[id] = Transcript({
            id: id,
            studentName: studentName,
            rollNo: rollNo,
            course: course,
            grade: grade,
            fileHash: fileHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            exists: true
        });
        _ids.push(id);
        if (fileHash != bytes32(0)) _idByHash[fileHash] = id;

        emit TranscriptIssued(id, studentName, fileHash, block.timestamp);
    }

    /// @notice Revoke a transcript (e.g. issued in error). Owner only.
    function revoke(string calldata id) external onlyOwner {
        Transcript storage t = _byId[id];
        if (!t.exists) revert DoesNotExist();
        if (t.revoked) revert AlreadyRevoked();
        t.revoked = true;
        emit TranscriptRevoked(id, block.timestamp);
    }

    /// @notice Fetch a transcript by id. Reverts if it doesn't exist.
    function get(string calldata id) external view returns (Transcript memory) {
        if (!_byId[id].exists) revert DoesNotExist();
        return _byId[id];
    }

    /// @notice Look up a transcript by the SHA-256 hash of its PDF.
    function verifyByHash(bytes32 fileHash)
        external
        view
        returns (bool found, Transcript memory transcript)
    {
        string memory id = _idByHash[fileHash];
        if (bytes(id).length == 0) return (false, transcript);
        return (true, _byId[id]);
    }

    /// @notice Total number of transcripts ever issued.
    function total() external view returns (uint256) {
        return _ids.length;
    }

    /// @notice Return a page of transcripts (newest-first ordering is done off-chain).
    function list(uint256 start, uint256 count)
        external
        view
        returns (Transcript[] memory page)
    {
        uint256 n = _ids.length;
        if (start >= n) return new Transcript[](0);
        uint256 end = start + count;
        if (end > n) end = n;
        page = new Transcript[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = _byId[_ids[i]];
        }
    }
}
