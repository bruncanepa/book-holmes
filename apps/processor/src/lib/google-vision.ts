import { ImageAnnotatorClient } from "@google-cloud/vision";
import { google } from "@google-cloud/vision/build/protos/protos";
import config from "../config";
import { writeFileSync } from "./file";
import { readFileSync } from "fs";

export class GoogleVision {
  private vision: ImageAnnotatorClient;

  constructor() {
    this.vision = new ImageAnnotatorClient({
      apiKey: config.google.apiKey,
    });
  }

  async detectObject(imageBuffer: Buffer) {
    let objectResult:
      | google.cloud.vision.v1.IAnnotateImageResponse
      | undefined = undefined;
    if (config.mock.googleVisionTextDetection) {
      try {
        const fileContent = readFileSync(`objectLocalization.json`, "utf-8");
        if (fileContent) {
          [objectResult] =
            (JSON.parse(
              fileContent
            ) as google.cloud.vision.v1.IAnnotateImageResponse[]) || [];
        }
      } catch (error) {}
    }

    if (!objectResult) {
      [objectResult] =
        (await this.vision.objectLocalization?.({
          image: { content: imageBuffer },
        })) || [];
      writeFileSync("objectLocalization.json", JSON.stringify([objectResult]));
    }

    const objects = objectResult?.localizedObjectAnnotations || [];
    return objects;
  }

  async detectText(id: string, imageBuffer: Buffer) {
    let textResult: google.cloud.vision.v1.IAnnotateImageResponse | undefined =
      undefined;
    if (config.mock.googleVisionTextDetection) {
      try {
        const fileContent = readFileSync(`textDetection-${id}.json`, "utf-8");
        if (fileContent) {
          [textResult] =
            (JSON.parse(
              fileContent
            ) as google.cloud.vision.v1.IAnnotateImageResponse[]) || [];
        }
      } catch (error) {}
    }

    if (!textResult) {
      [textResult] =
        (await this.vision.textDetection({
          image: { content: imageBuffer },
        })) || [];
      writeFileSync(`textDetection-${id}.json`, JSON.stringify([textResult]));
    }

    const textAnnotations =
      textResult?.textAnnotations ||
      ([] as google.cloud.vision.v1.IEntityAnnotation[]);
    return textAnnotations[0];
  }
}
