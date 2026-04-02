import { useEffect, useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x07601e157CB5132d81292ebF3E03723E551D2BC3";
const RPC_URL = "https://rpc.testnet.arc.network";

const ABI = [
    "function getTreasuryBalance() view returns (uint256)",
    "function checkLowBalance() view returns (bool)",
    "function getContributorCount() view returns (uint256)",
    "function paused() view returns (bool)",
    "function executeScheduledPayout() external",
    "function manualPayout() external",
    "function addContributor(address wallet, uint256 amount) external",
    "function triggerPricePause(string reason) external",
    "function resume() external",
];

export default function App() {
    const [balance, setBalance] = useState("0");
    const [isPaused, setIsPaused] = useState(false);
    const [isLowBalance, setIsLowBalance] = useState(false);
    const [contributorCount, setContributorCount] = useState("0");
    const [status, setStatus] = useState("");
    const [wallet, setWallet] = useState<ethers.Signer | null>(null);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    async function loadData() {
        try {
            const bal = await readContract.getTreasuryBalance();
            setBalance(ethers.formatUnits(bal, 6));
            setIsPaused(await readContract.paused());
            setIsLowBalance(await readContract.checkLowBalance());
            const count = await readContract.getContributorCount();
            setContributorCount(count.toString());
        } catch (e) {
            setStatus("Failed to load data.");
        }
    }

    async function connectWallet() {
        if (!(window as any).ethereum) return setStatus("MetaMask not found.");
        const web3Provider = new ethers.BrowserProvider((window as any).ethereum);
        await web3Provider.send("eth_requestAccounts", []);
        const signer = await web3Provider.getSigner();
        setWallet(signer);
        setStatus("Wallet connected: " + (await signer.getAddress()));
    }

    function getWriteContract() {
        if (!wallet) { setStatus("Connect wallet first."); return null; }
        return new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    }

    async function manualPayout() {
        const c = getWriteContract(); if (!c) return;
        try {
            setStatus("Sending payout...");
            const tx = await c.manualPayout();
            await tx.wait();
            setStatus("Payout successful!");
            loadData();
        } catch (e: any) { setStatus("Error: " + e.message); }
    }

    async function pauseTreasury() {
        const c = getWriteContract(); if (!c) return;
        try {
            setStatus("Pausing...");
            const tx = await c.triggerPricePause("Manual pause");
            await tx.wait();
            setStatus("Treasury paused.");
            loadData();
        } catch (e: any) { setStatus("Error: " + e.message); }
    }

    async function resumeTreasury() {
        const c = getWriteContract(); if (!c) return;
        try {
            setStatus("Resuming...");
            const tx = await c.resume();
            await tx.wait();
            setStatus("Treasury resumed.");
            loadData();
        } catch (e: any) { setStatus("Error: " + e.message); }
    }

    useEffect(() => { loadData(); }, []);

    return (
        <div style={{ fontFamily: "monospace", maxWidth: 600, margin: "40px auto", padding: 24, background: "#0f0f0f", color: "#fff", borderRadius: 12 }}>
            <h1 style={{ color: "#00c2ff" }}>⚡ Arc Treasury Dashboard</h1>
            <p style={{ color: "#888" }}>Contract: {CONTRACT_ADDRESS}</p>

            <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p>💰 <b>Balance:</b> {balance} USDC</p>
                <p>👥 <b>Contributors:</b> {contributorCount}</p>
                <p>⚠️ <b>Low Balance:</b> {isLowBalance ? "YES" : "No"}</p>
                <p>🔒 <b>Paused:</b> {isPaused ? "YES" : "No"}</p>
            </div>

            <button onClick={connectWallet} style={btnStyle("#00c2ff")}>Connect Wallet</button>
            <button onClick={loadData} style={btnStyle("#444")}>Refresh</button>
            <button onClick={manualPayout} style={btnStyle("#00ff88")}>Manual Payout</button>
            <button onClick={pauseTreasury} style={btnStyle("#ff4444")}>Pause Treasury</button>
            <button onClick={resumeTreasury} style={btnStyle("#ffaa00")}>Resume Treasury</button>

            {status && <p style={{ marginTop: 16, color: "#ffcc00" }}>{status}</p>}
        </div>
    );
}

function btnStyle(color: string) {
    return {
        margin: "6px 6px 6px 0",
        padding: "10px 16px",
        background: color,
        color: color === "#00c2ff" || color === "#00ff88" ? "#000" : "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: "monospace",
        fontWeight: "bold",
    };
}