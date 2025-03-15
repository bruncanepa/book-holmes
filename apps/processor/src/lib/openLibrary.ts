import axios from "axios";

export class OpenLibrary {
  constructor() {}

  async getBookByTitle(title: string) {
    const searchResponse = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`
    );
    const bookId = searchResponse.data.docs?.[0]?.key;

    if (!bookId) {
      throw new Error("Book content not found");
    }
  }
}
