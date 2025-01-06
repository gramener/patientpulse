# Patient Pulse

The application identifies the drugs, diseases, and symptoms, as well as the emotions from an audio recording of a patient call in a clinical trial.

## How the application works

The application is a [Gramener Demo](#gramener-demos).

`script.js` implements this logic:

- Reads `config.json` to get the list of transcripts and renders them, allowing users to select a transcript
- When the user selects a transcript, it reads the audio and prosody files

Once it reads these files, it makes a request to GPT-4o-mini via [LLM Foundry API](#llm-foundry) with the system prompt:

````markdown
You are a clinical trial expert. Read this call transcript. Identify all drugs, diseases, and symptoms mentioned. Return a JSON that mentions each along with the line in the call transcript they occur in. Example:

```json
{
  "symptoms": [
    { "name": "...", "lines": [1, 4] }, // first symptom is mentioned in lines 1, 4
    { "name": "...", "lines": [8] } // second symptom is mentioned in line 8
  ],
  "drugs": [
    { "name": "...", "lines": [6] } // first drug is mentioned in line 6
  ],
  "emotions": [
    { "name": "...", "lines": [9] } // first emotion is mentioned in line 9
  ]
}
```
````

It then renders a UI (via lit-html) that

- Plays the audio
- Maps the emotions in `${filename}.prosody.csv` to the 8 basic emotions on Robert Plutchik's theory of emotions. See [How to map emotions](#how-to-map-emotions)
- Displays [wheel.png](wheel.png), which is a 1080x1080px image of Plutchik's wheel of emotions
- As the audio plays, it
  - displays text up to the currently playing `Text` from `${filename}.prosody.csv`, highlighting the current sentence.
  - displays the emotions as a semi-transparent radar chart on the wheel of emotions
- It allows pausing and resuming the audio.
- It allows users to drag the audio slider to jump to any point in the audio. The transcript and the wheel of emotions are updated to reflect the new position in the audio.

## How to add a demo

Generate the emotions.

1. Convert the audio into an MP3 file with the filename as `lower-case-with-dashes.mp3`. We'll call this `${filename}.mp3` from now on.
2. Upload `${filename}.mp3` to [platform.hume.ai/playground/file](https://platform.hume.ai/playground/file) using the "Hume Expression Models - Audio".
3. View Job Details and download `artifacts.zip`
4. Extract `**/prosody.csv` from `artifacts.zip` and rename as `${filename}.prosody.csv`
5. Compress `${filename}.mp3` into `${filename}.opus`

Then add an entry to `config.json` with a title, audio and prosody keys, like this:

```json
[
  {
    "title": "Tommy's Mum has Arthritis",
    "audio": "audio/tommys-mum-has-arthritis.opus",
    "prosody": "audio/tommys-mum-has-arthritis.prosody.csv"
  }
  // etc.
]
```

## How to map emotions

`${filename}.prosody.csv` has rows that look like this:

```json
{
  "Text": "Hi. This is Tommy calling about my mom's arthritis",
  "BeginTime": "1.3935863",
  "EndTime": "4.680759",
  "Admiration": "0.010031821",
  "Adoration": "0.00483171",
  "Aesthetic Appreciation": "0.00479903"
  // ... remaining emotions
}
```

The emotions are mapped into the 8 basic emotions on Robert Plutchik's theory of emotions by mapping and adding the emotions as follows:

```json
{
  "Admiration": "Joy",
  "Adoration": "Joy",
  "Aesthetic Appreciation": "Joy",
  "Amusement": "Joy",
  "Calmness": "Joy",
  "Contentment": "Joy",
  "Ecstasy": "Joy",
  "Enthusiasm": "Joy",
  "Excitement": "Joy",
  "Gratitude": "Joy",
  "Love": "Joy",
  "Pride": "Joy",
  "Realization": "Joy",
  "Relief": "Joy",
  "Satisfaction": "Joy",
  "Surprise (positive)": "Joy",
  "Triumph": "Joy",
  "Admiration": "Trust",
  "Adoration": "Trust",
  "Contentment": "Trust",
  "Gratitude": "Trust",
  "Love": "Trust",
  "Pride": "Trust",
  "Sympathy": "Trust",
  "Anxiety": "Fear",
  "Apprehension": "Fear",
  "Doubt": "Fear",
  "Embarrassment": "Fear",
  "Fear": "Fear",
  "Guilt": "Fear",
  "Horror": "Fear",
  "Shame": "Fear",
  "Surprise (negative)": "Fear",
  "Awe": "Surprise",
  "Confusion": "Surprise",
  "Horror": "Surprise",
  "Realization": "Surprise",
  "Surprise (negative)": "Surprise",
  "Surprise (positive)": "Surprise",
  "Contemplation": "Sadness",
  "Disappointment": "Sadness",
  "Distress": "Sadness",
  "Empathic Pain": "Sadness",
  "Envy": "Sadness",
  "Grief": "Sadness",
  "Nostalgia": "Sadness",
  "Pain": "Sadness",
  "Sadness": "Sadness",
  "Contempt": "Disgust",
  "Disapproval": "Disgust",
  "Disgust": "Disgust",
  "Embarrassment": "Disgust",
  "Shame": "Disgust",
  "Sarcasm": "Disgust",
  "Annoyance": "Anger",
  "Anger": "Anger",
  "Contempt": "Anger",
  "Determination": "Anger",
  "Envy": "Anger",
  "Sarcasm": "Anger",
  "Craving": "Anticipation",
  "Desire": "Anticipation",
  "Determination": "Anticipation",
  "Enthusiasm": "Anticipation",
  "Excitement": "Anticipation",
  "Interest": "Anticipation"
}
```

# Gramener Demos

Gramener Demos are single page web-apps that use Bootstrap and lit-html.

This is the `index.html` file.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${TITLE}</title>
    <link rel="icon" href="https://raw.githubusercontent.com/gramener/assets/main/straive-favicon.svg" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
      crossorigin="anonymous"
    />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
    <style>
      .narrative {
        max-width: 800px;
      }
      /* Add any other custom styles here */
    </style>
  </head>

  <body>
    <nav class="navbar navbar-expand-lg bg-body-tertiary" data-bs-theme="dark">
      <div class="container-fluid">
        <a class="navbar-brand" href=".">${TITLE}</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <div class="nav-item dropdown ms-auto" role="group" aria-label="Toggle dark mode" title="Toggle Dark Mode">
            <button
              class="dark-theme-toggle btn btn-outline-light dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Toggle theme (auto)"
            >
              <i class="bi bi-circle-half"></i>
              <span class="d-lg-none ms-2">Toggle theme</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <button class="dropdown-item" data-bs-theme-value="light">
                  <i class="me-2 bi bi-sun-fill"></i> Light
                </button>
              </li>
              <li>
                <button class="dropdown-item" data-bs-theme-value="dark">
                  <i class="me-2 bi bi-moon-stars-fill"></i> Dark
                </button>
              </li>
              <li>
                <button class="dropdown-item" data-bs-theme-value="auto">
                  <i class="me-2 bi bi-circle-half"></i> Auto
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>

    <div class="container-fluid">
      <h1 class="display-1 my-4 text-center">${TITLE}</h1>
      <h2 class="display-6 text-center">${SUBTITLE}</h2>
      <div class="mx-auto my-3 narrative">${DETAILED_DESCRIPTION}</div>

      <div id="app"></div>
    </div>

    <footer class="my-5 vh-100 d-flex align-items-center justify-content-center">
      <h1 class="display-4">
        Designed by
        <a href="https://gramener.com/" class="text-reset link-offset-3 link-underline link-underline-opacity-25"
          >Gramener</a
        >
      </h1>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" type="module"></script>
    <script src="https://cdn.jsdelivr.net/npm/@gramex/ui@0.3/dist/dark-theme.js" type="module"></script>
    <script src="script.js" type="module"></script>
  </body>
</html>
```

In addition, there is a `script.js` file that contains the logic for the demo.

## script.js

Here are some libraries we often import in `script.js`:

```js
// lit-html to render UI
import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";

// Render Markdown as HTML. unsafeHTML(marked.parse(markdown)) is a common pattern
import { Marked } from "https://cdn.jsdelivr.net/npm/marked@13/+esm";
const marked = new Marked();

// Partial JSON to parse streaming JSON
import { parse } from "https://cdn.jsdelivr.net/npm/partial-json@0.1.7/+esm";

// D3 for charts
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// PDF to text
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4/+esm";
pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs";
pdfjs.getDocument(await file.arrayBuffer()).promise;

// DOCX to text
import * as mammoth from "https://cdn.jsdelivr.net/npm/mammoth@1/+esm";
mammoth.extractRawText({ arrayBuffer });
```

Also:

- You can generate images from text using AI: https://maxm-imggenurl.web.val.run/[describe-the-image]
- You can generate placeholder images: https://placehold.co/[width]x[height]

Here are some common principles:

- Prefer `.addEventListener()` to `on<event>=""` inline event handlers. But lit-html `@` handlers are OK.
- ALWAYS show a loading spinner or message during `fetch()`.
- ALWAYS catch errors and notify the user with CLEAR error messages.
- Target modern browsers. Avoid libraries (e.g. React) unless EXPLICITLY requested.

# LLM Foundry

## Token API

Client-side authentication is done using the Token API.

`GET https://llmfoundry.straive.com/token` returns the LLMFoundry token for the user. This can be used to authenticate with the API. For example:

```js
const token = await fetch("https://llmfoundry.straive.com/token", {
  credentials: "include",
}).then((r) => r.json());
```

If the user is not logged in as a valid user, this returns an empty object. Otherwise, it returns:

```json
{
  "email": "user.name@straive.com",
  "token": "..."
}
```

To redirect the user to the login page, use `https://llmfoundry.straive.com/login?next=${window.location.href}`

## LLM APIs

Here's how you can use the LLM APIs.

### OpenAI

```js
const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}:${project - name}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "[INSERT SYSTEM PROMPT]" },
      {
        role: "user",
        content: [
          { type: "text", text: "[INSERT USER MESSAGE]" }, // for text
          {
            type: "image_url",
            image_url: {
              url: `data:[IMAGE MIME TYPE];base64,[IMAGE BASE64]`,
              detail: "low",
            },
          }, // for image. Get MIME type DYNAMICALLY from image
        ],
      },
    ],
    // response_format: "json_object",  // forces JSON response
  }),
});
```

Response is in `response.choices?.[0]?.message?.content`. Error is in `response.error?.message`.

### Azure OpenAI

```js
const response = await fetch(
  "https://llmfoundry.straive.com/azure/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-05-01-preview",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}:${project - name}`,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "[INSERT SYSTEM PROMPT]" },
        {
          role: "user",
          content: [
            { type: "text", text: "[INSERT USER MESSAGE]" }, // for text
            {
              type: "image_url",
              image_url: {
                url: `data:[IMAGE MIME TYPE];base64,[IMAGE BASE64]`,
                detail: "low",
              },
            }, // for image. Get MIME type DYNAMICALLY from image
          ],
        },
      ],
      // response_format: "json_object",  // forces JSON response
    }),
  }
);
```

If required, replace `gpt-4o-mini` with `gpt-4o`, ...
Response is in `response.choices?.[0]?.message?.content`. Error is in `response.error?.message`.

### Anthropic

```js
const response = await fetch("https://llmfoundry.straive.com/anthropic/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}:${project - name}`,
  },
  body: JSON.stringify({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    system: "[INSERT SYSTEM PROMPT]",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "[INSERT USER MESSAGE]" }, // for text
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "[IMAGE MIME TYPE]",
              data: "[IMAGE BASE64 AFTER COMMA]",
            },
          }, // for image. Get MIME type DYNAMICALLY from image
        ],
      },
    ],
  }),
});
```

If required, replace `claude-3-haiku-20240307` with `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`, ...
Response is in `response.content?.[0]?.text`. Error is in `response.error?.message`.

### Groq

```js
const response = await fetch("https://llmfoundry.straive.com/groq/openai/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}:${project-name}` },
  body: JSON.stringify({
    model: "llama-3.2-90b-vision-preview",
    messages: [
      { role: "system", content: "[INSERT SYSTEM PROMPT]" },
      { role: "user", content: "[INSERT USER MESSAGE]" }
      { type: "image_url", image_url: { url: `data:[IMAGE MIME TYPE];base64,[IMAGE BASE64]`, detail: "low" } }, // for image. Get MIME type DYNAMICALLY from image
    ],
    // response_format: "json_object",  // forces JSON response
  }),
});
```

Images are supported only with "vision" models.
If required, replace `llama-3.2-90b-vision-preview` with `llama-3.2-11b-vision-preview`, `llama-3.1-8b-instant`, `llama-3.1-70b-versatile`, `gemma2-9b-it`, ...
Response is in `response.choices?.[0]?.message?.content`. Error is in `response.error?.message`.

### Gemini

```js
const response = await fetch(
  "https://llmfoundry.straive.com/gemini/v1beta/models/gemini-1.5-flash-latest:generateContent",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}:${project - name}`,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "[INSERT SYSTEM PROMPT]" }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: "[INSERT USER MESSAGE]" }, // for text
            {
              inline_data: {
                mime_type: "[IMAGE MIME TYPE]",
                data: "[IMAGE BASE64 AFTER COMMA]",
              },
            }, // for image. Get MIME type DYNAMICALLY from image
          ],
        },
      ],
    }),
  }
);
```

If required, replace `gemini-1.5-flash-latest` with `gemini-1.5-flash-pro`, ...
Response is in `response.candidates?.[0].content?.parts?.[0]?.text`. Error is in `response.error?.message`.

## Other APIs

### Similarity

```js
const response = await fetch("https://llmfoundry.straive.com/similarity", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}:${project - name}`,
  },
  body: JSON.stringify({
    model: "text-embedding-3-small",
    docs: ["King", "Queen"],
    topics: ["male", "female"],
  }),
});
```

Computes pairwise similarity between documents or topics using the dot-product of embeddings.

If required, replace `text-embedding-3-small` with `text-embedding-3-large`, `text-embedding-ada-002`, ...

Response looks like this:

```json
{
  "model": "text-embedding-3-small",
  "similarity": [
    [0.44537, 0.4027],
    [0.39711, 0.4803]
  ],
  "tokens": 4
}
```
