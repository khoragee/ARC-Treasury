import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider("https://arc-testnet.drpc.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    console.log("Deploying with account:", wallet.address);

    const artifact = JSON.parse(
        fs.readFileSync("artifacts/contracts/ArcTreasury.sol/ArcTreasury.json", "utf8")
    );

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    const LOW_BALANCE_THRESHOLD = ethers.parseEther("100");
    const PAYOUT_INTERVAL = 7 * 24 * 60 * 60;

    const treasury = await factory.deploy(LOW_BALANCE_THRESHOLD, PAYOUT_INTERVAL);
    await treasury.waitForDeployment();
    console.log("ArcTreasury deployed to:", await treasury.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});