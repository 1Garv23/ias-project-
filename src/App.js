import { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeatureCards from "./components/FeatureCards";
import VerifyForm from "./components/VerifyForm";
import CertificateDetails from "./components/CertificateDetails";
import AdminPanel from "./components/AdminPanel";
import RegulatorPanel from "./components/RegulatorPanel";
import Report from "./components/Report";
import useRole from "./hooks/useRole";
import "./App.css";

// PUT THE FOLLOWING INFO AFTER DEPLOYING THE CONTRACT IN REMIX
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"certHash","type":"bytes32"},{"indexed":false,"internalType":"string","name":"studentName","type":"string"},{"indexed":false,"internalType":"string","name":"course","type":"string"},{"indexed":false,"internalType":"string","name":"institution","type":"string"},{"indexed":false,"internalType":"string","name":"duration","type":"string"},{"indexed":false,"internalType":"string","name":"grade","type":"string"},{"indexed":false,"internalType":"string","name":"credentialType","type":"string"},{"indexed":false,"internalType":"uint256","name":"issueDate","type":"uint256"}],"name":"CertificateIssued","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"certHash","type":"bytes32"}],"name":"CertificateRevoked","type":"event"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"certificates","outputs":[{"internalType":"string","name":"studentName","type":"string"},{"internalType":"string","name":"course","type":"string"},{"internalType":"string","name":"institution","type":"string"},{"internalType":"string","name":"duration","type":"string"},{"internalType":"string","name":"grade","type":"string"},{"internalType":"string","name":"credentialType","type":"string"},{"internalType":"uint256","name":"issueDate","type":"uint256"},{"internalType":"bool","name":"isValid","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMyCertificates","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_studentName","type":"string"},{"internalType":"string","name":"_course","type":"string"},{"internalType":"string","name":"_institution","type":"string"},{"internalType":"string","name":"_duration","type":"string"},{"internalType":"string","name":"_grade","type":"string"},{"internalType":"string","name":"_credentialType","type":"string"}],"name":"issueCertificate","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"certHash","type":"bytes32"}],"name":"revokeCertificate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userCertificates","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"certHash","type":"bytes32"}],"name":"verifyCertificate","outputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [certificateHash, setCertificateHash] = useState("");
  const [certificateData, setCertificateData] = useState(null);
  const [revokeCertHash, setRevokeCertHash] = useState("");

  const [formInputs, setFormInputs] = useState({
    studentName: "",
    course: "",
    institution: "",
    duration: "",
    grade: "",
    credentialType: ""
  });

  const role = useRole(account);

  useEffect(() => {
    const loadBlockchainData = async () => {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(contractInstance);

        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } else {
        toast.error("Please install MetaMask!");
      }
    };
    loadBlockchainData();
  }, []);

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-100">
        <Toaster position="top-right" />
        <Navbar account={account} />

        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <div>
                  <HeroSection />
                  <FeatureCards />
                  <VerifyForm
                    certificateHash={certificateHash}
                    setCertificateHash={setCertificateHash}
                    contract={contract}
                    setCertificateData={setCertificateData}
                  />
                  {certificateData && (
                    <CertificateDetails
                      certificateData={certificateData}
                      certificateHash={certificateHash}
                    />
                  )}
                </div>
              }
            />

            <Route
              path="/admin"
              element={
                role === "GOVT" || role === "INSTITUTION" ? (
                  <AdminPanel
                    formInputs={formInputs}
                    setFormInputs={setFormInputs}
                    issueCertificateContract={contract}
                    revokeCertHash={revokeCertHash}
                    setRevokeCertHash={setRevokeCertHash}
                  />
                ) : (
                  <div className="text-center mt-20 px-6">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">🚫 Access Denied</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                      You do not have permission to access the <strong>Admin Panel</strong>. Only authorized roles such as <code>GOVT</code> or <code>INSTITUTION</code> can issue or revoke certificates.
                    </p>
                  </div>
                )
              }
            />

            <Route
              path="/regulator"
              element={
                role === "GOVT" || role === "REGULATOR" ? (
                  <RegulatorPanel />
                ) : (
                  <div className="text-center mt-20 px-6">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">🚫 Access Denied</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                      You do not have permission to access the <strong>Regulator Panel</strong>. Only <code>GOVT</code> or <code>REGULATOR</code> roles can manage institutions.
                    </p>
                  </div>
                )
              }
            />

            <Route path="/report" element={<Report />} />
          </Routes>
        </main>

        
      </div>
    </Router>
  );
}

export default App;
