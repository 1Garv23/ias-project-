import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import toast from "react-hot-toast";
import useInstitutions from "../hooks/useInstitutions";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

const RegulatorPanel = () => {
  const { institutions, loadInstitutions } = useInstitutions();
  const [newInstitution, setNewInstitution] = useState({ wallet: "", name: "", code: "" });
  const [agreed, setAgreed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (window.ethereum) loadInstitutions();
  }, [loadInstitutions]);

  const addInstitution = async () => {
    const { wallet, name, code } = newInstitution;

    if (!wallet || !name || !code) {
      toast.error("Wallet address, name, and code are all required");
      return;
    }

    if (!agreed) {
      toast.error("You must confirm regulatory agreement");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.addInstitution(wallet, name.trim(), code.trim().toUpperCase());
      await tx.wait();
      toast.success("Institution registered on-chain!");
      setNewInstitution({ wallet: "", name: "", code: "" });
      setAgreed(false);
      await loadInstitutions();
    } catch (error) {
      toast.error("Failed to register institution");
      console.error(error);
    }
  };

  return (
    <div className="bg-gray-100 pb-12">
      {/* Hero */}
      <div className="w-full bg-blue-700 text-white py-16 text-center">
        <h1 className="text-4xl font-bold mb-2">Regulator Panel</h1>
        <p className="text-lg text-blue-100">Manage and register institutions under verified guidelines</p>
      </div>

      <div className="container mx-auto mt-10 p-6 bg-white rounded-lg shadow max-w-xl">
        <h2 className="text-2xl font-bold mb-4 text-center text-green-700">Register New Institution</h2>

        <input
          type="text"
          placeholder="Institution Wallet Address (0x...)"
          value={newInstitution.wallet}
          onChange={(e) => setNewInstitution({ ...newInstitution, wallet: e.target.value })}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="text"
          placeholder="Institution Name"
          value={newInstitution.name}
          onChange={(e) => setNewInstitution({ ...newInstitution, name: e.target.value })}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="text"
          placeholder="Institution Code (e.g., UIU)"
          value={newInstitution.code}
          onChange={(e) => setNewInstitution({ ...newInstitution, code: e.target.value })}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {/* Confirmation + Modal trigger */}
        <div className="flex items-start mb-4 text-sm text-gray-600">
          <input
            id="confirm"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 mr-2"
          />
          <label htmlFor="confirm">
            I confirm that this institution registration complies with the official{" "}
            <button
              onClick={() => setShowModal(true)}
              className="ml-1 text-blue-600 underline hover:text-blue-800"
              type="button"
            >
              regulatory guidelines
            </button>.
          </label>
        </div>

        <button
          onClick={addInstitution}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Institution
        </button>

        {/* List */}
        <h3 className="text-xl font-semibold mt-8 mb-2">Institution List</h3>
        <ul className="space-y-2">
          {institutions.map((inst) => (
            <li key={inst.wallet} className="flex justify-between items-center p-3 bg-gray-50 border rounded">
              <span className="font-medium">{inst.name}</span>
              <span className="text-sm text-gray-500">{inst.code}</span>
              <span className="text-xs text-gray-400 font-mono truncate max-w-[120px]" title={inst.wallet}>{inst.wallet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white max-w-lg w-full p-6 rounded-lg shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">Regulatory Guidelines</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
              <li>Must be a UGC-recognized university or educational board.</li>
              <li>Institution code must be unique and 3-10 uppercase characters (e.g., UIU, DU).</li>
              <li>Proper documentation must be submitted via official channels.</li>
              <li>Institutions are subject to audit by regulatory authorities.</li>
            </ul>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegulatorPanel;
