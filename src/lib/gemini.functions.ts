import { createServerFn } from '@tanstack/react-start';

type GeminiPart = {
  text: string;
};

type GeminiContents = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

type GeminiRequest = {
  systemInstruction?: {
    parts: GeminiPart[];
  };

  contents: GeminiContents[];

  generationConfig?: {
    responseMimeType?: string;
    temperature?: number;
  };
};

export const generateGemini = createServerFn({
  method: 'POST',
  strict: false,
})
  .validator(
    (data: GeminiRequest) => data,
  )
  .handler(async ({ data }) => {
    const apiKey =
      process.env['GEMINI_API_KEY'];

    if (!apiKey) {
      throw new Error(
        'AI configuration is missing. Please check the Gemini API key.',
      );
    }

    try {
      const response =
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              data,
            ),
          },
        );

      /*
       * Gemini can occasionally return 503 when the model
       * is experiencing temporary high demand.
       *
       * Do not expose Gemini's raw technical error to the user.
       */
      if (
        response.status ===
        503
      ) {
        throw new Error(
          'The AI director is a little busy right now. Please wait a few seconds and try again.',
        );
      }

      /*
       * Rate limiting can also happen temporarily.
       */
      if (
        response.status ===
        429
      ) {
        throw new Error(
          'The AI director is handling a lot of requests right now. Please wait a moment and try again.',
        );
      }

      /*
       * Authentication / API-key problems.
       */
      if (
        response.status ===
        401 ||
        response.status ===
        403
      ) {
        throw new Error(
          'The AI service could not authenticate this request. Please check your Gemini API configuration.',
        );
      }

      /*
       * Other server-side Gemini problems.
       */
      if (
        response.status >=
        500
      ) {
        throw new Error(
          'The AI director is temporarily unavailable. Please wait a few seconds and try again.',
        );
      }

      /*
       * Other request errors.
       *
       * We intentionally do not expose the raw Gemini
       * response because it is technical and confusing
       * for normal users.
       */
      if (!response.ok) {
        throw new Error(
          'The AI director could not process your request. Please try again in a moment.',
        );
      }

      const payload =
        (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                text?: string;
              }>;
            };
          }>;
        };

      const text =
        payload
          .candidates?.[0]
          ?.content?.parts?.[0]
          ?.text;

      if (!text) {
        throw new Error(
          'The AI director returned an empty response. Please try again.',
        );
      }

      return text;
    } catch (error) {
      /*
       * Preserve our friendly errors.
       */
      if (
        error instanceof
        Error
      ) {
        throw error;
      }

      /*
       * Catch unexpected network/runtime
       * failures without exposing technical details.
       */
      throw new Error(
        'The AI director is temporarily unavailable. Please wait a few seconds and try again.',
      );
    }
  });