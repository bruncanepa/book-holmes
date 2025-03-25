export const bookTitlePrompt = `
You are a book title extractor analyzing OCR text from a book cover image. 
Your task is to identify and return ONLY the main title of the book. 
The title will be used to look up the book in Google Books API to determine if it's fiction or non-fiction. 
Rules:
1. Return ONLY the title text, no subtitles or author names
2. Remove any series information (e.g., 'Book 1 of...')
3. Clean up any OCR artifacts or formatting issues
4. Ensure the title is in its most searchable form for Google Books API
5. If you cannot confidently identify the title, return an empty string
6. Do not include any explanations or additional text in your response`;

export const findBookFirstSectionPrompt = (input: string[]) =>
  `Given this array of strings that represent sections of a book, identify which one is most likely to be the first section or chapter of actual book content (not cover, not preface, copyright, etc). 
Return only the index number of that section. The index start at 0, as it would be an array.
If none of the sections seem to be actual book content (e.g., they are all front matter like copyright, table of contents, etc.), return -1.
Example 1 input: ["Copyright", "Table of Contents", "Chapter 1: The Beginning", "Chapter 2"]
Example 1 output: "2"       
Example 2 input: ["Section 1", "Section 2"]
Example 2 output: "0"
Example 3 input: ["Table of contents", "Copy right"]
Example 3 output: "-1"          
Input: ${input.join(", ")}
Output (just the number):`;

export const detectBookTitlePrompt = `act as a librarian. detect if the image contains a book. if it does, return the title and the author. 
Return your response in valid JSON format with the following schema: { "isBook": boolean, "title": string, "author": string }.
Only set isBook to true if you are confident the image contains a book. If no book is detected, set isBook to false and leave title and author as empty strings.`;

export const detectBookContentPrompt = `You are a precise text extractor analyzing an image of a book page. 
Extract ALL text visible in the image, maintaining the original formatting as much as possible.

Follow these guidelines:
1. Capture ALL text content from the page, including headers, footers, page numbers, and footnotes
2. Preserve paragraph breaks and formatting
3. Include chapter titles and section headings if present
4. Maintain the reading order of the text (left-to-right, top-to-bottom)
5. If there are multiple columns, process each column in sequence
6. Ignore watermarks or irrelevant background elements
7. Do not add any commentary, explanations, or additional text
8. If text is partially visible or unclear, make your best attempt to transcribe it
9. Return the raw text content only

Your goal is to provide a complete and accurate transcription of all text in the image.`;
