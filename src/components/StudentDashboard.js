import { useEffect, useState } from "react";
import { BrowserProvider, Contract, isAddress, getAddress } from "ethers";
import toast from "react-hot-toast";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

const DURATION_OPTIONS = [
  { label: "24 Hours",  seconds: 86400 },
  { label: "7 Days",   seconds: 604800 },
  { label: "30 Days",  seconds: 2592000 },
];

const StudentDashboard = ({ account }) => {
  const [certs, setCerts] = useState([]);          // [{ hash, ...certData }]
  const [activeCert, setActiveCert] = useState(null);
  const [grantee, setGrantee] = useState("");
  const [duration, setDuration] = useState(DURATION_OPTIONS[0].seconds);
  const [grants, setGrants] = useState([]);        // access grants for active cert
  const [loading, setLoading] = useState(false);

  /* ── Load student's certificates ───────────────────────────────────── */
  useEffect(() => {
    if (!account || !window.ethereum) return;

    const loadCerts = async () => {
      try {
        setCerts([]);   // clear immediately — never show stale data from prev wallet
        setLoading(true);
        const provider = new BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const signerAddress = (await signer.getAddress()).toLowerCase();

        // Race-condition guard: MetaMask may not have switched yet
        if (signerAddress !== account.toLowerCase()) return;

        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const hashes = await contract.getMyCertificates();

        const list = await Promise.all(
          hashes.map(async (hash) => {
            // Use the PUBLIC mapping getter — no isAuthorised check.
            // verifyCertificate() lets INSTITUTION/GOVT wallets see ANY cert,
            // which caused the "visible in all dashboards" bug.
            const d = await contract.certificates(hash);
            return {
              hash,
              studentName:    d.studentName,
              course:         d.course,
              institution:    d.institution,
              duration:       d.duration,
              grade:          d.grade,
              credentialType: d.credentialType,
              issueDate:      new Date(Number(d.issueDate) * 1000).toLocaleDateString(),
              isValid:        d.isValid,
              studentWallet:  d.studentWallet,
              issuerWallet:   d.issuerWallet,
            };
          })
        );

        // Secondary ownership check — only show certs issued to this exact wallet
        const filtered = list.filter(
          (c) => c.studentWallet.toLowerCase() === signerAddress
        );
        setCerts(filtered);
      } catch (err) {
        console.error("StudentDashboard: failed to load certs", err);
        toast.error("Failed to load your certificates.");
      } finally {
        setLoading(false);
      }
    };

    loadCerts();
  }, [account]);

  /* ── Load access grants for the active cert ─────────────────────────── */
  const loadGrants = async (certHash) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const raw = await contract.getAccessGrants(certHash);
      setGrants(
        raw.map((g) => ({
          grantee: g.grantee,
          expiry:  Number(g.expiry),
          active:  g.active,
        }))
      );
    } catch (err) {
      console.error("loadGrants failed", err);
      setGrants([]);
    }
  };

  const selectCert = (cert) => {
    setActiveCert(cert);
    setGrantee("");
    loadGrants(cert.hash);
  };

  /* ── Grant access ───────────────────────────────────────────────────── */
  const handleGrant = async () => {
    if (!grantee) { toast.error("Enter a grantee wallet address"); return; }

    // Validate address BEFORE touching the contract — prevents ENS lookup on Hardhat
    if (!isAddress(grantee)) {
      toast.error("Invalid wallet address. Enter a full 0x… address.");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Guard: the connected wallet must be the certificate's student
      if (signerAddress.toLowerCase() !== activeCert.studentWallet.toLowerCase()) {
        toast.error(
          `Wrong wallet connected. Switch MetaMask to ${activeCert.studentWallet.slice(0,8)}…${activeCert.studentWallet.slice(-6)} (the student's wallet) and try again.`,
          { duration: 8000 }
        );
        return;
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const expiry = Math.floor(Date.now() / 1000) + Number(duration);
      // Use checksummed address to avoid ethers v6 ENS resolution on local networks
      const tx = await contract.grantAccess(activeCert.hash, getAddress(grantee), expiry);
      await tx.wait();
      toast.success("Access granted!");
      setGrantee("");
      await loadGrants(activeCert.hash);
    } catch (err) {
      toast.error("Failed to grant access");
      console.error(err);
    }
  };

  /* ── Revoke access ──────────────────────────────────────────────────── */
  const handleRevoke = async (granteeAddr) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.revokeAccess(activeCert.hash, granteeAddr);
      await tx.wait();
      toast.success("Access revoked!");
      await loadGrants(activeCert.hash);
    } catch (err) {
      toast.error("Failed to revoke access");
      console.error(err);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="bg-gray-100 pb-12">
      {/* Hero */}
      <div className="w-full bg-indigo-700 text-white py-16 text-center">
        <h1 className="text-4xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-lg text-indigo-200">View your certificates and manage who can access them</p>
      </div>

      <div className="container mx-auto mt-10 px-6 max-w-4xl">
        {loading && <p className="text-center text-gray-500">Loading certificates…</p>}

        {/* Certificate cards */}
        {!loading && certs.length === 0 && (
          <p className="text-center text-gray-500 mt-8">No certificates found for your wallet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {certs.map((cert) => (
            <div
              key={cert.hash}
              onClick={() => selectCert(cert)}
              className={`cursor-pointer p-4 rounded-lg shadow border-2 transition ${
                activeCert?.hash === cert.hash
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-indigo-300"
              }`}
            >
              <p className="font-bold text-gray-800">{cert.course}</p>
              <p className="text-sm text-gray-500">{cert.institution} · {cert.credentialType}</p>
              <p className="text-xs text-gray-400 mt-1">Issued: {cert.issueDate}</p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 inline-block ${
                  cert.isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}
              >
                {cert.isValid ? "Valid" : "Revoked"}
              </span>
            </div>
          ))}
        </div>

        {/* Grant form */}
        {activeCert && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-indigo-700 mb-4">
              Share Access — <span className="font-normal text-gray-600">{activeCert.course}</span>
            </h2>

            <input
              type="text"
              placeholder="Employer / Verifier Wallet Address (0x...)"
              value={grantee}
              onChange={(e) => setGrantee(e.target.value)}
              className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />

            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.seconds} value={opt.seconds}>{opt.label}</option>
              ))}
            </select>

            <button
              onClick={handleGrant}
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
            >
              Grant Access
            </button>

            {/* Active grants list */}
            {grants.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-700 mb-2">Existing Access Grants</h3>
                <ul className="space-y-2">
                  {grants.map((g, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center p-3 bg-gray-50 border rounded text-sm"
                    >
                      <span>
                        <span className="font-mono text-xs text-gray-500">
                          {g.grantee.slice(0, 8)}…{g.grantee.slice(-6)}
                        </span>
                        <span className="ml-3 text-gray-400">
                          Expires: {new Date(g.expiry * 1000).toLocaleString()}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            g.active && g.expiry > Date.now() / 1000
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {g.active && g.expiry > Date.now() / 1000 ? "Active" : "Expired/Revoked"}
                        </span>
                        {g.active && (
                          <button
                            onClick={() => handleRevoke(g.grantee)}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-700"
                          >
                            Revoke
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
