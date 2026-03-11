// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {

    address public admin;

    // ── NEW: authorized issuers (INSTITUTION wallets) ──────────────────────
    mapping(address => bool) public authorizedIssuers;

    struct Certificate {
        string  studentName;
        string  course;
        string  institution;
        string  duration;
        string  grade;
        string  credentialType;
        uint256 issueDate;
        bool    isValid;
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[])   public userCertificates;

    // ── Events ─────────────────────────────────────────────────────────────
    event CertificateIssued(bytes32 indexed certHash, string studentName);
    event CertificateRevoked(bytes32 indexed certHash);

    // ── Modifiers ──────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // NEW: admin OR any authorized issuer can call this
    modifier onlyIssuer() {
        require(
            msg.sender == admin || authorizedIssuers[msg.sender],
            "Not authorized to issue certificates"
        );
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ── NEW: manage authorized issuers (admin only) ────────────────────────
    function addIssuer(address issuer) public onlyAdmin {
        authorizedIssuers[issuer] = true;
    }

    function removeIssuer(address issuer) public onlyAdmin {
        authorizedIssuers[issuer] = false;
    }

    // ── Issue certificate (admin OR authorized issuer) ─────────────────────
    function issueCertificate(
        string memory studentName,
        string memory course,
        string memory institution,
        string memory duration,
        string memory grade,
        string memory credentialType
    ) public onlyIssuer returns (bytes32) {

        bytes32 certHash = keccak256(
            abi.encodePacked(
                studentName,
                course,
                institution,
                duration,
                grade,
                credentialType,
                block.timestamp,
                msg.sender
            )
        );

        certificates[certHash] = Certificate({
            studentName:    studentName,
            course:         course,
            institution:    institution,
            duration:       duration,
            grade:          grade,
            credentialType: credentialType,
            issueDate:      block.timestamp,
            isValid:        true
        });

        userCertificates[msg.sender].push(certHash);

        emit CertificateIssued(certHash, studentName);
        return certHash;
    }

    // ── Revoke certificate (admin only) ───────────────────────────────────
    function revokeCertificate(bytes32 certHash) public onlyAdmin {
        require(certificates[certHash].isValid, "Certificate already invalid");
        certificates[certHash].isValid = false;
        emit CertificateRevoked(certHash);
    }

    // ── Verify certificate (public) ───────────────────────────────────────
    function verifyCertificate(bytes32 certHash)
        public
        view
        returns (
            string memory studentName,
            string memory course,
            string memory institution,
            string memory duration,
            string memory grade,
            string memory credentialType,
            uint256 issueDate,
            bool isValid
        )
    {
        Certificate memory cert = certificates[certHash];
        return (
            cert.studentName,
            cert.course,
            cert.institution,
            cert.duration,
            cert.grade,
            cert.credentialType,
            cert.issueDate,
            cert.isValid
        );
    }

    // ── Get all cert hashes issued by a wallet ────────────────────────────
    function getMyCertificates() public view returns (bytes32[] memory) {
        return userCertificates[msg.sender];
    }
}
