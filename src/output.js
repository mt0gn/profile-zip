import { fileToDataUrl } from "./utils.js";

let stylesheetPromise;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode an image for PNG export"));
    image.src = src;
  });
}

function getStylesheetText(url) {
  stylesheetPromise ||= fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.text();
  });
  return stylesheetPromise;
}

function drawObjectFit(context, image, width, height, fit) {
  if (fit === "fill") {
    context.drawImage(image, 0, 0, width, height);
    return;
  }

  const scale = fit === "contain"
    ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
    : Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

async function rasterizeCanvasBackground(image, dimensions) {
  const source = await loadImage(image.src);
  const width = Math.max(1, Math.ceil(dimensions.width + 32));
  const height = Math.max(1, Math.ceil(dimensions.height + 32));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the background canvas for PNG export");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawObjectFit(context, source, width, height, image.style.objectFit || "cover");

  image.src = canvas.toDataURL("image/png");
  await loadImage(image.src);
}

async function inlineImages(root, dimensions) {
  await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
    if (!image.src) return;
    if (!image.src.startsWith("data:")) {
      const response = await fetch(image.src);
      if (!response.ok) throw new Error(`Could not load image: ${image.src}`);
      image.src = await fileToDataUrl(await response.blob());
    }
    await loadImage(image.src);
    if (image.classList.contains("canvas-background")) {
      await rasterizeCanvasBackground(image, dimensions);
    }
  }));
}

export async function renderElementToPngBlob({
  element,
  dimensions,
  scale = 2,
  stylesheetUrl = "styles.css",
}) {
  const copy = element.cloneNode(true);
  copy.style.zoom = "1";
  copy.style.transform = "none";
  copy.style.width = `${dimensions.width}px`;
  copy.style.height = `${dimensions.height}px`;
  copy.style.margin = "0";
  copy.querySelectorAll(".resize-handle, .smart-guide").forEach((node) => node.remove());
  await inlineImages(copy, dimensions);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const style = document.createElement("style");
  style.textContent = await getStylesheetText(stylesheetUrl);
  wrapper.append(style, copy);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const outputWidth = dimensions.width * scale;
  const outputHeight = dimensions.height * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}"><foreignObject width="${dimensions.width}" height="${dimensions.height}">${serialized}</foreignObject></svg>`;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the PNG export canvas");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, outputWidth, outputHeight);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode the PNG export"));
      }, "image/png", 1);
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
