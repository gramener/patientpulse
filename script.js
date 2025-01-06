// import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const $demos = document.getElementById("demos");
const $app = document.getElementById("app");
const loading = `<div class="text-center my-5"><div class="spinner-border" role="status"></div></div>`;

// Load configurations and render the demos
$demos.innerHTML = loading;
const { demos, emotions } = await fetch("config.json").then((r) => r.json());
$demos.innerHTML = demos
  .map(
    ({ title, body, audio, prosody }) => /* html */ `
      <div class="col py-3">
        <a class="demo card h-100 text-decoration-none" href="${audio}" data-prosody="${prosody}">
          <div class="card-body">
            <h5 class="card-title">${title}</h5>
            <p class="card-text">${body}</p>
          </div>
        </a>
      </div>
    `
  )
  .join("");

// Ensure that the user is logged in
const { token } = await fetch("https://llmfoundry.straive.com/token", {
  credentials: "include",
}).then((res) => res.json());
if (!token) {
  const url = "https://llmfoundry.straive.com/login?" + new URLSearchParams({ next: location.href });
  $app.innerHTML = /* html */ `<div class="text-center my-5"><a class="btn btn-lg btn-primary" href="${url}">Log in to analyze</a></div>`;
  throw new Error("User is not logged in");
}

// When the user clicks on a demo, analyze it
$demos.addEventListener("click", async (e) => {
  e.preventDefault();
  const $demo = e.target.closest(".demo");
  if (!$demo) return;

  $app.innerHTML = loading;

  const prosody = await d3.csv($demo.dataset.prosody, d3.autoType);
  const response = await fetch("https://llmfoundry.straive.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}:patient-pulse`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a clinical trial expert. Read this call transcript. Identify all drugs, diseases, and symptoms mentioned. Return a JSON that mentions each along with the line in the call transcript they occur in. Example:
\`\`\`json
{
  "symptoms": [
    {"name": "...", "lines": [1, 4]},  // first symptom is mentioned in lines 1, 4
    {"name": "...", "lines": [8]}  // second symptom is mentioned in line 8
  ],
  "drugs": [
    {"name": "...", "lines": [6]}  // first drug is mentioned in line 6
  ],
  "emotions": [
    {"name": "...", "lines": [9]}  // first emotion is mentioned in line 9
  ]
}
\`\`\`
`,
        },
        {
          role: "user",
          content: prosody.map((line, i) => `${i + 1}. ${line.Text}`).join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extraction",
          strict: true,
          schema: extractionSchema,
        },
      },
    }),
  });
  if (!response.ok) {
    $app.innerHTML = /* html */ `<div class="text-center my-5"><pre class="alert alert-danger">${await response.text()}</pre></div>`;
    return;
  }
  const result = await response.json();
  let extracts;
  try {
    extracts = JSON.parse(result.choices[0].message.content);
  } catch (e) {
    $app.innerHTML = /* html */ `<div class="my-5">
      <div class="alert alert-danger">
        <h3 class="h5 alert-heading">${e.message}</h3>
        <pre class="text-start" style="white-space: pre-wrap;">${JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>`;
    return;
  }

  // Render the UI
  $app.innerHTML = /* html */ `
    <audio src="${$demo.href}" controls class="w-100" autoplay></audio>
    <div class="row my-3">
      <div class="col-md extracts">
        <div class="list-group drugs mb-3"></div>
        <div class="list-group symptoms mb-3"></div>
        <div class="list-group diseases mb-3"></div>
      </div>
      <div class="col-md transcript"></div>
      <div class="col-md wheel position-relative">
        <svg class="position-absolute top-0 start-0 img-fluid" viewBox="0 0 1080 1080">
          <g class="slices" transform="translate(540, 540)"></g>
          <g class="labels" transform="translate(540, 540)"></g>
        </svg>
      </div>
    </div>
  `;

  const wheelRadius = 500;
  const arc = d3.arc().innerRadius(0).outerRadius(wheelRadius).cornerRadius(2);
  const pie = d3
    .pie()
    .value(() => 1)
    .startAngle(-Math.PI / 2)
    .endAngle((Math.PI * 3) / 2)
    .padAngle(0.01);

  const slices = d3
    .select(".wheel svg .slices")
    .selectAll("path")
    .data(pie(emotions))
    .join("path")
    .attr("d", arc)
    .attr("fill", (d, i) => d3.hsl((360 * i) / emotions.length, 0.7, 0.6))
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  // Add emotion labels
  const labels = d3
    .select(".wheel svg .labels")
    .selectAll("text")
    .data(pie(emotions))
    .join("text")
    .attr("transform", (d) => {
      const angle = (d.startAngle + d.endAngle) / 2;
      const radius = wheelRadius - 10;
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = Math.sin(angle - Math.PI / 2) * radius;
      const degrees = ((angle - Math.PI / 2) * 180) / Math.PI;
      const flip = angle <= 0 || angle > Math.PI;
      return `translate(${x}, ${y}) rotate(${degrees + (flip ? 180 : 0)})`;
    })
    .attr("text-anchor", (d) => {
      const angle = (d.startAngle + d.endAngle) / 2;
      const flip = angle <= 0 || angle > Math.PI;
      return flip ? "start" : "end";
    })
    .attr("dominant-baseline", "middle")
    .attr("font-size", "36px")
    .text((d) => d.data);

  // As the audio plays, update the UI
  const audio = $app.querySelector("audio");

  audio.addEventListener("timeupdate", () => {
    const time = audio.currentTime;
    let index = prosody.findLastIndex((line) => line.BeginTime <= time);
    index = Math.max(0, index);
    const line = prosody[index];

    // Render transcript up to the current line, highlighting the current line
    $app.querySelector(".transcript").innerHTML =
      prosody
        .slice(0, index)
        .map((line, i) => `<span data-line="${i + 1}">${line.Text}</span> `)
        .join("") + `<span data-line="${index + 1}" class="text-primary">${line.Text}</span> `;

    // Update extracts up to the current line
    for (const [key, items] of Object.entries(extracts)) {
      const terms = items.filter(({ lines }) => lines.some((line) => line <= index));
      $app.querySelector(`.extracts .${key}`).innerHTML = [
        /* html */ `<a href="#" class="list-group-item active">${key.toUpperCase()}</a>`,
        ...terms.map(
          ({ name, lines }) =>
            /* html */ `<a href="#" class="list-group-item" data-lines="${lines.join(",")}">${name}</a>`
        ),
      ].join("");
    }

    // Update slice radii based on emotion values
    slices
      .transition()
      .duration(500)
      .attr("d", (d) => arc.outerRadius(wheelRadius * Math.min(1, 2 * Math.max(0.1, prosody[index][d.data] ?? 0)))(d));

    // Update labels opacity based on emotion values
    labels.style("opacity", (d) => Math.min(1, 2 * (prosody[index][d.data] ?? 0)));
  });

  // Clicking on the list-group-item highlight the corresponding lines in the transcript
  $app.querySelector(".extracts").addEventListener("click", (e) => {
    const $item = e.target.closest("[data-lines]");
    if (!$item) return;
    e.preventDefault();
    const lines = new Set($item.dataset.lines.split(","));
    $app.querySelectorAll("[data-lines].text-bg-danger").forEach((el) => el.classList.remove("text-bg-danger"));
    $item.classList.toggle("text-bg-danger");
    $app
      .querySelectorAll(".transcript [data-line]")
      .forEach((el) => el.classList.toggle("text-bg-danger", lines.has(el.dataset.line)));
  });
});

const extractionSchema = {
  type: "object",
  properties: {
    symptoms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          lines: {
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
        required: ["name", "lines"],
        additionalProperties: false,
      },
    },
    drugs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          lines: {
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
        required: ["name", "lines"],
        additionalProperties: false,
      },
    },
    diseases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          lines: {
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
        required: ["name", "lines"],
        additionalProperties: false,
      },
    },
  },
  required: ["symptoms", "drugs", "diseases"],
  additionalProperties: false,
};
