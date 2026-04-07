import toast from "react-hot-toast";

const VerifyForm = ({ certificateHash, setCertificateHash, contract, setCertificateData }) => {
  const verifyCertificate = async () => {
    if (!certificateHash || !contract) return;

    try {
      const signerAddress = await contract.runner.getAddress();

      // ── Fetch cert metadata (public mapping — always readable) ──────────
      const raw = await contract.certificates(certificateHash);
      const studentWallet = (raw.studentWallet ?? "").toLowerCase();
      const issuerWallet = (raw.issuerWallet ?? "").toLowerCase();
      const callerLower = signerAddress.toLowerCase();

      const isStudentOrIssuer = callerLower === studentWallet || callerLower === issuerWallet;

      // ── For non-privileged wallets check grant expiry using REAL time ────
      // We intentionally use Date.now() here, NOT block.timestamp.
      // On Remix / Hardhat the EVM clock only advances when a new transaction
      // is mined, so block.timestamp stays frozen for view calls. Since the
      // grant's expiry was calculated with Date.now()/1000 on the frontend,
      // we compare back against Date.now()/1000 for a consistent result.
      if (!isStudentOrIssuer) {
        const [expiry, active] = await contract.getGrantExpiry(certificateHash, signerAddress);
        const expiryMs = Number(expiry) * 1000;  // convert to milliseconds
        const nowMs = Date.now();

        if (!active) {
          toast.error("Access Denied — no active grant found for your wallet.", { duration: 6000 });
          return;
        }
        if (expiryMs <= nowMs) {
          const expired = new Date(expiryMs).toLocaleString();
          toast.error(
            `Access Denied — your grant expired at ${expired}.`,
            { duration: 8000 }
          );
          return;
        }
      }

      // ── Call the contract (contract also enforces via block.timestamp) ──
      const certDetails = await contract.verifyCertificate(certificateHash);

      if (!certDetails || certDetails[0] === "") {
        throw new Error("Certificate not found.");
      }

      const certificateData = {
        studentName: certDetails[0],
        course: certDetails[1],
        institution: certDetails[2],
        duration: certDetails[3],
        grade: certDetails[4],
        credentialType: certDetails[5],
        issueDate: new Date(Number(certDetails[6]) * 1000).toLocaleDateString(),
        isValid: certDetails[7],
        studentWallet: certDetails[8],
        issuerWallet: certDetails[9],
      };

      setCertificateData(certificateData);
      toast.success("Certificate Verified Successfully!");
    } catch (error) {
      console.error("Verification failed:", error);
      if (error?.reason?.includes("Access") || error?.message?.includes("Access denied")) {
        toast.error("Access Denied — grant expired or not authorised.");
      } else {
        toast.error("Verification failed or certificate not found.");
      }
    }
  };

  return (
    <div className="container mx-auto my-8 px-6">
      <div className="bg-white p-6 shadow-lg rounded-lg text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold">Verify Certificate</h2>
        <div className="flex items-center gap-2 mt-4">
          <input
            type="text"
            className="p-2 border rounded-lg w-full"
            placeholder="Enter Certificate Hash"
            value={certificateHash}
            onChange={(e) => setCertificateHash(e.target.value)}
          />
          <button
            onClick={verifyCertificate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyForm;
