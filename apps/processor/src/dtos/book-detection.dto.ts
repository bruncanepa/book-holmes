import { z } from "zod";

export const BookDetectionDtoSchema = z.object({
  isBook: z.boolean().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  text: z.string().optional(),
  error: z.string().optional(),
  description: z.string().optional(),
});

export type BookDetectionDto = z.infer<typeof BookDetectionDtoSchema>;

export type BookDetectionEvent = {
  type: "book-detected" | "book-title" | "book-type" | "book-description";
  data: Partial<BookDetectionDto>;
};
