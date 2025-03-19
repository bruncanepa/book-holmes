import dotenv from "dotenv";

dotenv.config({
  path: `.env${process.env.NODE_ENV === "production" ? "" : ".local"}`,
});

type Config = {
  auth: { apiKeys: string[] };
  google: { apiKey: string };
  googleGemini: { apiKey: string };
  mock: {
    googleVisionObjectLocalization: boolean;
    googleVisionTextDetection: boolean;
    googleGemini: boolean;
    googleBooks: boolean;
    puppeteer: boolean;
  };
  puppeteer: { headless: boolean };
  web: { url: string };
};

const config: Config = {
  auth: {
    apiKeys: process.env.AUTH_API_KEY?.split(",") || [],
  },
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
    puppeteer: process.env.MOCK_PUPPETEER === "true",
  },
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS === "false",
  },
  web: {
    url: process.env.WEB_URL || "",
  },
};

export default config;
