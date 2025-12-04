/**
 * PaddleOCR Client Module
 * 
 * Fast OCR service integration using PaddleOCR Docker service
 * Typical processing time: 5-7 seconds (vs 30-90s for Tesseract)
 * 
 * Usage:
 * ```typescript
 * const text = await extractTextFromBufferPaddleOCR(imageBuffer);
 * ```
 */

const PADDLEOCR_URL = process.env.PADDLEOCR_URL || 'http://localhost:8866';
const PADDLEOCR_ENDPOINT = '/predict/ocr_system';
// Increased to 30 seconds - PaddleOCR can take 10-20s for some images
// Configurable via PADDLEOCR_TIMEOUT environment variable (in milliseconds)
const PADDLEOCR_TIMEOUT = parseInt(process.env.PADDLEOCR_TIMEOUT || '30000', 10);

/**
 * Extract text from image buffer using PaddleOCR service
 * 
 * @param imageBuffer - Image data as Buffer
 * @returns Extracted text (joined with newlines)
 * @throws Error if PaddleOCR service is unavailable or returns error
 * 
 * Example:
 * ```typescript
 * const buffer = await fs.readFile('receipt.jpg');
 * const text = await extractTextFromBufferPaddleOCR(buffer);
 * // Returns: "LEWIS RETAIL\nTIN: 0003169685\n..."
 * ```
 */
export async function extractTextFromBufferPaddleOCR(
  imageBuffer: Buffer
): Promise<string> {
  try {
    console.log(`🚀 Attempting PaddleOCR (${Math.round(imageBuffer.length / 1024)}KB)...`);
    const startTime = Date.now();

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PADDLEOCR_TIMEOUT);

    try {
      // Call PaddleOCR service
      // PaddleOCR expects 'images' array (not 'image' field)
      const response = await fetch(`${PADDLEOCR_URL}${PADDLEOCR_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [base64Image], // PaddleOCR requires 'images' array
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`PaddleOCR failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const resultText = await response.text();
      const duration = Date.now() - startTime;
      
      // Try to parse JSON response
      let result: any;
      try {
        result = JSON.parse(resultText);
        // Log response structure for debugging (first time only)
        if (!process.env.PADDLEOCR_DEBUG_LOGGED) {
          console.log('🔍 PaddleOCR response structure:', {
            keys: Object.keys(result),
            hasResults: !!result.results,
            resultsType: typeof result.results,
            resultsIsArray: Array.isArray(result.results),
            sample: JSON.stringify(result).substring(0, 500)
          });
          process.env.PADDLEOCR_DEBUG_LOGGED = 'true';
        }
      } catch (parseError) {
        console.error('PaddleOCR response is not valid JSON:', resultText.substring(0, 500));
        throw new Error('PaddleOCR returned invalid JSON response');
      }

      // Parse PaddleOCR response format
      // PaddleOCR FastDeploy returns format like:
      // { results: [[{text: "...", confidence: ...}, ...]] }  <- NESTED ARRAY
      // Or: { results: [{ text: "...", confidence: ..., bbox: ... }, ...] }
      // Or sometimes nested: { results: { results: [...] } }
      let extractedText = '';
      
      // Handle nested results structure
      let actualResults = result.results || result;
      if (actualResults && typeof actualResults === 'object' && actualResults.results && !Array.isArray(actualResults)) {
        actualResults = actualResults.results;
      }
      
      // Flatten nested arrays: results can be [[...]] or [...]
      const flattenResults = (arr: any[]): any[] => {
        const flattened: any[] = [];
        for (const item of arr) {
          if (Array.isArray(item)) {
            flattened.push(...flattenResults(item));
          } else {
            flattened.push(item);
          }
        }
        return flattened;
      };
      
      if (actualResults && Array.isArray(actualResults)) {
        // Flatten nested arrays first
        const flatResults = flattenResults(actualResults);
        
        // Extract text from each result
        extractedText = flatResults
          .map((item: any) => {
            // Handle different result formats:
            // 1. { text: "...", confidence: ... } - Most common format
            if (item && typeof item === 'object' && item.text) {
              return item.text;
            }
            // 2. [text, confidence, bbox] array format
            if (Array.isArray(item) && item.length > 0) {
              // First element is usually the text, or could be an object
              if (typeof item[0] === 'string') {
                return item[0];
              }
              if (item[0] && typeof item[0] === 'object' && item[0].text) {
                return item[0].text;
              }
              return String(item[0] || '');
            }
            // 3. String directly
            if (typeof item === 'string') {
              return item;
            }
            // 4. Try to find text in object properties
            if (item && typeof item === 'object') {
              return item.text || item.det_text || item.rec_text || '';
            }
            return '';
          })
          .filter((text: string) => text.trim().length > 0)
          .join('\n');
      } else if (actualResults && typeof actualResults === 'object' && actualResults.text) {
        // Single result object
        extractedText = actualResults.text;
      } else if (result.text) {
        // Fallback: if text is directly in result
        extractedText = result.text;
      } else if (typeof result === 'string') {
        // Fallback: if result is a string
        extractedText = result;
      } else {
        // Log the actual response for debugging
        console.error('PaddleOCR response format not recognized. Full response:', JSON.stringify(result).substring(0, 1000));
        console.error('Response keys:', Object.keys(result));
        console.error('actualResults type:', typeof actualResults, Array.isArray(actualResults));
        throw new Error('PaddleOCR response format not recognized - check logs for actual response');
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('PaddleOCR returned empty text');
      }

      console.log(`✅ PaddleOCR complete in ${Math.round(duration / 1000)}s (${extractedText.length} characters)`);
      return extractedText;

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error(`PaddleOCR timeout after ${PADDLEOCR_TIMEOUT}ms`);
      }
      throw fetchError;
    }

  } catch (error: any) {
    // Return error message instead of throwing (for graceful fallback)
    const errorMessage = error instanceof Error ? error.message : 'Unknown PaddleOCR error';
    console.error(`❌ PaddleOCR failed: ${errorMessage}`);
    throw new Error(`PaddleOCR error: ${errorMessage}`);
  }
}

/**
 * Check if PaddleOCR service is available
 * 
 * @returns true if service is reachable, false otherwise
 */
export async function isPaddleOCRAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for health check

    try {
      // Try to connect to the service endpoint (even if it fails, we know service is up)
      const response = await fetch(`${PADDLEOCR_URL}${PADDLEOCR_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [''], // Empty/minimal image for quick health check
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      // Service is available if we get any response (200, 400, 500 all mean service is up)
      return true; // Any response means service is running
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Connection refused or timeout means service is down
      if (error.name === 'AbortError' || error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        return false;
      }
      // Other errors (like 400/500) mean service is up but returned error
      return true;
    }
  } catch (error) {
    return false;
  }
}

