import fs from "fs";
import axios from "axios";
import config from "../config";

export type GoogleBook = {
  id: string;
  accessInfo: { viewability: "PARTIAL" | "FULL" | "NONE" };
  searchInfo: { textSnippet: string };
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    pageInfo?: {
      pageCount: number;
      printType: string;
      categories: string[];
      contentVersion: string;
    };
    imageLinks?: {
      smallThumbnail: string;
      thumbnail: string;
    };
    language: string;
    previewLink: string;
    infoLink: string;
    canonicalVolumeLink: string;
    categories: string[];
  };
};

export type GoogleBooksVolume = {
  items: GoogleBook[];
};

export class GoogleBooks {
  getBookCategories(book: GoogleBook): string[] {
    return book.volumeInfo?.categories || [];
  }

  async getBookByTitle(title: string) {
    try {
      let data: GoogleBooksVolume;
      if (config.mock.googleBooks) {
        data = JSON.parse(fs.readFileSync("google-books.json", "utf8"));
      } else {
        const query = encodeURIComponent(`intitle:"${title}"`);
        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${config.google.apiKey}`;
        const response = await axios.get(url);
        data = response.data;
        fs.writeFileSync("google-books.json", JSON.stringify(data, null, 2));
      }

      if (!data.items || data.items.length === 0) {
        throw new Error("No book found");
      }

      const bookLangEn = data.items.find((b) => b.volumeInfo.language === "en");
      return bookLangEn || data.items[0]!;
    } catch (error) {
      console.error("Books API error:", error);
      return null;
    }
  }

  getBookPreviewLink(book: GoogleBook) {
    const viewability = book.accessInfo.viewability;
    const snippet = book.searchInfo?.textSnippet;

    const res: {
      snippet?: string;
      viewability: GoogleBook["accessInfo"]["viewability"];
      previewLink?: string;
    } = {
      snippet,
      viewability,
    };

    if (viewability === "PARTIAL" || viewability === "FULL") {
      res.previewLink = book.volumeInfo.previewLink;
    }
    return res;
  }
}
