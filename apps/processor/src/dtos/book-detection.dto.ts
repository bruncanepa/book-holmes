import z from "zod";

export const BookDetectionDtoSchema = z.object({
  isBook: z.boolean().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  text: z.string().optional(),
  error: z.string().optional(),
});

export type BookDetectionDto = Partial<z.infer<typeof BookDetectionDtoSchema>>;
