// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {

    address public admin;
    address public institutionWallet = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

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

    event CertificateIssued(bytes32 certHash, string studentName, string course, string institution, string duration, string grade, string credentialType, uint256 issueDate);
    event CertificateRevoked(bytes32 certHash);

    modifier onlyAdmin() {
        require(
            msg.sender == admin || msg.sender == institutionWallet,
            "Only admin can perform this action"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function issueCertificate(
        string memory _studentName,
        string memory _course,
        string memory _institution,
        string memory _duration,
        string memory _grade,
        string memory _credentialType
    ) public onlyAdmin returns (bytes32) {

        bytes32 certHash = keccak256(
            abi.encodePacked(
                _studentName,
                _course,
                _institution,
                _duration,
                _grade,
                _credentialType,
                block.timestamp,
                msg.sender
            )
        );

        certificates[certHash] = Certificate({
            studentName:    _studentName,
            course:         _course,
            institution:    _institution,
            duration:       _duration,
            grade:          _grade,
            credentialType: _credentialType,
            issueDate:      block.timestamp,
            isValid:        true
        });

        userCertificates[msg.sender].push(certHash);

        emit CertificateIssued(certHash, _studentName, _course, _institution, _duration, _grade, _credentialType, block.timestamp);
        return certHash;
    }

    function revokeCertificate(bytes32 certHash) public onlyAdmin {
        require(certificates[certHash].isValid, "Certificate already invalid");
        certificates[certHash].isValid = false;
        emit CertificateRevoked(certHash);
    }

    function verifyCertificate(bytes32 certHash)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            uint256,
            bool
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

    function getMyCertificates() public view returns (bytes32[] memory) {
        return userCertificates[msg.sender];
    }
}
