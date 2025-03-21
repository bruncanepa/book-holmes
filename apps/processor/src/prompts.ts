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
Example 1 input: ["Copyright", "Table of Contents", "Chapter 1: The Beginning", "Chapter 2"]
Example 1 output: "2"       
Example 2 input: ["Section 1", "Section 2"]
Example 2 output: "0"       
Input: ${input.join(", ")}
Output (just the number):`;
