# N8N AI OCR Integration Setup Guide

## Overview

The Lewis Loyalty system now supports **N8N AI OCR** for much faster receipt text extraction (typically 2-10 seconds vs 30-90 seconds with Tesseract).

### How It Works

1. **Primary Method**: N8N AI OCR (via webhook) - Fast, AI-powered
2. **Fallback Method**: Tesseract.js OCR - Slower but reliable backup

The system automatically tries N8N first, then falls back to Tesseract if:
- N8N is not configured
- N8N request times out (>8 seconds)
- N8N returns an error
- N8N returns empty text

## N8N Workflow Setup

### Step 1: Create N8N Workflow

1. **Login to N8N**: 
   - Access N8N UI at `http://89.116.22.36:5680` (or your N8N URL)
   - Login with your credentials

2. **Create New Workflow**:
   - Click "New Workflow" or "+" button
   - Name it: "Lewis Receipt OCR"

3. **Add Webhook Trigger**:
   - Search for "Webhook" node
   - Add it to the canvas
   - Click on the node to configure:
     - **HTTP Method**: `POST`
     - **Path**: `/receipt-ocr` (or your preferred path)
     - **Response Mode**: "When Last Node Finishes"
   - **Copy the Webhook URL** (shown at bottom of node)
     - Example: `http://n8n-production:5678/webhook/receipt-ocr`
     - Or: `http://localhost:5680/webhook/receipt-ocr`

### Step 2: Configure OCR/AI Service

Choose one of these options:

#### Option A: OpenAI Vision API (Recommended - Fast & Accurate)

1. **Add OpenAI Node**:
   - Search for "OpenAI" node
   - Add it after the Webhook node
   - Connect Webhook → OpenAI

2. **Configure OpenAI Node**:
   - **Operation**: "Vision - Describe Image"
   - **API Key**: Your OpenAI API key (set in credentials)
   - **Image URL/Base64**: 
     - Set to `{{ $json.image }}` or `{{ $json.imageBase64 }}`
     - Or process the base64 data URL
   - **Prompt**: 
     ```
     Extract all text from this receipt image. Return only the extracted text, preserving line breaks and formatting. Include:
     - Store name and address
     - TIN number
     - Invoice number
     - Date
     - Total amount
     - Branch information
     - Any other visible text
     ```

3. **Add Function/Code Node** (Optional - to extract text from response):
   - Add a "Function" or "Code" node after OpenAI
   - Extract the text from OpenAI's response:
   ```javascript
   // Extract text from OpenAI vision response
   const text = $json.choices?.[0]?.message?.content || $json.description || '';
   return {
     text: text.trim(),
     timestamp: new Date().toISOString()
   };
   ```

#### Option B: Google Cloud Vision API

1. **Add Google Cloud Vision Node**:
   - Search for "Google Cloud Vision" node
   - Add it after the Webhook node

2. **Configure**:
   - **Operation**: "Text Detection"
   - **Image**: `{{ $json.imageBase64 }}`
   - **Credentials**: Your Google Cloud credentials

3. **Add Function Node** (to extract text):
   ```javascript
   // Extract text from Google Vision response
   const text = $json.textAnnotations?.[0]?.description || '';
   return {
     text: text.trim(),
     timestamp: new Date().toISOString()
   };
   ```

#### Option C: Custom OCR Service

1. **Add HTTP Request Node**:
   - Call any OCR API (e.g., Azure Computer Vision, AWS Textract, etc.)
   - Use `{{ $json.imageBase64 }}` as image input

2. **Add Function Node** to format response:
   ```javascript
   // Extract text from your OCR service response
   const text = $json.text || $json.result || '';
   return {
     text: text.trim(),
     timestamp: new Date().toISOString()
   };
   ```

### Step 3: Configure Response Node

1. **Add Respond to Webhook Node**:
   - Search for "Respond to Webhook" node
   - Add it at the end
   - Connect the previous node → Respond to Webhook

2. **Configure Response**:
   - **Respond With**: "JSON"
   - **Response Body**: 
     ```json
     {
       "text": "{{ $json.text }}"
     }
     ```

### Step 4: Test the Workflow

1. **Activate the Workflow**:
   - Click "Activate" toggle at top-right
   - Workflow must be active to receive webhooks

2. **Test with Sample Image**:
   - Use N8N's "Execute Workflow" feature
   - Send test data:
     ```json
     {
       "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
       "imageBase64": "/9j/4AAQSkZJRg...",
       "timestamp": "2024-01-01T00:00:00.000Z"
     }
     ```
   - Verify it returns: `{ "text": "extracted text here..." }`

### Step 5: Configure Lewis Loyalty App

1. **Update Environment Variables**:
   
   Add to your `.env.production` file:
   ```bash
   # N8N OCR Configuration
   N8N_OCR_ENABLED=true
   N8N_OCR_WEBHOOK_URL=http://n8n-production:5678/webhook/receipt-ocr
   # Or if accessing from host: http://localhost:5680/webhook/receipt-ocr
   N8N_OCR_TIMEOUT=8000
   ```

   **Important - Network Configuration**: 
   - Since containers are in different Docker networks, use the **host-accessible URL**:
     - **Option 1** (Recommended): `http://172.17.0.1:5680/webhook/receipt-ocr`
       - `172.17.0.1` is Docker's default bridge gateway (accessible from containers)
     - **Option 2**: `http://host.docker.internal:5680/webhook/receipt-ocr` (if supported)
     - **Option 3**: `http://89.116.22.36:5680/webhook/receipt-ocr` (external IP)
   - To connect containers to same network (alternative):
     ```bash
     docker network connect n8n-production_n8n_production_network lewis-loyalty-app-prod
     # Then use: http://n8n-production:5678/webhook/receipt-ocr
     ```

2. **Restart Application**:
   ```bash
   cd /root/lewis-loyality
   docker-compose -f docker-compose.production.yml down
   docker-compose -f docker-compose.production.yml --env-file .env.production up -d
   ```

## Testing

1. **Upload a Receipt**:
   - Go to receipt upload page
   - Upload a receipt image
   - Check application logs: `docker logs lewis-loyalty-app-prod --tail 50`

2. **Verify N8N OCR is Used**:
   - Look for log message: `🤖 Attempting N8N AI OCR...`
   - Success: `✅ N8N OCR complete in Xs`
   - Fallback: `⚠️ N8N OCR failed, falling back to Tesseract`

3. **Expected Performance**:
   - **N8N AI OCR**: 2-10 seconds
   - **Tesseract Fallback**: 30-90 seconds

## Troubleshooting

### N8N Not Being Used

- **Check Environment Variables**:
  ```bash
  docker exec lewis-loyalty-app-prod env | grep N8N
  ```
  Should show:
  - `N8N_OCR_ENABLED=true`
  - `N8N_OCR_WEBHOOK_URL=...` (not empty)

- **Check Webhook URL**:
  - Verify N8N workflow is **activated**
  - Test webhook URL directly:
    ```bash
    curl -X POST http://localhost:5680/webhook/receipt-ocr \
      -H "Content-Type: application/json" \
      -d '{"imageBase64":"test"}'
    ```

### N8N Timeout / Errors

- **Check N8N Logs**:
  ```bash
  docker logs n8n-production --tail 50
  ```

- **Increase Timeout** (if N8N is slow):
  ```bash
  N8N_OCR_TIMEOUT=15000  # 15 seconds
  ```

- **Verify Image Format**:
  - N8N receives base64 encoded image
  - Check if your workflow can handle the format

### Fallback to Tesseract

If you see: `⚠️ N8N OCR failed, falling back to Tesseract`

- Check N8N workflow is active
- Check webhook URL is correct
- Check N8N logs for errors
- Verify OCR service (OpenAI/Google/etc.) is configured correctly

## Advanced Configuration

### Custom Response Format

If your N8N workflow returns text in a different format, update the parsing in `lib/ocr.ts`:

```typescript
// In extractTextFromBufferN8N function
if (result.myCustomField) {
  extractedText = result.myCustomField;
}
```

### Multiple N8N Instances

You can use different N8N instances:
- Primary: `http://n8n-production:5678/webhook/receipt-ocr`
- Backup: Configure fallback logic in `lib/ocr.ts`

### Disable N8N (Use Tesseract Only)

Set in `.env.production`:
```bash
N8N_OCR_ENABLED=false
```

Or pass option when calling:
```typescript
extractTextFromBuffer(buffer, { skipN8N: true });
```

## Performance Comparison

| Method | Typical Time | Accuracy | Cost |
|--------|--------------|----------|------|
| **N8N + OpenAI Vision** | 2-5 seconds | Very High | ~$0.01 per image |
| **N8N + Google Vision** | 3-8 seconds | Very High | ~$0.0015 per image |
| **Tesseract.js** | 30-90 seconds | Good | Free |

## Support

If you need help setting up N8N workflow:
1. Check N8N documentation: https://docs.n8n.io/
2. Verify your OCR service (OpenAI/Google) API keys
3. Check application logs for detailed error messages

