# TestFlight Feedback MCP Server

An MCP (Model Context Protocol) server that gives AI assistants access to TestFlight beta tester feedback from App Store Connect. No Xcode required.

## Why?

Apple doesn't expose TestFlight feedback text/comments via their public API ([fastlane discussion](https://github.com/fastlane/fastlane/discussions/17790)). This MCP server provides:

- **Official API** access to screenshot & crash feedback submissions (JWT auth)
- **Optional browser automation** for full text feedback via Apple's internal iris API (Playwright)
- Works on **any platform** — Windows, Linux, macOS — no Xcode needed

## Tools

| Tool | Description |
|------|-------------|
| `list_apps` | List all apps in your App Store Connect account |
| `list_builds` | List TestFlight builds (filter by version, status) |
| `list_beta_testers` | List beta testers (filter by app, group, email) |
| `list_beta_groups` | List beta tester groups for an app |
| `list_feedback` | List all feedback: screenshots, crashes, and text comments |
| `get_feedback_detail` | Get full details for a specific feedback submission |
| `get_crash_log` | Download crash log content for a crash submission |
| `respond_to_feedback` | Email a tester that their feedback has been addressed |

## Setup

### 1. Get App Store Connect API Keys

1. Go to [App Store Connect → Users and Access → Keys](https://appstoreconnect.apple.com/access/api)
2. Click **Generate API Key** (requires Admin role)
3. Download the `.p8` file (you can only download it once)
4. Note the **Key ID** and **Issuer ID**

### 2. Install

```bash
cd testflight-feedback-mcp
npm install
npm run build
```

### 3. Configure

Set environment variables or create a `.env` file:

```bash
ASC_KEY_ID=YOUR_KEY_ID
ASC_ISSUER_ID=YOUR_ISSUER_ID
ASC_PRIVATE_KEY_PATH=./AuthKey_XXXXXXXX.p8
```

Or provide the key inline:
```bash
ASC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...your key...\n-----END PRIVATE KEY-----"
```

### 4. Connect to Your AI Assistant

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "testflight-feedback": {
      "command": "node",
      "args": ["/absolute/path/to/testflight-feedback-mcp/dist/index.js"],
      "env": {
        "ASC_KEY_ID": "YOUR_KEY_ID",
        "ASC_ISSUER_ID": "YOUR_ISSUER_ID",
        "ASC_PRIVATE_KEY_PATH": "/path/to/AuthKey.p8"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "testflight-feedback": {
      "command": "node",
      "args": ["/absolute/path/to/testflight-feedback-mcp/dist/index.js"],
      "env": {
        "ASC_KEY_ID": "YOUR_KEY_ID",
        "ASC_ISSUER_ID": "YOUR_ISSUER_ID",
        "ASC_PRIVATE_KEY_PATH": "/path/to/AuthKey.p8"
      }
    }
  }
}
```

#### VS Code + GitHub Copilot

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "testflight-feedback": {
      "command": "node",
      "args": ["/absolute/path/to/testflight-feedback-mcp/dist/index.js"],
      "env": {
        "ASC_KEY_ID": "YOUR_KEY_ID",
        "ASC_ISSUER_ID": "YOUR_ISSUER_ID",
        "ASC_PRIVATE_KEY_PATH": "/path/to/AuthKey.p8"
      }
    }
  }
}
```

## Optional: Respond to Testers via Email (SMTP)

The `respond_to_feedback` tool looks up the tester's email from a feedback submission and sends them a response. Configure any SMTP provider:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password          # Use App Password for Gmail
SMTP_FROM=your-email@gmail.com       # Optional, defaults to SMTP_USER
APP_NAME=My App                      # Shows in the email footer
```

Works with Gmail, Outlook, custom SMTP, etc. The tool:
1. Fetches the submission to get the tester's email + build version
2. Sends a nicely formatted HTML email with your message
3. Returns confirmation with tester name, email, and message ID

## Optional: Full Text Feedback (Browser Auth)

Apple's public API only returns screenshot and crash submissions — **not text comments**. To access text feedback, enable Playwright-based browser authentication:

```bash
npm install playwright
npx playwright install chromium

# Add to your env:
ENABLE_BROWSER_AUTH=true
ASC_USERNAME=your@apple.id
ASC_PASSWORD=your-password
```

> **Note:** This uses Apple's internal `iris/v1/betaFeedbacks` API. You may be prompted for 2FA on your Apple device. Session cookies are cached in memory for the server lifetime.

## Example Usage

Once connected, ask your AI assistant:

- *"Show me the latest TestFlight feedback for my app"*
- *"List all crash reports from the last build"*
- *"Get the crash log for submission XYZ"*
- *"Who are my beta testers?"*
- *"Show feedback from build 1.2.0"*

## Architecture

```
src/
├── index.ts              # MCP server entry point, tool registration
├── auth/
│   ├── jwt.ts            # JWT token generation (ES256, .p8 key)
│   └── browser.ts        # Optional Playwright session for iris API
├── api/
│   ├── client.ts         # HTTP client with JWT auth & pagination
│   ├── types.ts          # TypeScript types for API responses
│   ├── apps.ts           # /v1/apps endpoints
│   ├── builds.ts         # /v1/builds endpoints
│   ├── testers.ts        # /v1/betaTesters, /v1/betaGroups
│   └── feedback.ts       # Screenshot/crash/iris feedback endpoints
└── tools/
    ├── list-apps.ts
    ├── list-builds.ts
    ├── list-testers.ts
    ├── list-feedback.ts
    ├── get-feedback-detail.ts
    └── get-crash-log.ts
```

## API Coverage

| Endpoint | Auth | Status |
|----------|------|--------|
| `/v1/apps` | JWT | ✅ |
| `/v1/builds` | JWT | ✅ |
| `/v1/betaTesters` | JWT | ✅ |
| `/v1/betaGroups` | JWT | ✅ |
| `/v1/betaFeedbackScreenshotSubmissions` | JWT | ✅ |
| `/v1/betaFeedbackCrashSubmissions` | JWT | ✅ |
| `/iris/v1/betaFeedbacks` (text comments) | Browser | ✅ (optional) |

## License

MIT
