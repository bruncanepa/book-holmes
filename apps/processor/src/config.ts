import dotenv from "dotenv";

dotenv.config({
  path: `.env${process.env.NODE_ENV === "production" ? "" : ".local"}`,
});

type Config = {
  googleVision: {
    apiKey: string;
  };
  openai: {
    apiKey: string;
  };
  mock: {
    googleVisionObjectLocalization: boolean;
    googleVisionTextDetection: boolean;
  };
};

const config: Config = {
  googleVision: {
    apiKey: process.env.GOOGLE_VISION_API_KEY || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  mock: {
    googleVisionObjectLocalization:
      process.env.MOCK_GOOGLE_VISION_OBJECT_LOCALIZATION === "true",
    googleVisionTextDetection:
      process.env.MOCK_GOOGLE_VISION_TEXT_DETECTION === "true",
  },
};

export default config;
