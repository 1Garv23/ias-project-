import { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

const ROLE_NAMES = ["PUBLIC", "INSTITUTION", "REGULATOR", "GOVT"];

/**
 * Reads the role of `account` directly from the on-chain roles mapping.
 * Returns one of: "PUBLIC" | "INSTITUTION" | "REGULATOR" | "GOVT"
 */
const useRole = (account) => {
  const [role, setRole] = useState("PUBLIC");

  useEffect(() => {
    if (!account || !window.ethereum) {
      setRole("PUBLIC");
      return;
    }

    const fetchRole = async () => {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const result = await contract.roles(account);
        setRole(ROLE_NAMES[Number(result)] ?? "PUBLIC");
      } catch (err) {
        console.error("useRole: failed to fetch role", err);
        setRole("PUBLIC");
      }
    };

    fetchRole();
  }, [account]);

  return role;
};

export default useRole;
