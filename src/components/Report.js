import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import toast from "react-hot-toast";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const Report = () => {
  console.log("Report component is rendering");
  const [certificates, setCertificates] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState("All");
  const [searchName, setSearchName] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Report useEffect running");
    if (!window.ethereum) {
      toast.error("MetaMask not detected — connect your wallet to view the report.");
      return;
    }

    const loadCerts = async () => {
      try {
        setLoading(true);

        // Use MetaMask provider directly — no server needed
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        // Fetch all CertificateIssued events from block 0 to latest
        const filter = contract.filters.CertificateIssued();
        const events = await contract.queryFilter(filter, 0, "latest");

        if (events.length === 0) {
          setCertificates([]);
          setInstitutions([]);
          return;
        }

        // For each event, fetch the current on-chain status
        const certs = await Promise.all(
          events.map(async (event) => {
            const { certHash, studentName, course, institution, issueDate } = event.args;
            const certData = await contract.certificates(certHash);
            return {
              hash: certHash,
              studentName,
              course,
              institution,
              issuedAt: Number(issueDate) * 1000, // convert to ms
              status: certData.isValid ? "valid" : "revoked",
            };
          })
        );

        setCertificates(certs);
        const unique = [...new Set(certs.map((c) => c.institution))];
        setInstitutions(unique);
      } catch (err) {
        console.error("Report: failed to load certificates", err);
        toast.error("Failed to fetch certificate data from blockchain.");
      } finally {
        setLoading(false);
      }
    };

    loadCerts();
  }, []);

  const filtered = certificates.filter(
    (cert) =>
      (selectedInstitution === "All" || cert.institution === selectedInstitution) &&
      cert.studentName.toLowerCase().includes(searchName.toLowerCase())
  );

  const chartData = institutions.map((inst) => {
    const valid = certificates.filter(
      (c) => c.institution === inst && c.status === "valid"
    ).length;
    const revoked = certificates.filter(
      (c) => c.institution === inst && c.status === "revoked"
    ).length;
    return { institution: inst, valid, revoked };
  });

  return (
    <div className="container mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-700">Certificate Report</h1>
        <p className="text-gray-600">Search and filter certificate records</p>
      </div>

      {/* Loading state */}
      {loading && (
        <p className="text-center text-gray-500 mb-6">⏳ Loading certificates from blockchain…</p>
      )}

      {/* Filters */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <select
            className="p-2 border rounded-lg shadow w-full"
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
          >
            <option value="All">All Institutions</option>
            {institutions.map((inst, i) => (
              <option key={i} value={inst}>{inst}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="p-2 border rounded-lg shadow w-full"
          />
        </div>
      )}

      {/* Valid vs Revoked Chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-gray-50 p-4 rounded shadow mb-8">
          <h3 className="text-lg font-semibold mb-2 text-center">Valid vs Revoked by Institution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="institution" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="valid" stackId="a" fill="#22c55e" />
              <Bar dataKey="revoked" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length === 0 ? (
        <p className="text-center text-gray-500">
          {certificates.length === 0
            ? "No certificates found on the blockchain."
            : "No certificates match your filters."}
        </p>
      ) : (
        !loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Hash</th>
                  <th className="px-4 py-2 border">Student</th>
                  <th className="px-4 py-2 border">Course</th>
                  <th className="px-4 py-2 border">Institution</th>
                  <th className="px-4 py-2 border">Issued</th>
                  <th className="px-4 py-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert, index) => (
                  <tr key={index} className="text-center hover:bg-gray-50">
                    <td className="px-4 py-2 border break-all font-mono text-xs">
                      {cert.hash.slice(0, 10)}…{cert.hash.slice(-8)}
                    </td>
                    <td className="px-4 py-2 border">{cert.studentName}</td>
                    <td className="px-4 py-2 border">{cert.course}</td>
                    <td className="px-4 py-2 border">{cert.institution}</td>
                    <td className="px-4 py-2 border">
                      {new Date(cert.issuedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          cert.status === "valid"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cert.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default Report;
