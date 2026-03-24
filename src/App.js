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
import StudentDashboard from "./components/StudentDashboard";
import useRole from "./hooks/useRole";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";
import "./App.css";


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
    credentialType: "",
    studentWallet: ""
  });

  const role = useRole(account);

  useEffect(() => {
    const loadBlockchainData = async () => {
      if (!window.ethereum) {
        toast.error("Please install MetaMask!");
        return;
      }
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setAccount(accounts[0]);
      setContract(contractInstance);
    };

    loadBlockchainData();

    // Re-sync whenever the user switches accounts in MetaMask
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setContract(null);
      } else {
        loadBlockchainData();
      }
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
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
                    role={role}
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
            <Route path="/student" element={<StudentDashboard account={account} />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;
