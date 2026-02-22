# Postman Collection — cf-send-email

## File

`cf-send-email.postman_collection.json`

---

## Importing the Collection

1. Open Postman
2. Click **Import** (top-left)
3. Select the file `docs/cf-send-email.postman_collection.json`
4. The collection **cf-send-email** will appear in your sidebar

---

## Collection Variables

The collection uses variables so you only need to configure values once. After importing, click the collection name → **Variables** tab to edit them.

| Variable       | Default value                                              | Description                        |
|----------------|------------------------------------------------------------|------------------------------------|
| `baseUrl`      | `http://localhost:3000`                                    | Base URL of the running server     |
| `emailTo`      | `recipient@example.com`                                    | Recipient email address            |
| `emailFrom`    | `sender@yourdomain.com`                                    | Sender email address               |
| `emailSubject` | `Hello from cf-send-email`                                 | Email subject line                 |
| `emailBody`    | `<h1>Hello!</h1><p>This is a test email sent via cf-send-email.</p>` | Email body (HTML supported) |

> For a deployed environment, change `baseUrl` to your Cloud Function URL (e.g. `https://your-region-project.cloudfunctions.net/cf-send-email`).

---

## Requests

### Health

| Name           | Method | Path      | Description                        |
|----------------|--------|-----------|------------------------------------|
| Health Check   | GET    | `/health` | Returns server status and timestamp |

### Send Email

All three requests share the same body schema:

```json
{
  "to": "{{emailTo}}",
  "from": "{{emailFrom}}",
  "subject": "{{emailSubject}}",
  "body": "{{emailBody}}"
}
```

| Name               | Method | Path              | Provider  |
|--------------------|--------|-------------------|-----------|
| Send via SendGrid  | POST   | `/send/sendgrid`  | SendGrid  |
| Send via AWS SES   | POST   | `/send/aws`       | AWS SES   |
| Send via Brevo     | POST   | `/send/brevo`     | Brevo     |

---

## Response Reference

| Status | Meaning           | Example body |
|--------|-------------------|---|
| `200`  | Email sent        | `{ "message": "Email sent successfully" }` |
| `400`  | Validation error  | `{ "error": "...", "fieldErrors": { "to": ["Invalid recipient email address"] } }` |
| `500`  | Provider failure  | `{ "error": "[sendgrid] Failed to send email via SendGrid" }` |

---

## Running the Server Locally

```bash
cp .env.example .env
# Fill in your API keys and DATABASE_URL

npm install
npm run dev
```

The server starts on `http://localhost:3000`. Set `baseUrl` in the collection variables to match.
