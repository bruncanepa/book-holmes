import dotenv from "dotenv";

dotenv.config({
  path: `.env${process.env.NODE_ENV === "production" ? "" : ".local"}`,
});

type Config = {
  googleVision: {
    apiKey: string;
  };
  googleGemini: {
    apiKey: string;
  };
  mock: {
    googleVisionObjectLocalization: boolean;
    googleVisionTextDetection: boolean;
    googleGemini: boolean;
  };
};

const config: Config = {
  googleVision: {
    apiKey: process.env.GOOGLE_VISION_API_KEY || "",
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
  },
};

export default config;
