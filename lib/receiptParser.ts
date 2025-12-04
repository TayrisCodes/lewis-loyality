/**
 * Receipt Parser Module
 * 
 * Extracts structured data from OCR text:
 * - TIN (Tax Identification Number)
 * - Invoice/Receipt number
 * - Date
 * - Total amount
 * - Branch name/location
 * - Barcode (if present)
 * 
 * Handles various receipt formats and OCR errors
 */

/**
 * Parsed receipt data structure
 */
export interface ParsedReceipt {
  tin?: string;
  invoiceNo?: string;
  date?: string; // YYYY-MM-DD format
  totalAmount?: number;
  branchText?: string;
  barcodeData?: string;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
  flags: string[]; // Issues found during parsing
}

/**
 * Extract TIN (Tax Identification Number) from text
 * 
 * Patterns:
 * - TIN: 0003169685
 * - TIN 0003169685
 * - Tax ID: 0003169685
 * - 0003169685 (10+ digits)
 * 
 * @param text - OCR extracted text
 * @returns TIN or null
 */
export function extractTIN(text: string): string | null {
  // Pattern 1: Explicit TIN label
  const tinPattern1 = /\bTIN[:\s]*([0-9]{6,20})\b/i;
  const match1 = text.match(tinPattern1);
  if (match1 && match1[1]) {
    return match1[1].trim();
  }

  // Pattern 2: Tax ID label
  const tinPattern2 = /\bTax\s+ID[:\s]*([0-9]{6,20})\b/i;
  const match2 = text.match(tinPattern2);
  if (match2 && match2[1]) {
    return match2[1].trim();
  }

  // Pattern 3: VAT/TIN number
  const tinPattern3 = /\bVAT[:\s]*([0-9]{6,20})\b/i;
  const match3 = text.match(tinPattern3);
  if (match3 && match3[1]) {
    return match3[1].trim();
  }

  // Pattern 4: Standalone sequence of 10-15 digits (likely TIN)
  const tinPattern4 = /\b([0-9]{10,15})\b/;
  const match4 = text.match(tinPattern4);
  if (match4 && match4[1]) {
    // Verify it's not a phone number or date
    const candidate = match4[1];
    if (!candidate.startsWith('09') && !candidate.startsWith('251')) {
      return candidate.trim();
    }
  }

  return null;
}

/**
 * Extract invoice/receipt number
 * 
 * Patterns:
 * - Invoice No: 04472-002-0011L
 * - Receipt #: ABC123
 * - Order No: 12345
 * - INV-2024-001
 * 
 * @param text - OCR extracted text
 * @returns Invoice number or null
 */
export function extractInvoiceNo(text: string): string | null {
  // Debug: Log first 500 chars to see what OCR captured
  const preview = text.substring(0, 500).replace(/\n/g, '\\n');
  console.log(`   🔍 Searching for invoice number in OCR text (preview): ${preview}...`);

  // Pattern 1: Invoice No Order: 05507-001-0036L (specific format from zoorya receipts)
  // Handle OCR misreads like "Invoice No Order" or "InvoiceNoOrder" or "Invoice NoOrder"
  const invoiceNoOrderPattern = /Invoice\s*No\s*Order[:\s]+([0-9]{4,5}[\s\-]+[0-9]{2,3}[\s\-]+[0-9]{3,4}[A-Z]?)/i;
  const invoiceNoOrderMatch = text.match(invoiceNoOrderPattern);
  if (invoiceNoOrderMatch && invoiceNoOrderMatch[1]) {
    // Normalize spaces/hyphens in the invoice number
    let invoiceNo = invoiceNoOrderMatch[1].trim().replace(/\s+/g, '-');
    // Ensure proper format: 05507-001-0036L
    invoiceNo = invoiceNo.replace(/[-\s]+/g, '-');
    console.log(`   ✅ Found Invoice No Order: ${invoiceNo}`);
    return invoiceNo;
  }

  // Pattern 2: Invoice No: 05507-001-0036L (standard format)
  // More flexible to handle OCR errors
  const invoiceNoPattern = /Invoice\s*(?:No|Number|NO|NUMBER)[:\s]+([0-9]{4,5}[\s\-]+[0-9]{2,3}[\s\-]+[0-9]{3,4}[A-Z]?)/i;
  const invoiceNoMatch = text.match(invoiceNoPattern);
  if (invoiceNoMatch && invoiceNoMatch[1]) {
    let invoiceNo = invoiceNoMatch[1].trim().replace(/\s+/g, '-');
    invoiceNo = invoiceNo.replace(/[-\s]+/g, '-');
    console.log(`   ✅ Found Invoice No: ${invoiceNo}`);
    return invoiceNo;
  }

  // Pattern 3: Standalone format like 05507-001-0036L or 04472-002-0011L (digits-digits-digits+letter)
  // More flexible: handle spaces instead of dashes, OCR misreads
  const standalonePattern1 = /\b([0-9]{4,5}[\s\-][0-9]{2,3}[\s\-][0-9]{3,4}[A-Z]?)\b/;
  const standaloneMatch1 = text.match(standalonePattern1);
  if (standaloneMatch1 && standaloneMatch1[1]) {
    let candidate = standaloneMatch1[1].trim().replace(/\s+/g, '-');
    candidate = candidate.replace(/[-\s]+/g, '-');
    const parts = candidate.split('-');
    if (parts.length === 3 && candidate.length >= 12 && candidate.length <= 20) {
      console.log(`   ✅ Found standalone invoice format: ${candidate}`);
      return candidate;
    }
  }

  // Pattern 3b: More lenient - look for any pattern with digits-dash-digits-dash-digits
  const standalonePattern2 = /([0-9]{4,5}[-\s][0-9]{2,3}[-\s][0-9]{3,4}[A-Z]?)/;
  const standaloneMatch2 = text.match(standalonePattern2);
  if (standaloneMatch2 && standaloneMatch2[1]) {
    let candidate = standaloneMatch2[1].trim().replace(/\s+/g, '-').replace(/[-\s]+/g, '-');
    const parts = candidate.split('-');
    // Check if it's near invoice-related keywords
    const textBefore = text.substring(Math.max(0, text.indexOf(candidate) - 50), text.indexOf(candidate)).toLowerCase();
    const textAfter = text.substring(text.indexOf(candidate) + candidate.length, Math.min(text.length, text.indexOf(candidate) + candidate.length + 50)).toLowerCase();
    
    if (parts.length >= 3 && (textBefore.includes('invoice') || textBefore.includes('order') || textAfter.includes('invoice') || textAfter.includes('order'))) {
      console.log(`   ✅ Found invoice-like pattern near keywords: ${candidate}`);
      return candidate;
    }
    // If it matches the format and length, use it anyway
    if (parts.length === 3 && candidate.length >= 12 && candidate.length <= 20) {
      console.log(`   ✅ Found invoice-like format: ${candidate}`);
      return candidate;
    }
  }

  // Pattern 4: Receipt #: ABC123 or Order No: 12345
  const receiptPattern = /(?:Receipt|Order)\s*(?:No|#|Number)[:\s]+([A-Z0-9\-\/\s]{4,50})/i;
  const receiptMatch = text.match(receiptPattern);
  if (receiptMatch && receiptMatch[1]) {
    const invoiceNo = receiptMatch[1].trim().replace(/\s+/g, '');
    console.log(`   ✅ Found Receipt/Order No: ${invoiceNo}`);
    return invoiceNo;
  }

  // Pattern 5: INV-2024-001 or similar
  const invPattern = /INV[:\s\-]+([A-Z0-9\-\/]{3,50})/i;
  const invMatch = text.match(invPattern);
  if (invMatch && invMatch[1]) {
    const invoiceNo = invMatch[1].trim();
    console.log(`   ✅ Found INV format: ${invoiceNo}`);
    return invoiceNo;
  }

  // Pattern 6: Look for lines containing "Invoice" or "Order" and extract number from same/next line
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('invoice') || line.includes('order')) {
      // Check current line
      const currentMatch = lines[i].match(/([0-9]{4,5}[-\s][0-9]{2,3}[-\s][0-9]{3,4}[A-Z]?)/);
      if (currentMatch && currentMatch[1]) {
        let invoiceNo = currentMatch[1].trim().replace(/\s+/g, '-').replace(/[-\s]+/g, '-');
        console.log(`   ✅ Found invoice number on line with keyword: ${invoiceNo}`);
        return invoiceNo;
      }
      // Check next 2 lines
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextMatch = lines[i + j].match(/([0-9]{4,5}[-\s][0-9]{2,3}[-\s][0-9]{3,4}[A-Z]?)/);
        if (nextMatch && nextMatch[1]) {
          let invoiceNo = nextMatch[1].trim().replace(/\s+/g, '-').replace(/[-\s]+/g, '-');
          console.log(`   ✅ Found invoice number ${j} line(s) after keyword: ${invoiceNo}`);
          return invoiceNo;
        }
      }
    }
  }

  console.log(`   ⚠️  Could not extract invoice number from receipt`);
  console.log(`   🔍 Sample lines with numbers: ${lines.filter(l => /\d/.test(l)).slice(0, 5).join(' | ')}`);
  return null;
}

/**
 * Extract date from receipt text
 * 
 * Supports formats:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD.MM.YYYY
 * - MM/DD/YYYY
 * - DD-MM-YYYY
 * - Month DD, YYYY
 * 
 * @param text - OCR extracted text
 * @returns Date in YYYY-MM-DD format or null
 */
export function extractDate(text: string): string | null {
  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD
  const isoPattern = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/;
  const isoMatch = text.match(isoPattern);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyPattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/;
  const dmyMatch = text.match(dmyPattern);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    
    // Validate date is reasonable
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${year}-${month}-${day}`;
    }
  }

  // Pattern 3: Month name (e.g., "January 15, 2024" or "15 Jan 2024")
  const monthNames = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'sept': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
  };

  const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i;
  const monthMatch = text.match(monthPattern);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const month = monthNames[monthName as keyof typeof monthNames];
    const day = monthMatch[2].padStart(2, '0');
    const year = monthMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Extract total amount from receipt
 * 
 * Strategies:
 * 1. Look for keywords: TOTAL, NET, AMOUNT, SUBTOTAL
 * 2. Find numbers near those keywords
 * 3. If not found, return largest number in receipt
 * 
 * @param text - OCR extracted text
 * @returns Amount or null
 */
export function extractTotalAmount(text: string): number | null {
  const lines = text.split('\n');
  
  // Helper to extract number from text (handles various formats)
  const extractNumber = (line: string): number | null => {
    // Normalize line first: handle spaces before decimal (e.g., "*244 .65" -> "*244.65")
    // This is common OCR error where space appears before decimal point
    let normalizedLine = line.replace(/\*\s*(\d+)\s+\.\s*(\d+)/g, '*$1.$2'); // "*244 .65" -> "*244.65"
    normalizedLine = normalizedLine.replace(/(\d+)\s+\.\s*(\d+)/g, '$1.$2'); // "244 .65" -> "244.65"
    normalizedLine = normalizedLine.replace(/\*\s*(\d{1,3})\s+(\d{2})(?!\d)/g, '*$1.$2'); // "*244 65" -> "*244.65"
    
    // PRIORITY 1: Try asterisk format with decimal FIRST (most complete)
    const decimalAsteriskMatch = normalizedLine.match(/\*[\s]*(\d+(?:\.\d{2})?)/);
    if (decimalAsteriskMatch && decimalAsteriskMatch[1]) {
      const candidate = decimalAsteriskMatch[1].replace(/,/g, '').replace(/\s/g, '');
      const amount = parseFloat(candidate);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
    
    // PRIORITY 2: Try separated format: *244 65
    const separatedMatch = normalizedLine.match(/\*[\s]*(\d{1,3})[\s,]+(\d{2})(?!\d)/);
    if (separatedMatch && separatedMatch[1] && separatedMatch[2]) {
      const candidate = `${separatedMatch[1]}.${separatedMatch[2]}`;
      const amount = parseFloat(candidate);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
    
    // PRIORITY 3: Try any decimal number (handles non-asterisk decimals)
    const decimalMatch = normalizedLine.match(/(\d+[.,]\d{2})/);
    if (decimalMatch) {
      const candidate = decimalMatch[1].replace(/,/g, '').replace(/\s/g, '');
      const amount = parseFloat(candidate);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
    
    // FALLBACK: Try asterisk format without decimal
    const asteriskMatch = normalizedLine.match(/\*[\s]*(\d{1,3}(?:[\s,]\d{3})*)/);
    if (asteriskMatch && asteriskMatch[1]) {
      const candidate = asteriskMatch[1].replace(/,/g, '').replace(/\s/g, '');
      const amount = parseFloat(candidate);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
    
    return null;
  };
  
  // Strategy: Calculate TOTAL from SUBTOTAL + TAX if TOTAL line is unreadable
  let subtotal: number | null = null;
  let tax: number | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Extract SUBTOTAL - check current line and next 2 lines
    if (upperLine.includes('SUBTOTAL') && !subtotal) {
      // First try current line
      subtotal = extractNumber(line);
      if (!subtotal && i + 1 < lines.length) {
        // Try next line (common pattern: "SUBTOTAL" on one line, amount on next)
        subtotal = extractNumber(lines[i + 1]);
      }
      if (!subtotal && i + 2 < lines.length) {
        // Try line after next
        subtotal = extractNumber(lines[i + 2]);
      }
      if (subtotal) {
        console.log(`   📋 Extracted SUBTOTAL: ${subtotal} from line ${i}: "${line}"`);
      }
    }
    
    // Extract TAX - check current line and next 2-3 lines (amount often on separate line)
    if (upperLine.includes('TAX') && !tax) {
      // First try to extract from current line (pattern: TAX 1 15.00 *36.79)
      const taxMatch = line.match(/TAX[^0-9]*\*?[\s]*(\d+[.,]\d{2})/i);
      if (taxMatch && taxMatch[1]) {
        const candidate = extractNumber(line);
        if (candidate && candidate > 5 && candidate < 500) { // Tax amounts are usually 5-500, not percentages
          tax = candidate;
          console.log(`   💰 Extracted TAX: ${tax} from line ${i}: "${line}"`);
          continue;
        }
      }
      
      // If not found on same line, check next 3 lines for tax amount
      // TAX amount is usually smaller than SUBTOTAL and appears before SUBTOTAL
      for (let j = 1; j <= 3 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        const upperNext = nextLine.toUpperCase();
        
        // Skip lines that look like subtotals (have asterisk and large amounts)
        if (upperNext.includes('SUBTOTAL') || upperNext.includes('TOTAL')) {
          break; // Don't go past SUBTOTAL/TOTAL
        }
        
        const nextAmount = extractNumber(nextLine);
        if (nextAmount && nextAmount > 5 && nextAmount < 500) {
          // Tax amounts are usually 5-500 range
          // Make sure it's not a percentage or item price
          if (!upperNext.includes('%') && !upperNext.includes('ITEM')) {
            // Prefer amounts without asterisk (tax is often written without asterisk)
            // Or amounts that are clearly tax (like "29.60" vs "*197.36")
            if (!nextLine.includes('*') || nextAmount < 100) {
              tax = nextAmount;
              console.log(`   💰 Extracted TAX: ${tax} from line ${i + j}: "${nextLine}"`);
              break;
            }
          }
        }
      }
      
      // If still not found, try extracting from current line (last resort)
      if (!tax) {
        const candidate = extractNumber(line);
        if (candidate && candidate > 5 && candidate < 500) {
          tax = candidate;
          console.log(`   💰 Extracted TAX: ${tax} from line ${i}: "${line}"`);
        }
      }
    }
  }
  
  console.log(`   🔍 Extraction summary: subtotal=${subtotal}, tax=${tax}`);
  
  // If we found SUBTOTAL and TAX, calculate TOTAL
  if (subtotal && tax && subtotal > 0 && tax > 0) {
    const calculatedTotal = subtotal + tax;
    console.log(`   🧮 Calculated TOTAL: ${subtotal} + ${tax} = ${calculatedTotal}`);
    // This is likely the actual total if OCR couldn't read the TOTAL line
    // We'll use this as a fallback if we can't find TOTAL directly
  } else {
    console.log(`   ⚠️  Cannot calculate TOTAL: subtotal=${subtotal}, tax=${tax}`);
  }

  // Keywords to look for
  const keywords = ['TOTAL', 'NET', 'AMOUNT', 'SUBTOTAL', 'BALANCE', 'GRAND TOTAL'];

  // Strategy 1: Find amount near keywords (prioritize TOTAL over SUBTOTAL)
  const priorityKeywords = ['TOTAL', 'GRAND TOTAL'];
  const secondaryKeywords = ['NET', 'AMOUNT', 'SUBTOTAL', 'BALANCE'];
  
  // Helper function to extract amount from line (handles currency symbols, asterisks, etc.)
  const extractAmountFromLine = (line: string): number | null => {
    // Pattern 1: Match numbers with optional currency symbols/prefixes (*, ETB, $, etc.)
    // Handles: *281.35, ETB 281.35, $281.35, TOTAL: 281.35, TOTAL 281.35
    // Also handles OCR errors like "* 281.35" (space after asterisk) or "*281 35" (space in number)
    const patterns = [
      /[*\$€£][\s]*(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)/,  // *281.35 or * 281.35 or *281 35
      /[*\$€£][\s]*(\d{1,3})[\s,]*(\d{2})/,  // *281 35 or *281,35 (separated digits)
      /(?:TOTAL|NET|AMOUNT|SUBTOTAL)[:\s]*[*\$€£]?[\s]*(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)/i,  // TOTAL: 281.35 or TOTAL *281.35
      /(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)\s*(?:ETB|USD|EUR|GBP)/i,  // 281.35 ETB
      /(\d+[.,]\d{2})/,  // Decimal number with 2 decimal places (most common for totals)
      /(\d{1,3})[\s,]+(\d{2})(?!\d)/,  // 281 35 or 281,35 (separated, not followed by more digits)
      /(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)/,  // Standard number with commas/decimals
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const matches = line.match(pattern);
      if (matches) {
        let candidate: string;
        
        // Handle patterns with 2 capture groups (like "281 35" -> "281.35")
        if (matches[1] && matches[2] && matches[2].length === 2) {
          // Combine separated digits: "281 35" -> "281.35"
          candidate = `${matches[1]}.${matches[2]}`;
        } else if (matches[1]) {
          candidate = matches[1]
            .replace(/,/g, '')
            .replace(/\s/g, '')
            .replace(/\./g, '.'); // Keep decimal point
        } else if (matches[0]) {
          // No capture groups, use whole match
          candidate = matches[0]
            .replace(/[*\$€£ETBUSD]/gi, '')
            .replace(/,/g, '')
            .replace(/\s/g, '');
        } else {
          continue;
        }
        
        const amount = parseFloat(candidate);
        if (!isNaN(amount) && amount > 0 && amount < 1000000) { // Sanity check: totals should be reasonable
          return amount;
        }
      }
    }
    
    // Fallback: Extract all numbers and take the largest decimal number (likely total)
    const allNumbers = line.match(/\d+[.,]\d{2}/g);
    if (allNumbers && allNumbers.length > 0) {
      const amounts = allNumbers.map(n => {
        const cleaned = n.replace(/,/g, '').replace(/\s/g, '');
        return parseFloat(cleaned);
      }).filter(n => !isNaN(n) && n > 0);
      
      if (amounts.length > 0) {
        return Math.max(...amounts); // Return largest decimal number
      }
    }
    
    return null;
  };
  
  // STEP 1: Extract SUBTOTAL and TAX first (we'll use these to calculate TOTAL if needed)
  // Sometimes OCR reads "TOTAL" as "gos a" or similar - we need to find the amount on nearby lines
  let foundTotalAmount: number | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const upperLine = lines[i].toUpperCase();
    
    // Check if line contains TOTAL (even if partially misread - common OCR errors)
    // OCR often misreads "TOTAL" as "gos a", "TO7AL", "T0TAL", etc.
    const hasTotal = upperLine.includes('TOTAL') || 
                     upperLine.match(/T[O0][T7][A4][L1]/) ||
                     (upperLine.match(/^T[O0]/) && upperLine.length < 10); // Lines starting with "TO" that are short
    
    if (hasTotal && !upperLine.includes('SUBTOTAL')) {
      // Check current line for amount
      let amount = extractAmountFromLine(lines[i]);
      if (amount !== null && amount > 100) { // Totals are usually > 100
        foundTotalAmount = amount;
        break; // Found total, stop searching
      }
      
      // Check next 3 lines (TOTAL might be on one line, amount on next lines)
      // Also look for patterns like "*281.35" or "281.35" or "281 35"
      for (let j = 1; j <= 3 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        amount = extractAmountFromLine(nextLine);
        if (amount !== null && amount > 100) {
          // Verify this looks like a total (larger than subtotal, reasonable amount)
          foundTotalAmount = amount;
          break;
        }
      }
      
      if (foundTotalAmount) break;
      
      // Check previous line
      if (i > 0) {
        amount = extractAmountFromLine(lines[i - 1]);
        if (amount !== null && amount > 100) {
          foundTotalAmount = amount;
          break;
        }
      }
    }
  }
  
  // First pass: Look for TOTAL specifically (prioritize exact matches)
  if (!foundTotalAmount) {
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      for (const keyword of priorityKeywords) {
        if (upperLine.includes(keyword) && !upperLine.includes('SUBTOTAL')) {
          // Skip if line also contains SUBTOTAL (we want TOTAL, not SUBTOTAL)
          const amount = extractAmountFromLine(line);
          if (amount !== null && amount > 100) {
            foundTotalAmount = amount;
            break;
          }
        }
      }
      if (foundTotalAmount) break;
    }
  }
  
  // Second pass: Look for other keywords if TOTAL not found
  if (!foundTotalAmount) {
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      for (const keyword of secondaryKeywords) {
        if (upperLine.includes(keyword)) {
          const amount = extractAmountFromLine(line);
          if (amount !== null && amount > 100) {
            foundTotalAmount = amount;
            break;
          }
        }
      }
      if (foundTotalAmount) break;
    }
  }
  
  // If we found TOTAL amount directly, verify it's actually larger than SUBTOTAL
  // Sometimes OCR misreads and returns SUBTOTAL as TOTAL
  if (foundTotalAmount) {
    // If we have SUBTOTAL, verify TOTAL is larger (it should be)
    if (subtotal && foundTotalAmount <= subtotal) {
      console.log(`   ⚠️  Found TOTAL (${foundTotalAmount}) but it's <= SUBTOTAL (${subtotal}), this might be wrong`);
      // Don't return yet - try calculation or continue searching
      foundTotalAmount = null; // Reset to allow calculation
    } else {
      console.log(`   ✅ Found TOTAL directly: ${foundTotalAmount}`);
      return foundTotalAmount;
    }
  }

  // Strategy 2: Calculate TOTAL from SUBTOTAL + TAX if we found both and couldn't find TOTAL directly
  // This handles cases where OCR can't read the TOTAL line OR found wrong amount
  console.log(`   🔍 Strategy 2 Check: foundTotalAmount=${foundTotalAmount}, subtotal=${subtotal}, tax=${tax}`);
  
  if (!foundTotalAmount && subtotal && tax && subtotal > 0 && tax > 0) {
    const calculatedTotal = subtotal + tax;
    // Only use calculated total if it's reasonable (within 25% tax rate)
    const expectedMax = subtotal * 1.25; // Allow up to 25% tax max
    const roundedTotal = Math.round(calculatedTotal * 100) / 100; // Round to 2 decimal places
    
    console.log(`   🧮 Calculation: ${subtotal} + ${tax} = ${calculatedTotal} (rounded: ${roundedTotal})`);
    console.log(`   ✅ Validation: calculatedTotal=${calculatedTotal}, expectedMax=${expectedMax}, >subtotal=${calculatedTotal > subtotal}`);
    
    if (calculatedTotal <= expectedMax && calculatedTotal > subtotal) {
      console.log(`   ✅ Returning calculated TOTAL: ${roundedTotal}`);
      return roundedTotal;
    } else {
      console.log(`   ❌ Calculation validation failed: calculated=${calculatedTotal}, max=${expectedMax}, >subtotal=${calculatedTotal > subtotal}`);
    }
  } else {
    console.log(`   ❌ Cannot calculate: foundTotalAmount=${foundTotalAmount}, subtotal=${subtotal}, tax=${tax}, subtotal>0=${subtotal ? subtotal > 0 : false}, tax>0=${tax ? tax > 0 : false}`);
  }
  
  // Strategy 3: Look for numbers with asterisk prefix (common in Ethiopian receipts: *281.35)
  // These are almost always totals, but we need to distinguish TOTAL from SUBTOTAL
  const asteriskNumbers = text.match(/\*[\s]*(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)/g);
  if (asteriskNumbers && asteriskNumbers.length > 0) {
    const amounts = asteriskNumbers.map(match => {
      // Extract number after asterisk
      const numMatch = match.match(/(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)/);
      if (numMatch && numMatch[1]) {
        const candidate = numMatch[1].replace(/,/g, '').replace(/\s/g, '');
        const amount = parseFloat(candidate);
        if (!isNaN(amount) && amount > 100 && amount < 1000000) {
          return amount;
        }
      }
      // Handle separated format: *281 35
      const separatedMatch = match.match(/(\d{1,3})[\s,]+(\d{2})/);
      if (separatedMatch && separatedMatch[1] && separatedMatch[2]) {
        const candidate = `${separatedMatch[1]}.${separatedMatch[2]}`;
        const amount = parseFloat(candidate);
        if (!isNaN(amount) && amount > 100 && amount < 1000000) {
          return amount;
        }
      }
      return null;
    }).filter(n => n !== null) as number[];
    
    if (amounts.length > 0) {
      // If we have SUBTOTAL, prefer numbers larger than SUBTOTAL (these are likely TOTAL)
      if (subtotal) {
        const largerThanSubtotal = amounts.filter(n => n > subtotal);
        if (largerThanSubtotal.length > 0) {
          return Math.max(...largerThanSubtotal);
        }
      }
      // Return largest asterisk-prefixed number (this is likely the TOTAL, not SUBTOTAL)
      return Math.max(...amounts);
    }
  }
  
  // Strategy 3: Find largest decimal number in receipt (likely the total)
  // Prioritize numbers with 2 decimal places (typical for currency)
  // But exclude very small numbers (like item prices) and very large numbers (like phone numbers)
  const decimalNumbers = text.match(/\d+[.,]\d{2}/g);
  
  if (decimalNumbers && decimalNumbers.length > 0) {
    const cleaned = decimalNumbers
      .map(n => parseFloat(n.replace(/,/g, '').replace(/\s/g, '')))
      .filter(n => !isNaN(n) && n > 100 && n < 1000000); // Filter: totals are usually > 100 and < 1M
    
    if (cleaned.length > 0) {
      // Sort and take the largest, but prefer numbers that are reasonable totals
      // (usually between 100-10000 for retail receipts)
      const reasonableTotals = cleaned.filter(n => n >= 200 && n <= 10000);
      if (reasonableTotals.length > 0) {
        // If we found a SUBTOTAL (like 244.65), the TOTAL should be larger
        // So return the largest number that's > SUBTOTAL
        const subtotal = Math.max(...cleaned.filter(n => n < 1000)); // SUBTOTAL is usually < 1000
        const totalCandidates = reasonableTotals.filter(n => n > subtotal);
        if (totalCandidates.length > 0) {
          return Math.max(...totalCandidates);
        }
        return Math.max(...reasonableTotals);
      }
      // Fallback to largest overall
      return Math.max(...cleaned);
    }
  }
  
  
  // Strategy 5: Fallback to largest number overall
  const allNumbers = text.match(/\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d{2})?|\d+[.,]\d{2}|\d+/g);
  
  if (allNumbers && allNumbers.length > 0) {
    const cleaned = allNumbers
      .map(n => parseFloat(n.replace(/,/g, '').replace(/\s/g, '')))
      .filter(n => !isNaN(n) && n > 100 && n < 1000000); // Filter small/large numbers
    
    if (cleaned.length > 0) {
      // If we have SUBTOTAL, prefer numbers larger than SUBTOTAL
      if (subtotal) {
        const largerThanSubtotal = cleaned.filter(n => n > subtotal);
        if (largerThanSubtotal.length > 0) {
          return Math.max(...largerThanSubtotal);
        }
      }
      // Return largest number (likely the total)
      return Math.max(...cleaned);
    }
  }

  return null;
}

/**
 * Extract branch name/location from receipt
 * Usually found in the first few lines
 * 
 * @param text - OCR extracted text
 * @param maxLines - Number of lines to check from top (default: 10)
 * @returns Branch text or null
 */
export function extractBranchText(text: string, maxLines: number = 10): string | null {
  const lines = text.split('\n').slice(0, maxLines);

  // Look for lines that might contain branch info
  const branchKeywords = [
    'branch', 'location', 'store', 'outlet', 'bole', 'piassa', 
    'meskel', 'kazanchis', 'merkato', 'sarbet', 'aware', 'mexico',
    'bahir dar', 'hawassa', 'mekelle', 'dire dawa', 'adama'
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if line contains branch keyword
    for (const keyword of branchKeywords) {
      if (lowerLine.includes(keyword)) {
        return line.trim();
      }
    }

    // Also return lines that look like addresses or locations
    // (contain numbers, street names, etc.)
    if (line.length > 5 && line.length < 100) {
      if (/\d+/.test(line) && /[A-Za-z]{3,}/.test(line)) {
        return line.trim();
      }
    }
  }

  // If no specific match, return the second or third line (often branch info)
  if (lines.length >= 2 && lines[1].trim().length > 0) {
    return lines[1].trim();
  }

  return null;
}

/**
 * Extract barcode data from text
 * Looks for sequences that resemble barcodes
 * 
 * @param text - OCR extracted text
 * @returns Barcode string or null
 */
export function extractBarcodeData(text: string): string | null {
  // Pattern 1: EAN-13 (13 digits)
  const ean13Pattern = /\b(\d{13})\b/;
  const ean13Match = text.match(ean13Pattern);
  if (ean13Match) {
    return ean13Match[1];
  }

  // Pattern 2: Code 128 or similar (alphanumeric)
  const code128Pattern = /\b([A-Z0-9]{8,20})\b/;
  const code128Match = text.match(code128Pattern);
  if (code128Match) {
    // Verify it's not a TIN or phone number
    const candidate = code128Match[1];
    if (!candidate.match(/^0{2,}/) && candidate.length >= 8) {
      return candidate;
    }
  }

  return null;
}

/**
 * Parse complete receipt text into structured data
 * 
 * @param ocrText - Raw OCR output
 * @returns Parsed receipt data
 * 
 * Example:
 * ```typescript
 * const parsed = parseReceiptText(ocrText);
 * if (parsed.tin === expectedTIN) {
 *   // Receipt is valid
 * }
 * ```
 */
export function parseReceiptText(ocrText: string): ParsedReceipt {
  const flags: string[] = [];
  
  // Extract all fields
  const tin = extractTIN(ocrText);
  const invoiceNo = extractInvoiceNo(ocrText);
  const date = extractDate(ocrText);
  const totalAmount = extractTotalAmount(ocrText);
  const branchText = extractBranchText(ocrText);
  const barcodeData = extractBarcodeData(ocrText);

  // Determine confidence level
  let matchCount = 0;
  if (tin) matchCount++;
  if (invoiceNo) matchCount++;
  if (date) matchCount++;
  if (totalAmount) matchCount++;
  if (branchText) matchCount++;

  let confidence: 'high' | 'medium' | 'low';
  if (matchCount >= 4) {
    confidence = 'high';
  } else if (matchCount >= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    flags.push('Low field extraction rate');
  }

  // Add flags for missing critical fields
  if (!tin) flags.push('TIN not found');
  if (!invoiceNo) flags.push('Invoice number not found');
  if (!date) flags.push('Date not found');
  if (!totalAmount) flags.push('Amount not found');

  return {
    tin: tin || undefined,
    invoiceNo: invoiceNo || undefined,
    date: date || undefined,
    totalAmount: totalAmount || undefined,
    branchText: branchText || undefined,
    barcodeData: barcodeData || undefined,
    rawText: ocrText,
    confidence,
    flags,
  };
}

/**
 * Validate parsed receipt against store rules
 * 
 * @param parsed - Parsed receipt data
 * @param rules - Validation rules from store
 * @returns Validation result
 */
export function validateParsedReceipt(
  parsed: ParsedReceipt,
  rules: {
    expectedTIN?: string;
    expectedBranch?: string;
    minAmount?: number;
    maxAge?: number; // Maximum days old
  }
): {
  valid: boolean;
  reason?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check TIN match
  if (rules.expectedTIN) {
    if (!parsed.tin) {
      return { valid: false, reason: 'TIN not found in receipt', warnings };
    }
    
    const cleanExpected = rules.expectedTIN.replace(/\D/g, '');
    const cleanParsed = parsed.tin.replace(/\D/g, '');
    
    if (cleanExpected !== cleanParsed) {
      return { 
        valid: false, 
        reason: `TIN mismatch (expected: ${rules.expectedTIN}, found: ${parsed.tin})`, 
        warnings 
      };
    }
  }

  // Check branch match (contains keyword)
  if (rules.expectedBranch && parsed.branchText) {
    const branchLower = parsed.branchText.toLowerCase();
    const expectedLower = rules.expectedBranch.toLowerCase();
    
    if (!branchLower.includes(expectedLower)) {
      warnings.push(`Branch mismatch (expected: ${rules.expectedBranch}, found: ${parsed.branchText})`);
    }
  }

  // Check minimum amount
  if (rules.minAmount && parsed.totalAmount) {
    if (parsed.totalAmount < rules.minAmount) {
      return { 
        valid: false, 
        reason: `Amount ${parsed.totalAmount} is below minimum ${rules.minAmount}`, 
        warnings 
      };
    }
  }

  // Check date age
  if (rules.maxAge && parsed.date) {
    try {
      const receiptDate = new Date(parsed.date);
      const now = new Date();
      const ageInDays = (now.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays > rules.maxAge) {
        return { 
          valid: false, 
          reason: `Receipt is ${Math.round(ageInDays)} days old (max: ${rules.maxAge} days)`, 
          warnings 
        };
      }
    } catch (error) {
      warnings.push('Could not validate receipt date');
    }
  }

  // All validations passed
  return { valid: true, warnings };
}

/**
 * Helper: Check if receipt is from today
 */
export function isReceiptFromToday(parsed: ParsedReceipt): boolean {
  if (!parsed.date) return false;
  
  try {
    const receiptDate = new Date(parsed.date);
    const today = new Date();
    
    return (
      receiptDate.getFullYear() === today.getFullYear() &&
      receiptDate.getMonth() === today.getMonth() &&
      receiptDate.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

/**
 * Helper: Format amount for display
 */
export function formatAmount(amount: number | undefined | null, currency: string = 'ETB'): string {
  if (amount === undefined || amount === null) return 'N/A';
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { extractTextFromBuffer } from './ocr';
 * import { parseReceiptText, validateParsedReceipt } from './receiptParser';
 * 
 * const ocrText = await extractTextFromBuffer(imageBuffer);
 * const parsed = parseReceiptText(ocrText);
 * 
 * const validation = validateParsedReceipt(parsed, {
 *   expectedTIN: '0003169685',
 *   expectedBranch: 'Bole',
 *   minAmount: 500,
 *   maxAge: 1, // Same day only
 * });
 * 
 * if (validation.valid) {
 *   // Create visit record
 * } else {
 *   // Reject with reason
 * }
 * ```
 */

