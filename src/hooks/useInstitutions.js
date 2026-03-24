import { useState, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

/**
 * Shared hook — reads the institution list from the on-chain registry.
 * Returns { institutions, loadInstitutions }
 * Each institution object: { wallet, name, code }
 */
const useInstitutions = () => {
  const [institutions, setInstitutions] = useState([]);

  const loadInstitutions = useCallback(async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const addresses = await contract.getInstitutions();
      const list = await Promise.all(
        addresses.map(async (wallet) => {
          const inst = await contract.institutions(wallet);
          return { wallet, name: inst.name, code: inst.code };
        })
      );
      setInstitutions(list);
    } catch (err) {
      console.error("useInstitutions: failed to load", err);
    }
  }, []);

  return { institutions, loadInstitutions };
};

export default useInstitutions;
