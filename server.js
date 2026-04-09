const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { ethers } = require('ethers');
const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Helpers
const readJson = (filename) => {
  const filePath = path.join(__dirname, 'src', 'data', filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJson = (filename, data) => {
  const filePath = path.join(__dirname, 'src', 'data', filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ---------------------------
// BLOCKCHAIN CONFIG
// ---------------------------
const RPC_URL = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const CONTRACT_ABI = [
  "event CertificateIssued(bytes32 indexed certHash, string studentName, string course, string institution, string duration, string grade, string credentialType, uint256 issueDate)",
  "function certificates(bytes32) view returns (string studentName, string course, string institution, string duration, string grade, string credentialType, address studentWallet, address issuerWallet, uint256 issueDate, bool isValid)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// ---------------------------
// INSTITUTIONS ROUTES
// ---------------------------
app.get('/institutions', (req, res) => {
  const data = readJson('institutions.json');
  res.json(data);
});

app.post('/institutions', (req, res) => {
  writeJson('institutions.json', req.body);
  res.status(200).json({ message: 'Updated' });
});

// ---------------------------
// CERTIFICATES ROUTES
// ---------------------------

// Get all certificates from chain
app.get('/certificates', async (req, res) => {
  try {
    // 1. Fetch all CertificateIssued events
    const filter = contract.filters.CertificateIssued();
    const events = await contract.queryFilter(filter, 0, 'latest');

    // 2. Map events to certificate data and check current status
    const certificates = await Promise.all(events.map(async (event) => {
      const { certHash, studentName, course, institution, issueDate } = event.args;

      // Fetch latest status from the certificates mapping
      const certData = await contract.certificates(certHash);
      const isValid = certData[9]; // isValid is the 10th item

      return {
        hash: certHash,
        studentName,
        course,
        institution,
        issuedAt: Number(issueDate) * 1000, // Convert to ms for Date constructor
        status: isValid ? "valid" : "revoked"
      };
    }));

    res.json(certificates);
  } catch (error) {
    console.error("Error fetching certificates from chain:", error);
    res.status(500).json({ error: "Failed to fetch certificates from blockchain" });
  }
});

// POST /certificates — store issued certificate
app.post('/certificates', (req, res) => {
  const filePath = path.join(__dirname, 'src', 'data', 'certificates.json'); // Do NOT name it `path`
  let certificates = [];

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    certificates = JSON.parse(raw);
  }

  certificates.push(req.body);

  fs.writeFileSync(filePath, JSON.stringify(certificates, null, 2));
  res.status(201).json({ message: 'Certificate saved' });
});


// PUT /certificates/revoke — update status to 'revoked' by hash
app.put('/certificates/revoke', (req, res) => {
  const { hash } = req.body;
  const filePath = path.join(__dirname, 'src', 'data', 'certificates.json');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Certificates file not found' });
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const certificates = JSON.parse(raw);

  const index = certificates.findIndex(cert => cert.hash === hash);
  if (index === -1) {
    return res.status(404).json({ message: 'Certificate not found' });
  }

  certificates[index].status = "revoked";

  fs.writeFileSync(filePath, JSON.stringify(certificates, null, 2));
  res.status(200).json({ message: 'Certificate marked as revoked' });
});





// ---------------------------
// START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
