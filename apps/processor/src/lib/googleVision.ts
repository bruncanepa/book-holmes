import fs from "fs";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { google } from "@google-cloud/vision/build/protos/protos";
import config from "../config";

export class GoogleVision {
  private vision: ImageAnnotatorClient;

  constructor() {
    this.vision = new ImageAnnotatorClient({
      apiKey: config.googleVision.apiKey,
    });
  }

  async detectObject(imageBuffer: Buffer) {
    const [objectResult] = config.mock.googleVisionObjectLocalization
      ? (await this.vision.objectLocalization?.({
          image: { content: imageBuffer },
        })) || []
      : (JSON.parse(
          fs.readFileSync("objectLocalization.json", "utf-8")
        ) as google.cloud.vision.v1.IAnnotateImageResponse[]);

    if (!config.mock.googleVisionObjectLocalization) {
      fs.writeFileSync(
        "objectLocalization.json",
        JSON.stringify(objectResult, null, 2)
      );
    }

    const objects = objectResult?.localizedObjectAnnotations || [];
    return objects;
  }

  async detectText(imageBuffer: Buffer) {
    const [textResult] = config.mock.googleVisionTextDetection
      ? (await this.vision.textDetection({
          image: { content: imageBuffer },
        })) || []
      : (JSON.parse(
          fs.readFileSync("textDetection.json", "utf-8")
        ) as google.cloud.vision.v1.IAnnotateImageResponse[]);

    if (!config.mock.googleVisionTextDetection) {
      fs.writeFileSync(
        "textDetection.json",
        JSON.stringify(textResult, null, 2)
      );
    }

    const textAnnotations =
      textResult?.textAnnotations ||
      ([] as google.cloud.vision.v1.IEntityAnnotation[]);
    return textAnnotations[0];
  }
}
