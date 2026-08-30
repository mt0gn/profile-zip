import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "dist");
if (dirname(outputRoot) !== projectRoot || outputRoot === projectRoot) throw new Error("Invalid build output path");

const requiredFiles = ["index.html", "styles.css", "pixel-icons.js", "app.js", "src/config.js", "src/persistence.js", "src/output.js", "src/utils.js", "assets/brand-mark.png"];
for (const file of requiredFiles) {
  if (!existsSync(join(projectRoot, file))) throw new Error(`Missing required file: ${file}`);
}

const html = readFileSync(join(projectRoot, "index.html"), "utf8");
const appJs = readFileSync(join(projectRoot, "app.js"), "utf8");
const moduleFiles = ["src/config.js", "src/persistence.js", "src/output.js", "src/utils.js"];
const moduleSources = Object.fromEntries(moduleFiles.map((file) => [file, readFileSync(join(projectRoot, file), "utf8")]));
const js = [appJs, ...Object.values(moduleSources)].join("\n");
const css = readFileSync(join(projectRoot, "styles.css"), "utf8");
const pixelIconsJs = readFileSync(join(projectRoot, "pixel-icons.js"), "utf8");
function validateModuleSyntax(source) {
  const withoutImports = source.replace(/^\s*import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  const withoutExports = withoutImports.replace(/\bexport\s+(?=(?:async\s+)?(?:const|let|var|function|class)\b)/g, "");
  new Function(`return (async () => {\n${withoutExports}\n});`);
}
validateModuleSyntax(appJs);
Object.values(moduleSources).forEach(validateModuleSyntax);
new Function(pixelIconsJs);

const requiredControls = ["themeGrid", "resetLayoutBtn", "ratioSelect", "customSizeControl", "customCanvasWidth", "customCanvasHeight", "applyCustomSizeBtn", "quickEditor", "canvasStage", "customThemePanel", "customPaletteWindow", "customPaletteTitleBar", "customPaletteBorder", "customPaletteText", "customPaletteAccent", "customPaletteShadow", "customPaletteScope", "applyCustomPalette", "previewBtn", "previewOverlay", "previewImage"];
for (const id of requiredControls) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing interface control: #${id}`);
}

const backgroundPaths = [...js.matchAll(/assets\/backgrounds\/[a-z0-9-]+-(?:4x3|1x1|3x4)\.png/g)].map((match) => match[0]);
const uniqueBackgrounds = [...new Set(backgroundPaths)];
if (uniqueBackgrounds.length !== 60) throw new Error(`Expected 60 background variants, found ${uniqueBackgrounds.length}`);
for (const file of uniqueBackgrounds) {
  if (!existsSync(join(projectRoot, file))) throw new Error(`Missing background asset: ${file}`);
}

const approvedThemePalettes = {
  tomato: ["#ee7968", "#afbd74", "#304652"], cake: ["#eaa3bb", "#b34c57", "#36516b"], bathroom: ["#e9aeb6", "#a8d2d7", "#426477"],
  trumpet: ["#e98368", "#cec177", "#2f5152"], gas: ["#e99b63", "#6da9bd", "#344754"], deskbook: ["#c77c45", "#d2b897", "#3d2a26"],
  vinyl: ["#b18c61", "#8ba7ab", "#29251f"], lemon: ["#eacb67", "#a4dfd3", "#3d5c67"], laundromat: ["#ecd083", "#a6c9f2", "#3e696d"],
  sofa: ["#e1dbe2", "#f2e2a6", "#58666b"], tropical: ["#80bca0", "#cbd993", "#234845"], lilypad: ["#779889", "#737db0", "#26384b"],
  mintsea: ["#8fc8c2", "#b4e4cd", "#3d6168"], clifftown: ["#8ca9ee", "#d9c69d", "#304d75"], alley: ["#79aaa8", "#d6b3cf", "#203f45"],
  winter: ["#8baec7", "#c7cee1", "#2d3c40"], flower: ["#9da1cf", "#d2c7e5", "#3d456b"], library: ["#a47b60", "#86b5ca", "#352723"],
  typewriter: ["#bec2c6", "#e9f0f1", "#454b50"], audio: ["#7c8588", "#d3c7ab", "#2c322f"],
};
for (const [themeId, [titleBar, accent, border]] of Object.entries(approvedThemePalettes)) {
  const themeLine = js.split("\n").find((line) => line.includes(`id: "${themeId}"`));
  if (!themeLine?.includes(`titleBar: "${titleBar}"`) || !themeLine.includes(`accent: "${accent}"`) || !themeLine.includes(`border: "${border}"`)) throw new Error(`Theme palette mismatch: ${themeId}`);
}

for (const profileMode of ["profile-card-design", "profile-card-horizontal", "profile-card-vertical"]) {
  if (!css.includes(`.${profileMode}`)) throw new Error(`Missing ID card profile mode: ${profileMode}`);
}
if (!js.includes("PROFILE_CARD_ASPECTS") || !js.includes("fitProfileBoxAspect") || !js.includes("function normalizeStoredBox") || !js.includes("normalizeStoredBox({ x: item.x, y: item.y, w: item.w, h: item.h })") || js.includes("function enforceLiveProfileAspect") || js.includes("enforceLiveProfileAspect(item);") || !js.includes("data-profile-card-layout") || !js.includes("return card;")) throw new Error("Stable fixed-ratio ID card persistence is incomplete");
if (!css.includes("aspect-ratio:7/9") || !js.includes("3.5 × 4.5cm")) throw new Error("Standard ID photo ratio is incomplete");
if (!css.includes("grid-template-columns:28% 2%") || !css.includes("grid-template-rows:minmax(64px,25%)") || !css.includes("grid-template-rows:auto minmax(0,1fr)") || !css.includes("--id-card-section-space:9px") || !css.includes("--id-card-divider-gap:11px") || !css.includes("--id-card-label-gap:3px") || !css.includes("padding-top:var(--id-card-divider-gap)") || !css.includes(".profile-card-horizontal .id-card-name small { display:none; }") || !css.includes(".profile-card-vertical .id-card-name { display:none; }") || !css.includes("grid-column:3; grid-row:2") || !css.includes("writing-mode:horizontal-tb") || !css.includes("grid-column:3; grid-row:3") || !css.includes("grid-row:1/4; align-self:center; justify-self:center") || !css.includes("margin-bottom:var(--design-photo-inset,0px)") || !js.includes("function designPhotoVerticalInset(item)") || !js.includes("--design-photo-inset:${designPhotoVerticalInset(item)}px")) throw new Error("Design ID card box structure is incomplete");
if (js.includes("id-card-stamp") || js.includes("★ ★ ★") || js.includes("id-card-wordmark") || js.includes("VALID FOR THIS LITTLE CORNER OF THE INTERNET") || css.includes('.profile-card-horizontal::after { content:"ID"') || !css.includes(".profile-card-vertical::after") || !css.includes(".id-card-message { min-height:0; overflow:hidden; border-bottom:0 !important; }")) throw new Error("ID card decoration cleanup is incomplete");
if (!css.includes(".id-card-photo { width:min(170px,100%)") || css.includes("width:min(210px,100%)") || !css.includes("--id-card-display-name-size:clamp(25px,18.5cqw,48px)") || !css.includes(".profile-id-card.id-card-name-hangul { --id-card-display-name-size:clamp(23px,16cqw,42px); }") || !css.includes("--vertical-name-strip-width:56px") || !css.includes("padding:30px 0 10px") || css.includes("mask-image:radial-gradient(ellipse 15px 3px") || !css.includes("top:9px; left:50%") || !css.includes("width:44px; height:8px; display:block") || !css.includes("border-radius:999px; background:color-mix(in srgb,var(--item-paper) 74%,var(--item-accent))") || !css.includes("position:absolute; inset:0 0 0 auto; width:var(--vertical-name-strip-width)") || !css.includes("align-items:flex-start; justify-content:center; padding:10px 2px 78px") || !css.includes("left:6px; bottom:0; writing-mode:vertical-rl") || !css.includes("width:min(170px,calc(100% - 24px))") || !css.includes("grid-column:1; grid-row:1; align-self:start; justify-self:center") || !css.includes("grid-column:1; grid-row:2; margin-inline:12px") || !css.includes(".profile-card-vertical .id-card-name { display:none; }") || !css.includes("font-size:var(--id-card-display-name-size); line-height:1.08; letter-spacing:-.075em; color:var(--item-accent)") || !css.includes("padding-top:4.5px") || !css.includes("align-self:start; justify-self:center; margin-top:6px") || !css.includes("font-size:13px") || css.includes("-webkit-line-clamp:2") || !css.includes("white-space:pre-wrap; display:block") || !css.includes("border-bottom:1px solid var(--item-border)") || !js.includes("const nicknameHasHangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/") || !js.includes('nicknameHasHangul ? " id-card-name-hangul" : ""')) throw new Error("Shared ID card content sizing is incomplete");
if (html.includes('data-add-item="photo"') || !html.includes('data-add-item="messenger"') || !html.includes('data-add-item="video"')) throw new Error("Content window picker has not been reorganized");
if (!js.includes("migrateLegacyContentStructure") || !js.includes('item.type === "photo"') || !js.includes('legacyItem.type = "gallery"') || !js.includes('primaryTags.data.slot = "likes"') || !css.includes(".gallery-body.layout-single") || !css.includes(".layout-single .gallery-file small { display:none; }")) throw new Error("Legacy content consolidation is incomplete");
if (js.includes('data-gallery-slot="${index}"') || !js.includes('data-image-field="gallery-slot"') || !js.includes("data-gallery-move") || !js.includes("data-gallery-remove") || !js.includes("setGallerySlotFile") || js.includes('data-image-field="gallery" type="file"') || !js.includes("위의 사진 선택 버튼으로 이 칸에 사진을 넣을 수 있어요.") || !css.includes(".gallery-slot-editors") || !css.includes(".gallery-slot-actions")) throw new Error("Left-panel per-slot gallery editing is incomplete");
if (!js.includes('item.type === "messenger"') || !js.includes('item.type === "video"') || !js.includes('data-image-field="video-main"') || !js.includes('data-image-field="messenger-avatar"') || !css.includes(".messenger-body") || !css.includes(".video-call-body")) throw new Error("Messenger or video call window is incomplete");
if (!css.includes(".video-self-view") || !css.includes("aspect-ratio:3/4") || !css.includes("object-position:center top") || !css.includes(".video-self-view.is-bottom") || !js.includes('data-data-field="selfPosition"') || !js.includes('selfPosition: item.data.selfPosition === "bottom" ? "bottom" : "top"')) throw new Error("Video self-view must keep a portrait 3:4 crop and selectable vertical position");
if (!js.includes("data-message-count") || !js.includes("data-message-field") || !js.includes("messengerMinimumHeight") || !js.includes("messageCount = clamp") || !css.includes(".message-editors")) throw new Error("Expandable messenger conversation is incomplete");
if (!js.includes("항목은 한 줄에 하나씩 입력하세요.") || !js.includes("recent-entry-single") || !css.includes(".recent-body li.recent-entry-single")) throw new Error("Flexible recent-entry input is incomplete");
if (!js.includes("data-tag-section-count") || !js.includes("data-tag-section-field") || !js.includes("data-tag-section-move") || !js.includes("item.data.sections = sections.slice(0, count)") || !js.includes("--tag-section-count:${sections.length}") || !js.includes('.split("\\n")') || !js.includes('tag-line${tags ? "" : " is-empty"}') || !css.includes("grid-template-rows:repeat(var(--tag-section-count,1),minmax(min-content,1fr))") || !css.includes("grid-auto-rows:minmax(32px,max-content)") || !css.includes(".tag-window-body .tag-line.is-empty") || !css.includes("font-size:17px;")) throw new Error("Multi-section tag window is incomplete");
if (!js.includes("data-longform-editor") || !css.includes(".longform-field textarea")) throw new Error("Long-form note editor is incomplete");
if (!js.includes("DECORATION_ASPECTS") || !js.includes("DECORATION_WIDTHS") || !js.includes("fixedDecorationResizeSize") || !js.includes("fitItemBoxAspect(item, recommendedBox") || !js.includes("SYSTEM_DECORATION_PIXELS") || !js.includes('if (item.id === state.selectedItemId)') || js.includes('if (SYSTEM_DECORATION_TYPE_SET.has(item.type)) return { w: item.w, h: item.h, guides: [] }') || !css.includes(".decoration-element") || (html.match(/class="element-preview/g) || []).length !== 15 || html.includes('class="mini-warning">!</i>')) throw new Error("Unified decoration sizing system is incomplete");
if (!js.includes('dialog: Object.freeze({ width: 210, height: 112 })') || !js.includes('function fitFreeDialogBox(box, ratio)') || !js.includes('if (item.type === "dialog") return fitFreeDialogBox(box, ratio)') || !js.includes('DECORATION_TYPES.has(item.type) && item.type !== "dialog"') || !js.includes('if (item.type === "dialog") return { w: 170 / dimensions.width, h: 96 / dimensions.height }') || !js.includes('{ textarea: true, wide: true }') || !css.includes('white-space:normal; overflow-wrap:anywhere')) throw new Error("Free-ratio retro confirmation dialog is incomplete");
if (!js.includes('function applyDecorationPickerPalette(palette)') || !js.includes('document.querySelectorAll(".primary-decoration-grid, .rack-preset-card")') || !js.includes('"--item-paper": palette.window') || !js.includes('"--item-accent": palette.titleBar') || !js.includes('"--item-border": palette.border') || !js.includes('"--item-highlight": palette.accent') || !js.includes('applyDecorationPickerPalette(page.palette)')) throw new Error("Theme-aware decoration picker previews are incomplete");
if (!css.includes('font: 700 12px "Courier New", monospace') || !css.includes('font:800 9px "Courier New",monospace') || !css.includes('font: 10px monospace') || !css.includes('font-size: 14px; line-height: 1.6') || !css.includes('font: 12px monospace') || !css.includes('font:900 13px/1 "Courier New",monospace') || !css.includes('font-size:12px; font-weight:700') || !css.includes('font-size:12px; }') || !css.includes('font:9px monospace')) throw new Error("Readable output typography scale is incomplete");
if (!html.includes('data-add-item="rack"') || !js.includes("RACK_ITEM_KINDS") || !js.includes("data-rack-count") || !js.includes("data-rack-direction") || !js.includes("data-rack-frame") || !js.includes('data-image-field="rack-item"') || !css.includes(".rack-frame-transparent") || !css.includes(".rack-frame-dock") || !css.includes("grid-template-rows:repeat(var(--rack-count)") || !css.includes("grid-template-columns:repeat(var(--rack-count)") || !css.includes("object-fit:contain")) throw new Error("Decoration rack is incomplete");
const decorationPickerButtons = [...html.matchAll(/<button data-add-item="([a-z]+)"/g)].map((match) => match[1]).filter((kind) => ["folder", "file", "imageapp", "videoapp", "camera", "notification", "chat", "appmusic", "paint", "internet", "memory", "trash", "dialog", "warning", "cursor"].includes(kind));
const pixelDecorationKinds = ["folder", "file", "imageapp", "videoapp", "camera", "notification", "chat", "appmusic", "paint", "internet", "memory", "trash"];
const systemDecorationKinds = ["dialog", "warning", "cursor"];
const vectorSymbols = [...html.matchAll(/<symbol id="decor-icon-([a-z]+)" viewBox="0 0 64 64">/g)].map((match) => match[1]);
if (decorationPickerButtons.length !== 15 || new Set(decorationPickerButtons).size !== 15 || decorationPickerButtons.slice(0, 12).join(",") !== pixelDecorationKinds.join(",") || decorationPickerButtons.slice(12).join(",") !== systemDecorationKinds.join(",") || vectorSymbols.join(",") !== systemDecorationKinds.join(",") || !css.includes("grid-template-columns: repeat(3, minmax(0,1fr))") || !js.includes('const PIXEL_DECORATION_TYPES = ["folder", "file", "imageapp", "videoapp", "camera", "notification", "chat", "appmusic", "paint", "internet", "memory", "trash"]') || !js.includes('const RACK_ITEM_KINDS = [...PIXEL_DECORATION_TYPES, "custom"]') || !js.includes('data: { count: 3, direction: "vertical", frame: "dock"') || !js.includes('rack.data.slot = "rack"') || js.includes('const items = [profile, video, gallery, note, music, likes, messenger, recent]') || !js.includes("pixelIconMarkup") || !js.includes("hydratePixelIcons") || !css.includes("shape-rendering") && !js.includes('shape-rendering="crispEdges"') || !css.includes(".pixel-role-main") || !css.includes(".rack-slot > .pixel-icon") || pixelDecorationKinds.some((kind) => !pixelIconsJs.includes(`"${kind}": Object.freeze`)) || pixelIconsJs.includes('"settings": Object.freeze') || pixelIconsJs.includes('"call": Object.freeze')) throw new Error("User-corrected twelve-item pixel decoration system is incomplete");

const layoutSource = js.match(/const HOME_LAYOUTS = (\{[\s\S]*?\n\});/)?.[1];
if (!layoutSource) throw new Error("Recommended layouts are missing");
const recommendedLayouts = new Function(`return (${layoutSource})`)();
const layoutDimensions = { "4:3": [1200, 900], "1:1": [1000, 1000], "3:4": [900, 1200] };
for (const ratio of ["1:1", "4:3"]) {
  if (Math.abs(recommendedLayouts[ratio].profile[0] - recommendedLayouts[ratio].likes[0]) > .0001) throw new Error(`${ratio} profile and tags left edges are not aligned`);
}
const requiredLayoutSlots = ["profile", "gallery", "likes", "messenger", "rack", "music"];
const layoutMinimums = { gallery: [240, 180], messenger: [240, 175], rack: [132, 90], music: [275, 125], likes: [220, 237] };
const recommendedLayoutSafeArea = { minX: .02, maxX: .985, minY: .05, maxY: .97 };
const allowedLayoutOverlaps = new Set(["gallery|messenger", "likes|messenger"]);
for (const [ratio, [canvasWidth, canvasHeight]] of Object.entries(layoutDimensions)) {
  const layout = recommendedLayouts[ratio];
  if (!layout || requiredLayoutSlots.some((slot) => !Array.isArray(layout[slot]))) throw new Error(`Incomplete ${ratio} recommended layout`);
  for (const slot of requiredLayoutSlots) {
    const [x, y, width, height] = layout[slot];
    if ([x, y, width, height].some((value) => !Number.isFinite(value)) || x < recommendedLayoutSafeArea.minX || y < recommendedLayoutSafeArea.minY || x + width > recommendedLayoutSafeArea.maxX || y + height > recommendedLayoutSafeArea.maxY) throw new Error(`${ratio} ${slot} leaves the safe canvas area`);
    const minimum = layoutMinimums[slot];
    if (minimum && (width * canvasWidth < minimum[0] || height * canvasHeight < minimum[1])) throw new Error(`${ratio} ${slot} is too small for its content`);
  }
  for (let leftIndex = 0; leftIndex < requiredLayoutSlots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < requiredLayoutSlots.length; rightIndex += 1) {
      const left = layout[requiredLayoutSlots[leftIndex]], right = layout[requiredLayoutSlots[rightIndex]];
      const overlapWidth = Math.min(left[0] + left[2], right[0] + right[2]) - Math.max(left[0], right[0]);
      const overlapHeight = Math.min(left[1] + left[3], right[1] + right[3]) - Math.max(left[1], right[1]);
      const overlapKey = [requiredLayoutSlots[leftIndex], requiredLayoutSlots[rightIndex]].sort().join("|");
      if (overlapWidth > .001 && overlapHeight > .001) {
        if (!allowedLayoutOverlaps.has(overlapKey)) throw new Error(`${ratio} ${overlapKey} recommended windows overlap`);
        const smallerArea = Math.min(left[2] * left[3], right[2] * right[3]);
        const overlapRatio = overlapWidth * overlapHeight / smallerArea;
        if (overlapRatio > .45) throw new Error(`${ratio} ${overlapKey} collage overlap obscures too much content`);
        continue;
      }
    }
  }
}
const portraitLayout = recommendedLayouts["3:4"];
const portraitTop = Math.min(...requiredLayoutSlots.map((slot) => portraitLayout[slot][1]));
const portraitBottom = Math.max(...requiredLayoutSlots.map((slot) => portraitLayout[slot][1] + portraitLayout[slot][3]));
if (Math.abs(portraitTop - (1 - portraitBottom)) > .03) throw new Error("3:4 recommended layout top and bottom gutters are unbalanced");
if (!js.includes("RECOMMENDED_LAYOUT_REVISION = 21") || !js.includes("CONTENT_STRUCTURE_REVISION = 4") || !js.includes('const items = [profile, gallery, likes, rack, music, messenger]') || !js.includes('ratio: "1:1"') || !js.includes('direction: "vertical", frame: "dock"') || !js.includes('state.ratio === "1:1" ? "vertical" : "horizontal"') || !js.includes("CONTENT_MINIMUM_PIXELS") || !js.includes("RECOMMENDED_WINDOW_STYLE_BY_TYPE") || !js.includes("const messengerIndex = page.items.findIndex") || !css.includes("font-size:11px") || !js.includes("* 29") || !js.includes('if (item.type === "rack") return "rack"') || !js.includes("dialogDecorationMarkup") || !css.includes(".dialog-preview") || !js.includes('heading: "LIKES"') || !js.includes('heading: "HATES"') || !js.includes('count: 2, layout: "row"') || !js.includes('caller: "MY FAVORITE"') || !js.includes('duration: "00:00"') || !css.includes('width:25%; aspect-ratio:3/4') || !css.includes('grid-template-rows:25px minmax(0,1fr)') || !js.includes('dialog: Object.freeze({ width: 210, height: 112 })') || !js.includes('warning: Object.freeze({ width: 80, height: 80 })') || !js.includes('cursor: Object.freeze({ width: 56, height: 56 })') || !html.includes('class="vector-stroke-fill" d="M29 22h6l-1 20h-4Z"') || !css.includes('stroke-width:1.75') || !html.includes('rel="icon" type="image/png" href="assets/brand-mark.png?v=profilezip"')) throw new Error("Ready-to-use collage defaults are incomplete");
if (!js.includes('!["mono-light", "mono-dark", "custom"].includes(page.paletteId)') || !js.includes("function applyCustomPalette()") || !js.includes('page.paletteId = "custom"') || !js.includes('data-palette-color') || !js.includes('page.paletteSourceId = kit.id') || !js.includes('dom.customThemePanel.hidden = bg.source !== "custom" && page.paletteId !== "custom"') || !css.includes(".palette-swatch input") || !css.includes(".custom-theme-colors") || !html.includes("모든 페이지")) throw new Error("Interactive theme palette controls are incomplete");
if (!html.includes('data-ratio="custom"') || !html.includes('id="customCanvasWidth"') || !html.includes('id="customCanvasHeight"') || !js.includes("function applyCustomCanvasSize()") || !js.includes("function ensureCustomLayouts(") || !js.includes("dimensionsForRatio()") || !css.includes(".custom-size-control")) throw new Error("Custom canvas sizing is incomplete");
if (!js.includes("function carryBoxBetweenCanvases(") || !js.includes("function carryPageLayout(") || !js.includes("item.data.cardLayouts[targetRatio] = profileCardLayout(item, sourceRatio)") || !js.includes("item.data.cardLayouts[state.ratio] = DEFAULT_PROFILE_CARD_LAYOUTS[templateRatio()]") || !js.includes("sourceDimensions.width / targetDimensions.width")) throw new Error("Canvas-only ratio switching is incomplete");

function copyTree(source, destination) {
  const sourceStats = lstatSync(source);
  if (!sourceStats.isDirectory()) {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    return;
  }
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    copyTree(join(source, entry.name), join(destination, entry.name));
  }
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
for (const file of ["index.html", "styles.css", "pixel-icons.js", "app.js", "src", "README.md", "assets"]) {
  copyTree(join(projectRoot, file), join(outputRoot, file));
}
writeFileSync(join(outputRoot, "build-info.json"), `${JSON.stringify({ app: "PROFILE.ZIP", version: "3.21.1", backgrounds: 20, backgroundVariants: 60, ratios: 3, recommendedLayoutRevision: 9, contentStructureRevision: 2, readyToUseDefaultLayouts: true, recommendedWindowStyles: { gallery: "slim", note: "slim", music: "clean", tags: "y2k", recent: "outline", messenger: "frameless", video: "slim" }, recommendedLayoutAppliesFrames: true, primaryContentWindows: ["profile", "note", "tags", "gallery"], secondaryContentWindows: ["messenger", "video", "music", "recent"], floatingWindowPair: ["video", "messenger"], controlledFloatingOverlap: "8-20%", defaultReadingOrder: ["profile", "note", "tags", "gallery"], defaultLayoutStyles: { "4:3": "mixed-frame collage", "1:1": "mixed-frame square collage", "3:4": "mixed-frame vertical collage" }, safeDefaultContentBounds: true, defaultContentWindows: 8, contentWindowTypes: ["profile", "gallery", "note", "music", "tags", "recent", "messenger", "video"], legacyContentConsolidation: true, legacySinglePhotoMigration: true, galleryPhotoCount: "1-6", messengerWindow: true, messengerMessages: "2-8", messengerAutoMinimumHeight: true, legacyMessengerMigration: true, videoCallWindow: true, videoSelfPhotoAspect: "3:4", recentEntryDelimiter: "newline", optionalRecentLabelDelimiter: "|", tagSections: "1-4", equalTagSectionRows: false, dynamicTagSectionRows: true, tagLineBreaks: true, minimumTagLinesPerSection: 1, tagFontSize: "17px", legacyTagsMigration: true, decorationTypes: ["folder", "file", "notification", "dialog", "warning", "cursor"], fixedDecorationRatios: true, unifiedDecorationPicker: true, warningMarks: 1, decorationRack: true, decorationRackCount: "2-6", decorationRackDirections: ["vertical", "horizontal"], decorationRackFrames: ["window", "transparent", "dock"], decorationRackCustomImages: true, idCardProfileModes: ["design", "horizontal", "vertical"], fixedCardRatios: { design: "2.5:1", horizontal: "1.68:1", vertical: "2:3" }, idPhotoRatio: "3.5:4.5", unifiedIdPhotoSize: "170x219px", sharedInfoFontSize: "13px", standardCardNicknameSize: "22px", sharedBioLines: 2, decorativeFooter: false, designCardStructure: "photo-left/name-top-right/horizontal-band/compact-info-bottom-right", verticalAccentBand: true, circularStarDecoration: false, starDecoration: false, horizontalWatermark: false }, null, 2)}\n`);
const buildInfoPath = join(outputRoot, "build-info.json");
const buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf8"));
if (!js.includes("editingPageId") || !js.includes("MAX_PAGE_NAME_LENGTH = 24") || !js.includes('input.className = "page-name-input"') || !js.includes('button.addEventListener("dblclick"') || !css.includes(".page-name-input")) throw new Error("Inline page naming is incomplete");
buildInfo.version = "3.37.0";
buildInfo.ratios = 4;
buildInfo.customCanvasSize = { min: 480, max: 2000, exportScale: 2 };
buildInfo.customCanvasLayout = "pixel-size-preserving canvas expansion";
buildInfo.ratioSwitchPolicy = "preserve module pixel size, position, and window/profile frame";
buildInfo.recommendedLayoutPolicy = "recommended arrangement alone applies ratio-specific profile frames and positions";
buildInfo.customCanvasBackground = "nearest preset-ratio background variant";
buildInfo.recommendedLayoutRevision = 19;
buildInfo.contentStructureRevision = 4;
buildInfo.floatingWindowPair = ["messenger", "gallery", "music"];
buildInfo.controlledFloatingOverlap = "user-authored ratio-specific collage overlap";
buildInfo.recommendedLayoutSafeArea = "user-authored composition";
delete buildInfo.recommendedLayoutMinimumGutter;
buildInfo.videoRecommendedMinimumHeight = "260px";
buildInfo.messengerBubbleFontSize = "12px";
buildInfo.outputTypographyScale = { windowTitle: "12px", idCardLabel: "9px", galleryCaption: "10px", noteBody: "14px", tagText: "17px", messengerBubble: "12px", musicArtist: "12px", videoName: "12px", videoStatus: "9px" };
buildInfo.tagFontSize = "17px";
buildInfo.tagEntryDelimiters = { nextTag: "comma", nextLine: "newline" };
buildInfo.messengerLayer = "front";
buildInfo.alignmentPolicy = "preserve user-authored composition; align compatible edges and gaps";
buildInfo.defaultLayoutNotes = { "4:3": "right column and lower-left edges aligned", "1:1": "right column endings aligned", "3:4": "top row and middle-column anchors aligned" };
buildInfo.customPhotoBackgroundPalette = true;
buildInfo.customPaletteColors = ["window", "titleBar", "border", "text", "accent", "shadow"];
buildInfo.customPaletteScopes = ["current page", "all pages"];
buildInfo.customPaletteBulkApply = true;
buildInfo.directPaletteSwatchEditing = ["window", "titleBar", "accent"];
buildInfo.themeAccentStrategy = "user-approved colors sampled from each wallpaper";
buildInfo.resizableSystemProps = ["dialog", "warning", "cursor"];
buildInfo.defaultContentWindows = 6;
buildInfo.defaultRatio = "1:1";
buildInfo.defaultContentTypes = ["profile", "gallery", "tags", "messenger", "rack", "music"];
buildInfo.optionalContentTypes = ["note", "video"];
buildInfo.galleryUploadEntry = "left editor slot controls only";
buildInfo.optionalRecentWindow = true;
buildInfo.defaultDecorationDock = ["folder", "file", "memory"];
buildInfo.decorationPickerColumns = 3;
buildInfo.decorationPickerItems = 15;
buildInfo.pixelDecorationTypes = pixelDecorationKinds;
buildInfo.pixelDecorationStyle = "user-corrected 32x32 crisp-edge pixel SVG paths with theme color roles";
buildInfo.decorationPixelSystem = "inline 32x32 SVG path sprite data";
buildInfo.decorationPixelPaletteRoles = ["paper", "main", "outline", "point", "shadow"];
buildInfo.decorationVisualLanguage = "user-authored retro pixel desktop glyphs";
buildInfo.decorationOpticalSizing = "shared 32x32 cell with nearest-neighbor geometry";
buildInfo.systemDecorationTypes = systemDecorationKinds;
buildInfo.systemDecorationsInRack = false;
buildInfo.systemDecorationSizing = "free-ratio dialog; proportional warning and cursor";
buildInfo.systemDecorationSizes = { dialog: "210x112 default; 170x96 minimum", warning: "80x80 default", cursor: "56x56 default" };
buildInfo.systemDecorationInteraction = "dialog moves and resizes freely; warning and cursor move and resize proportionally";
buildInfo.freeRatioSystemProps = ["dialog"];
buildInfo.proportionalSystemProps = ["warning", "cursor"];
buildInfo.dialogTextWrapping = true;
buildInfo.decorationPickerThemeSync = ["window", "titleBar", "border", "accent", "shadow"];
buildInfo.decorationPickerPriority = { primary: pixelDecorationKinds, secondary: systemDecorationKinds };
buildInfo.dialogIconStyle = "minimal OK-only picker preview; canvas design retained for later review";
buildInfo.musicIconOutline = true;
buildInfo.preview = { exactPngPipeline: true, backdrops: ["dark", "light"], fullscreen: true };
buildInfo.pngExport = { fixedScale: 2, dimensions: { "4:3": "2400x1800", "1:1": "2000x2000", "3:4": "1800x2400" } };
buildInfo.pngExport.dimensions.custom = "custom width x2 × custom height x2";
buildInfo.autosave = { primary: "IndexedDB", fallback: "localStorage", visibleFailureNotice: true };
buildInfo.codeStructure = ["config", "persistence", "output", "utils", "editor-entry"];
writeFileSync(buildInfoPath, `${JSON.stringify(buildInfo, null, 2)}\n`);

console.log(`PROFILE.ZIP build complete: ${relative(projectRoot, outputRoot)}`);
console.log("Verified: 20 backgrounds · 3 preset layouts + custom canvas · 6 default content windows · 12 pixel decorations · 3 system props · 3 ID card designs");

