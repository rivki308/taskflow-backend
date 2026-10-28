import { z } from 'zod';
import { requiredText } from './common.schemas';

/** userId / taskId are NOT accepted from the client — they come from the token and the URL. */
export const createCommentSchema = z
  .object({
    content: requiredText('content', 2000),
  })
  .strict();

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
