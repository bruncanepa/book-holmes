import dotenv from "dotenv";

dotenv.config({
  path: `.env${process.env.NODE_ENV === "production" ? "" : ".local"}`,
});

type Config = {
  google: { apiKey: string };
  googleGemini: { apiKey: string };
  mock: {
    googleVisionObjectLocalization: boolean;
    googleVisionTextDetection: boolean;
    googleGemini: boolean;
    googleBooks: boolean;
  };
  puppeteer: { headless: boolean };
};

const config: Config = {
  google: {
    apiKey: process.env.GOOGLE_API_KEY || "",
  },
  googleGemini: {
    apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
  },
  mock: {
    googleVisionObjectLocalization:
      process.env.MOCK_GOOGLE_VISION_OBJECT_LOCALIZATION === "true",
    googleVisionTextDetection:
      process.env.MOCK_GOOGLE_VISION_TEXT_DETECTION === "true",
    googleGemini: process.env.MOCK_GOOGLE_GEMINI === "true",
    googleBooks: process.env.MOCK_GOOGLE_BOOKS === "true",
  },
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS === "true",
  },
};

export default config;
