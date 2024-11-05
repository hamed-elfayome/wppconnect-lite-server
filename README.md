# WhatsApp API Server
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Release](https://img.shields.io/github/release/hamed-elfayome/wppconnect-lite-server.svg)


Lite WhatsApp API server for WppConnect, built with Node.js and Express.

## Features

- WhatsApp session management
- Multi-type message support (Receive various message types, send text messages only)
- Media handling
- Webhook integrations
- Rate limiting
- Authentication
- Logging
- Error handling

## Prerequisites

- Node.js >= 14
- npm >= 6
- A server for webhook handling

## Installation

1. Clone the repository
```bash
git clone https://github.com/hamed-elfayome/wppconnect-lite-server.git
cd wppconnect-lite-server
```

2. Install dependencies
```bash
npm install
```

3. Create and configure .env file
```bash
cp .env.example .env
```
In the ```.env``` file, set the following required variables:
- ```WEB_HOOK_URL``` - URL where webhook events will be sent.
- ```API_SECRET_KEY``` - API key for authenticating requests.

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Authentication

All API endpoints require an `x-api-key` header with your configured API secret key.

### Endpoints

#### Initialize WhatsApp Session

```http
POST /api/whatsapp/initialize
```

Initializes a new WhatsApp session and generates a QR code for authentication.

**Response:**
```json
{
  "success": true,
  "message": "Initialization started"
}
```

#### Get Session Status

```http
GET /api/whatsapp/session-status
```

Returns the current status of the WhatsApp session.

**Response:**
```json
{
  "success": true,
  "status": "connected",
  "message": "Session is active and connected",
  "qrCode": null
}
```

Possible status values:
- `no_session`: No session exists
- `initializing`: Session is being created
- `qr_ready`: QR code is ready for scanning
- `connected`: Successfully connected
- `disconnected`: Session is disconnected
- `error`: Error occurred

#### Send Message

```http
POST /api/whatsapp/send-message
Content-Type: application/json

{
  "number": "1234567890",
  "message": "Hello from WhatsApp API!"
}
```

Sends a message to the specified WhatsApp number.

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully to 1234567890",
  "messageId": "ABCD1234"
}
```

#### Disconnect Session

```http
POST /api/whatsapp/disconnect
```

Disconnects the current WhatsApp session.

**Response:**
```json
{
  "success": true,
  "message": "Session disconnected successfully",
  "status": "disconnected",
  "qrCode": null
}
```

### Webhooks

The server sends various events to your Laravel backend. You need to implement these webhook endpoints:

#### Status Update Webhook

```http
POST /webhook/status

{
  "status": "connected"
}
```

Receives WhatsApp connection status updates.

#### QR Code Webhook

```http
POST /webhook/qr

{
  "qrCode": "base64_encoded_qr_code_data"
}
```

Receives QR code data when initializing WhatsApp.

#### Incoming Message Webhook

```http
POST /incoming-message

{
  "from": "1234567890@c.us",
  "sender": {
    "id": "1234567890@c.us",
    "name": "John Doe",
    "pushname": "John"
  },
  "body": "Hello!",
  "type": "chat",
  "timestamp": 1683000000,
  "isGroupMsg": false,
  "messageId": "ABCD1234",
  "quotedMsg": null,
  "mentionedJidList": []
}
```

Receives incoming WhatsApp messages.

#### Media Upload Webhook

```http
POST /media

{
  //file_base64
}
```

Receives media files from WhatsApp messages.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
