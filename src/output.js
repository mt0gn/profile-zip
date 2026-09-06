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

function drawObjectFit(context, image, x, y, width, height, fit) {
  if (fit === "fill") {
    context.drawImage(image, x, y, width, height);
    return;
  }

  const scale = fit === "contain"
    ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
    : Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

async function safeImageSource(src) {
  if (!src || src.startsWith("data:")) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Could not load image: ${src}`);
  return fileToDataUrl(await response.blob());
}

function dataUrlToBlob(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) throw new Error("Invalid PNG data URL");
  const header = dataUrl.slice(0, commaIndex);
  const encoded = dataUrl.slice(commaIndex + 1);
  const mimeType = /^data:([^;,]+)/.exec(header)?.[1] || "image/png";
  const binary = header.includes(";base64") ? atob(encoded) : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    const fallback = () => {
      try {
        resolve(dataUrlToBlob(canvas.toDataURL("image/png")));
      } catch (error) {
        reject(error);
      }
    };

    if (typeof canvas.toBlob !== "function") {
      fallback();
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else fallback();
      }, "image/png");
    } catch {
      fallback();
    }
  });
}

async function inlineImages(root) {
  await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
    if (!image.src) return;
    image.src = await safeImageSource(image.src);
    await loadImage(image.src);
  }));
}

async function drawStageBackground(context, element, dimensions, scale) {
  const computed = getComputedStyle(element);
  const backgroundColor = computed.backgroundColor;
  context.save();
  context.setTransform(scale, 0, 0, scale, 0, 0);
  if (backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)" && backgroundColor !== "transparent") {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, dimensions.width, dimensions.height);
  }

  const background = element.querySelector(":scope > .canvas-background");
  if (background?.src) {
    const source = await loadImage(await safeImageSource(background.src));
    context.filter = background.style.filter || getComputedStyle(background).filter || "none";
    // The live canvas deliberately overdraws the wallpaper by 16px so blur never
    // exposes a hard edge. Reproduce that logical rectangle before clipping it to
    // the export canvas instead of embedding the wallpaper in foreignObject SVG.
    drawObjectFit(
      context,
      source,
      -16,
      -16,
      dimensions.width + 32,
      dimensions.height + 32,
      background.style.objectFit || getComputedStyle(background).objectFit || "cover",
    );
  }
  context.restore();
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
  // Wallpapers are painted directly onto the target canvas. Keeping them inside
  // foreignObject is unreliable on iOS/iPadOS and can taint Chromium canvases.
  copy.querySelector(":scope > .canvas-background")?.remove();
  copy.style.background = "transparent";
  copy.querySelectorAll(".resize-handle, .smart-guide").forEach((node) => node.remove());
  await inlineImages(copy);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const style = document.createElement("style");
  style.textContent = await getStylesheetText(stylesheetUrl);
  wrapper.append(style, copy);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const outputWidth = dimensions.width * scale;
  const outputHeight = dimensions.height * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}"><foreignObject width="${dimensions.width}" height="${dimensions.height}">${serialized}</foreignObject></svg>`;
  // Loading a foreignObject SVG through a blob: URL taints Chromium's canvas,
  // even when every nested image is already same-origin or inlined. A base64
  // data URL keeps the export origin-clean and is also handled consistently by
  // desktop Chromium and mobile Safari.
  const svgDataUrl = await fileToDataUrl(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const image = await loadImage(svgDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the PNG export canvas");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  await drawStageBackground(context, element, dimensions, scale);
  context.drawImage(image, 0, 0, outputWidth, outputHeight);

  return canvasToPngBlob(canvas);
}
