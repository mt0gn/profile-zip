import { fileToDataUrl } from "./utils.js";

let stylesheetPromise;

function getStylesheetText(url) {
  stylesheetPromise ||= fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.text();
  });
  return stylesheetPromise;
}

async function inlineImages(root) {
  await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
    if (!image.src || image.src.startsWith("data:")) return;
    const response = await fetch(image.src);
    if (!response.ok) throw new Error(`Could not load image: ${image.src}`);
    image.src = await fileToDataUrl(await response.blob());
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${dimensions.width} ${dimensions.height}"><foreignObject width="${dimensions.width}" height="${dimensions.height}">${serialized}</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, outputWidth, outputHeight);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}
