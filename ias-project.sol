// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {

    address public admin;
    address public institutionWallet = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    enum Role { PUBLIC, INSTITUTION, REGULATOR, GOVT }

    mapping(address => Role) public roles;

    struct Institution {
        string  name;
        string  code;
        bool    active;
    }

    mapping(address => Institution) public institutions;
    address[] public institutionList;

    struct Certificate {
        string  studentName;
        string  course;
        string  institution;
        string  duration;
        string  grade;
        string  credentialType;
        address studentWallet;
        address issuerWallet;
        uint256 issueDate;
        bool    isValid;
    }

    mapping(bytes32 => Certificate) public certificates;
    mapping(address => bytes32[])   public userCertificates;

    struct AccessGrant {
        address grantee;
        uint256 expiry;
        bool    active;
    }

    mapping(bytes32 => AccessGrant[]) private accessGrants;

    event CertificateIssued(bytes32 certHash, string studentName, string course, string institution, string duration, string grade, string credentialType, uint256 issueDate);
    event CertificateRevoked(bytes32 certHash);
    event RoleAssigned(address indexed wallet, Role role);
    event InstitutionAdded(address indexed wallet, string name, string code);
    event AccessGranted(bytes32 indexed certHash, address grantee, uint256 expiry);
    event AccessRevoked(bytes32 indexed certHash, address grantee);

    modifier onlyAdmin() {
        require(
            roles[msg.sender] == Role.GOVT || roles[msg.sender] == Role.INSTITUTION,
            "Only admin can perform this action"
        );
        _;
    }

    modifier onlyGovt() {
        require(roles[msg.sender] == Role.GOVT, "Only GOVT can perform this action");
        _;
    }

    modifier onlyGovtOrRegulator() {
        require(
            roles[msg.sender] == Role.GOVT || roles[msg.sender] == Role.REGULATOR,
            "Only GOVT or REGULATOR can perform this action"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.GOVT;
        roles[institutionWallet] = Role.INSTITUTION;
    }

    function assignRole(address wallet, uint8 role) public onlyGovt {
        require(role <= uint8(Role.GOVT), "Invalid role");
        roles[wallet] = Role(role);
        emit RoleAssigned(wallet, Role(role));
    }

    function addInstitution(
        address wallet,
        string memory name,
        string memory code
    ) public onlyGovtOrRegulator {
        require(!institutions[wallet].active, "Institution already registered");
        institutions[wallet] = Institution(name, code, true);
        institutionList.push(wallet);
        roles[wallet] = Role.INSTITUTION;
        emit InstitutionAdded(wallet, name, code);
    }

    function getInstitutions() public view returns (address[] memory) {
        return institutionList;
    }

    function issueCertificate(
        string memory _studentName,
        string memory _course,
        string memory _institution,
        string memory _duration,
        string memory _grade,
        string memory _credentialType,
        address _studentWallet
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
            studentWallet:  _studentWallet,
            issuerWallet:   msg.sender,
            issueDate:      block.timestamp,
            isValid:        true
        });

        userCertificates[_studentWallet].push(certHash);

        emit CertificateIssued(certHash, _studentName, _course, _institution, _duration, _grade, _credentialType, block.timestamp);
        return certHash;
    }

    function revokeCertificate(bytes32 certHash) public {
        require(
            roles[msg.sender] == Role.GOVT || msg.sender == certificates[certHash].issuerWallet,
            "Only GOVT or the original issuer can revoke"
        );
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
            bool,
            address,
            address
        )
    {
        require(isAuthorised(msg.sender, certHash), "Access denied");
        Certificate memory cert = certificates[certHash];
        return (
            cert.studentName,
            cert.course,
            cert.institution,
            cert.duration,
            cert.grade,
            cert.credentialType,
            cert.issueDate,
            cert.isValid,
            cert.studentWallet,
            cert.issuerWallet
        );
    }

    function getMyCertificates() public view returns (bytes32[] memory) {
        return userCertificates[msg.sender];
    }

    function grantAccess(bytes32 certHash, address grantee, uint256 expiry) public {
        require(msg.sender == certificates[certHash].studentWallet, "Only the student can grant access");
        require(expiry > block.timestamp, "Expiry must be in the future");
        accessGrants[certHash].push(AccessGrant(grantee, expiry, true));
        emit AccessGranted(certHash, grantee, expiry);
    }

    function revokeAccess(bytes32 certHash, address grantee) public {
        require(msg.sender == certificates[certHash].studentWallet, "Only the student can revoke access");
        AccessGrant[] storage grants = accessGrants[certHash];
        for (uint256 i = 0; i < grants.length; i++) {
            if (grants[i].grantee == grantee && grants[i].active) {
                grants[i].active = false;
                emit AccessRevoked(certHash, grantee);
                return;
            }
        }
        revert("No active grant found for this grantee");
    }

    function isAuthorised(address caller, bytes32 certHash) internal view returns (bool) {
        if (roles[caller] == Role.GOVT) return true;
        if (roles[caller] == Role.INSTITUTION) return true;
        if (caller == certificates[certHash].studentWallet) return true;
        AccessGrant[] storage grants = accessGrants[certHash];
        for (uint256 i = 0; i < grants.length; i++) {
            if (grants[i].grantee == caller && grants[i].active && grants[i].expiry > block.timestamp) {
                return true;
            }
        }
        return false;
    }

    function getAccessGrants(bytes32 certHash) public view returns (AccessGrant[] memory) {
        require(msg.sender == certificates[certHash].studentWallet, "Only the student can view grants");
        return accessGrants[certHash];
    }
}
