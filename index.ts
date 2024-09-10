import express from 'express';
import { Provider, Wallet } from 'fuels';
import axios from 'axios';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

interface ClaimResponse {
  Item?: {
    lastClaimTime: {
      S: string;
    };
  };
}

async function setValidity(recipient: string): Promise<void> {
  const data = {
    walletAddress: recipient,
    lastClaimTime: Date.now().toString(),
  };

  try {
    await axios.post(process.env.LAMBDA_URL!, data, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error setting validity:', error);
    throw new Error('Failed to set claim validity');
  }
}

async function checkClaimEligibility(recipient: string): Promise<void> {
  try {
    const response = await axios.get<ClaimResponse>(`${process.env.LAMBDA_URL}?walletAddress=${recipient}`);
    
    if (!response.data?.Item) {
      await setValidity(recipient);
      return;
    }

    const lastClaimTime = parseInt(response.data.Item.lastClaimTime.S);
    const currentTime = Date.now();
    const timeSinceLastClaim = currentTime - lastClaimTime;

    if (timeSinceLastClaim < 86400000) { // 24 hours in milliseconds
      const remainingTime = 86400000 - timeSinceLastClaim;
      const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
      throw new Error(`Try again after ${remainingHours} hours and ${remainingMinutes} minutes.`);
    }

    await setValidity(recipient);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to check claim eligibility');
  }
}

async function transferTokens(recipient: string, amount: number): Promise<any> {
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY!;
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const adminWallet = Wallet.fromPrivateKey(adminPrivateKey, provider);
  return adminWallet.transfer(recipient, amount);
}

app.post(
  '/claim',
  body('walletAddress').isString().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress } = req.body;

    try {
      await checkClaimEligibility(walletAddress);
      const result = await transferTokens(walletAddress, 5000000);
      res.status(200).json({ message: 'Transaction successful', result });
    } catch (error) {
      if (error instanceof Error) {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  }
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});