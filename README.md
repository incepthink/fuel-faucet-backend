# Fuel Faucet API

This is a Node.js Express API for a Fuel Network faucet, allowing users to claim testnet tokens once every 24 hours.

## Using the Live API

The Fuel Faucet API is live and can be accessed at:

https://fuelfaucet.hashcase.co/

To claim tokens using the live API:

1. Send a POST request to `https://fuelfaucet.hashcase.co/claim`
2. Set the `Content-Type` header to `application/json`
3. In the request body, include your Fuel wallet address as JSON:

```json
{
  "walletAddress": "your_fuel_wallet_address"
}
```

Example using curl:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"walletAddress":"your_fuel_wallet_address"}' https://fuelfaucet.hashcase.co/claim
```

### Successful Response

If your claim is successful, you'll receive a response like this:

```json
{
  "message": "Transaction successful",
  "result": {
    // Transaction details
  }
}
```

### Error Responses

- If you've claimed within the last 24 hours:
  ```json
  {
    "error": "Try again after X hours and Y minutes."
  }
  ```

- If the wallet address is invalid:
  ```json
  {
    "errors": [
      {
        "msg": "Invalid value",
        "param": "walletAddress",
        "location": "body"
      }
    ]
  }
  ```

- For other errors, an appropriate error message will be returned.