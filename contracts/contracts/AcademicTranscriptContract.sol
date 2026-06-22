// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AcademicTranscriptContract
 * @notice On-chain registry for academic transcript integrity. Institutions are
 *         whitelisted by the contract owner, register their students, and anchor
 *         transcripts as (ipfsHash, sha256Hash) tuples. Verifiers can later prove
 *         a document is authentic and unmodified by re-hashing it and comparing.
 * @dev    Uses custom errors instead of require strings for gas efficiency.
 *         The contract stores only hashes and identifiers — never PII payloads.
 */
contract AcademicTranscriptContract {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    struct Institution {
        string institutionId;
        string name;
        address walletAddress;
        bool isActive;
        uint256 registeredAt;
    }

    struct Student {
        string studentId;
        string name;
        string email;
        string institutionId;
        bool isActive;
        uint256 registeredAt;
    }

    struct Transcript {
        string transcriptId;
        string studentId;
        string institutionId;
        string ipfsHash;
        string sha256Hash;
        uint256 issuedAt;
        bool isRevoked;
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    address public owner;

    /// @notice Quick lookup: wallet => is a registered institution wallet.
    mapping(address => bool) public registeredInstitutions;

    /// @notice institutionId => Institution record.
    mapping(string => Institution) public institutions;

    /// @notice studentId => Student record.
    mapping(string => Student) public students;

    /// @notice transcriptId => Transcript record.
    mapping(string => Transcript) public transcripts;

    /// @notice studentId => list of transcriptIds.
    mapping(string => string[]) public studentTranscripts;

    /// @dev Reverse lookup so a wallet can be resolved back to its institutionId.
    mapping(address => string) private institutionIdByWallet;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event InstitutionRegistered(string institutionId, address wallet, uint256 timestamp);
    event StudentRegistered(string studentId, string institutionId, uint256 timestamp);
    event TranscriptIssued(string transcriptId, string studentId, string sha256Hash, uint256 timestamp);
    event TranscriptRevoked(string transcriptId, uint256 timestamp);

    // ---------------------------------------------------------------------
    // Custom errors
    // ---------------------------------------------------------------------

    error Unauthorized();
    error AlreadyExists();
    error NotFound();
    error Revoked();
    error InvalidInput();

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRegisteredInstitution() {
        if (!registeredInstitutions[msg.sender]) revert Unauthorized();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Institution management
    // ---------------------------------------------------------------------

    /**
     * @notice Whitelist an institution and bind it to a wallet. Owner-only.
     * @param institutionId   Off-chain stable identifier (UUID).
     * @param name            Human-readable institution name.
     * @param walletAddress   Wallet authorised to act for this institution.
     */
    function registerInstitution(
        string memory institutionId,
        string memory name,
        address walletAddress
    ) external onlyOwner {
        if (bytes(institutionId).length == 0 || walletAddress == address(0)) {
            revert InvalidInput();
        }
        if (institutions[institutionId].registeredAt != 0) revert AlreadyExists();
        if (registeredInstitutions[walletAddress]) revert AlreadyExists();

        institutions[institutionId] = Institution({
            institutionId: institutionId,
            name: name,
            walletAddress: walletAddress,
            isActive: true,
            registeredAt: block.timestamp
        });

        registeredInstitutions[walletAddress] = true;
        institutionIdByWallet[walletAddress] = institutionId;

        emit InstitutionRegistered(institutionId, walletAddress, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Student management
    // ---------------------------------------------------------------------

    /**
     * @notice Register a student under the caller's institution.
     * @dev    Only callable by a whitelisted institution wallet.
     */
    function registerStudent(
        string memory studentId,
        string memory name,
        string memory email,
        string memory institutionId
    ) external onlyRegisteredInstitution {
        if (bytes(studentId).length == 0) revert InvalidInput();
        if (students[studentId].registeredAt != 0) revert AlreadyExists();
        // The caller must own the institutionId they are registering under.
        if (
            keccak256(bytes(institutionIdByWallet[msg.sender])) !=
            keccak256(bytes(institutionId))
        ) revert Unauthorized();
        if (institutions[institutionId].registeredAt == 0) revert NotFound();

        students[studentId] = Student({
            studentId: studentId,
            name: name,
            email: email,
            institutionId: institutionId,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit StudentRegistered(studentId, institutionId, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Transcript lifecycle
    // ---------------------------------------------------------------------

    /**
     * @notice Anchor a transcript on-chain. Only the institution that owns the
     *         student may issue. The (ipfsHash, sha256Hash) pair is immutable.
     * @return success True on success (reverts otherwise).
     */
    function addTranscript(
        string memory transcriptId,
        string memory studentId,
        string memory ipfsHash,
        string memory sha256Hash
    ) external onlyRegisteredInstitution returns (bool success) {
        if (
            bytes(transcriptId).length == 0 ||
            bytes(sha256Hash).length == 0 ||
            bytes(ipfsHash).length == 0
        ) revert InvalidInput();
        if (transcripts[transcriptId].issuedAt != 0) revert AlreadyExists();

        Student memory student = students[studentId];
        if (student.registeredAt == 0) revert NotFound();

        // Caller must own the student's institution.
        if (
            keccak256(bytes(institutionIdByWallet[msg.sender])) !=
            keccak256(bytes(student.institutionId))
        ) revert Unauthorized();

        transcripts[transcriptId] = Transcript({
            transcriptId: transcriptId,
            studentId: studentId,
            institutionId: student.institutionId,
            ipfsHash: ipfsHash,
            sha256Hash: sha256Hash,
            issuedAt: block.timestamp,
            isRevoked: false
        });

        studentTranscripts[studentId].push(transcriptId);

        emit TranscriptIssued(transcriptId, studentId, sha256Hash, block.timestamp);
        return true;
    }

    /**
     * @notice Verify a document hash against the anchored transcript.
     * @param transcriptId The transcript identifier embedded in the QR.
     * @param sha256Hash   The SHA-256 of the document being checked.
     * @return isValid        True if the transcript exists and the hash matches.
     * @return isRevoked      True if the institution has revoked it.
     * @return issuedAt       Unix timestamp of issuance (0 if not found).
     * @return institutionId  Issuing institution's id ("" if not found).
     */
    function verifyTranscript(string memory transcriptId, string memory sha256Hash)
        external
        view
        returns (bool isValid, bool isRevoked, uint256 issuedAt, string memory institutionId)
    {
        Transcript memory t = transcripts[transcriptId];
        if (t.issuedAt == 0) {
            return (false, false, 0, "");
        }

        bool hashMatches = keccak256(bytes(t.sha256Hash)) == keccak256(bytes(sha256Hash));
        // A transcript is only "valid" when the hash matches AND it is not revoked.
        isValid = hashMatches && !t.isRevoked;
        return (isValid, t.isRevoked, t.issuedAt, t.institutionId);
    }

    /**
     * @notice Revoke a transcript. Only the issuing institution may revoke.
     * @dev    Idempotency is rejected — revoking twice reverts with Revoked().
     */
    function revokeTranscript(string memory transcriptId) external onlyRegisteredInstitution {
        Transcript storage t = transcripts[transcriptId];
        if (t.issuedAt == 0) revert NotFound();
        if (t.isRevoked) revert Revoked();
        if (
            keccak256(bytes(institutionIdByWallet[msg.sender])) !=
            keccak256(bytes(t.institutionId))
        ) revert Unauthorized();

        t.isRevoked = true;
        emit TranscriptRevoked(transcriptId, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Fetch a full transcript record. Reverts if not found.
    function getTranscriptById(string memory transcriptId)
        external
        view
        returns (Transcript memory)
    {
        Transcript memory t = transcripts[transcriptId];
        if (t.issuedAt == 0) revert NotFound();
        return t;
    }

    /// @notice List all transcriptIds anchored for a student.
    function getStudentTranscripts(string memory studentId)
        external
        view
        returns (string[] memory)
    {
        return studentTranscripts[studentId];
    }

    /// @notice Whether a wallet is a whitelisted institution.
    function isInstitutionRegistered(address wallet) external view returns (bool) {
        return registeredInstitutions[wallet];
    }
}
