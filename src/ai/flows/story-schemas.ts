
/**
 * @fileOverview Schemas for the story generation flow.
 *               This file is safe to import on the client.
 */

import { z } from 'zod';

export const StoryInputSchema = z.object({
  placeId: z.string().min(1, 'placeId cannot be empty.'),
});
export type StoryInput = z.infer<typeof StoryInputSchema>;

export const StoryOutputSchema = z.object({
  story: z.string(),
  updatedAt: z.string(),
});
export type StoryOutput = z.infer<typeof StoryOutputSchema>;
