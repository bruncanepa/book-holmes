import dotenv from "dotenv";

dotenv.config({
  path: `.env${process.env.NODE_ENV === "production" ? "" : ".local"}`,
});

type Config = {
  web: { url: string };
};

export const loadConfig = (): Config => ({
  web: {
    url: process.env.WEB_URL || "",
  },
});

export default loadConfig();
