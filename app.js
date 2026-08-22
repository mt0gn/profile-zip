/* PROFILE.ZIP — simple, dependency-free retro profile editor */

import {
  BACKGROUND_THEMES,
  CONTENT_MINIMUM_PIXELS,
  CONTENT_STRUCTURE_REVISION,
  DECORATION_ASPECTS,
  DECORATION_TYPES,
  DECORATION_WIDTHS,
  DEFAULT_PROFILE_CARD_LAYOUTS,
  DEFAULT_WINDOW_STYLE_BY_TYPE,
  EXPORT_SCALE,
  HOME_LAYOUTS,
  MAX_HISTORY,
  PALETTE_KITS,
  PIXEL_DECORATION_TYPES,
  PROFILE_CARD_ASPECTS,
  PROFILE_CARD_LAYOUTS,
  RACK_ITEM_KINDS,
  RATIO_DIMENSIONS,
  RECOMMENDED_LAYOUT_REVISION,
  RECOMMENDED_WINDOW_STYLE_BY_TYPE,
  SMART_GUIDE_PX,
  SMART_MARGIN_SNAP_PX,
  SMART_SNAP_PX,
  STORAGE_KEY,
  SYSTEM_DECORATION_PIXELS,
  SYSTEM_DECORATION_TYPE_SET,
  SYSTEM_DECORATION_TYPES,
  VECTOR_DECORATION_TYPES,
  WINDOWED_TYPES,
  WINDOW_STYLES,
} from "./src/config.js";
import { clearAutosave, restoreAutosave, saveAutosave } from "./src/persistence.js";
import { renderElementToPngBlob } from "./src/output.js";
import { clamp, clone, downloadBlob, escapeHtml, fileToDataUrl } from "./src/utils.js";

let idCounter = Date.now();
let state;
let undoStack = [];
let redoStack = [];
let transactionSnapshot = null;
let toastTimer;
let toolboxEditMode = false;
let windowDesignEditorOpen = false;
let activeGuides = [];
let editingPageId = null;
const MAX_PAGE_NAME_LENGTH = 24;

const byId = (id) => document.getElementById(id);
const makeId = (prefix) => `${prefix}-${(++idCounter).toString(36)}`;

const dom = {
  ratioSelect: byId("ratioSelect"), undoBtn: byId("undoBtn"), redoBtn: byId("redoBtn"),
  saveProjectBtn: byId("saveProjectBtn"), loadProjectBtn: byId("loadProjectBtn"), previewBtn: byId("previewBtn"), exportPngBtn: byId("exportPngBtn"), projectFileInput: byId("projectFileInput"),
  themeGrid: byId("themeGrid"), themeCount: byId("themeCount"), paletteGrid: byId("paletteGrid"),
  backgroundUpload: byId("backgroundUpload"), backgroundFit: byId("backgroundFit"),
  customThemePanel: byId("customThemePanel"), customPaletteWindow: byId("customPaletteWindow"), customPaletteTitleBar: byId("customPaletteTitleBar"),
  customPaletteBorder: byId("customPaletteBorder"), customPaletteText: byId("customPaletteText"), customPaletteAccent: byId("customPaletteAccent"),
  customPaletteShadow: byId("customPaletteShadow"), customPaletteScope: byId("customPaletteScope"), applyCustomPalette: byId("applyCustomPalette"),
  backgroundBlur: byId("backgroundBlur"), blurOutput: byId("blurOutput"), backgroundBrightness: byId("backgroundBrightness"), brightnessOutput: byId("brightnessOutput"),
  overlayColor: byId("overlayColor"), overlayOpacity: byId("overlayOpacity"), overlayOutput: byId("overlayOutput"),
  frameEnabled: byId("frameEnabled"), frameTopText: byId("frameTopText"), frameMenuText: byId("frameMenuText"), frameBottomText: byId("frameBottomText"), frameTextColor: byId("frameTextColor"), frameScope: byId("frameScope"),
  pageTabs: byId("pageTabs"), addPageBtn: byId("addPageBtn"), duplicatePageBtn: byId("duplicatePageBtn"), deletePageBtn: byId("deletePageBtn"),
  zoomRange: byId("zoomRange"), zoomOutput: byId("zoomOutput"), canvasStage: byId("canvasStage"), selectionBreadcrumb: byId("selectionBreadcrumb"),
  toolbox: byId("toolbox"), toolboxTitle: byId("toolboxTitle"), toolboxChrome: byId("toolboxChrome"), contextualEditor: byId("contextualEditor"), contextEditorBack: byId("contextEditorBack"), quickEditor: byId("quickEditor"), defaultWindowStyleGrid: byId("defaultWindowStyleGrid"), toast: byId("toast"),
  freeArrangeBtn: byId("freeArrangeBtn"), alignedArrangeBtn: byId("alignedArrangeBtn"), resetLayoutBtn: byId("resetLayoutBtn"),
  backgroundFitRow: byId("backgroundFitRow"),
  previewOverlay: byId("previewOverlay"), previewImage: byId("previewImage"), previewStatus: byId("previewStatus"), previewCloseBtn: byId("previewCloseBtn"),
};

function currentTheme() { return BACKGROUND_THEMES.find((theme) => theme.id === currentPage().background.themeId) || BACKGROUND_THEMES[0]; }
function currentPage() { return state.pages.find((page) => page.id === state.currentPageId) || state.pages[0]; }
function selectedItem() { return currentPage().items.find((item) => item.id === state.selectedItemId) || null; }

function backgroundPreset(themeId = "alley") {
  const theme = BACKGROUND_THEMES.find((entry) => entry.id === themeId) || BACKGROUND_THEMES[0];
  return { source: "theme", themeId: theme.id, customUrl: "", color: "#0e244a", fit: "cover", ...theme.defaults };
}

function itemPreset(type, offset = 0) {
  const base = { id: makeId("item"), type, x: .1 + offset, y: .14 + offset, w: .3, h: .25, layouts: {}, title: "WINDOW", textColor: "", paperColor: "", accentColor: "", borderColor: "", highlightColor: "", windowStyle: "inherit", data: {} };
  const presets = {
    profile: { w: .43, h: .34, title: "MY ID CARD", data: { image: "", imageTransform: defaultImageTransform(), nickname: "NICKNAME", handle: "@your_id", bio: "안녕하세요! 이곳에 짧은 자기소개를 적어주세요.", cardLayouts: clone(DEFAULT_PROFILE_CARD_LAYOUTS) } },
    gallery: { w: .42, h: .42, title: "MY PICTURES", data: { images: [], imageTransforms: [], count: 2, layout: "row", filenames: "mypictures01.jpg, mypictures02.jpg" } },
    note: { w: .35, h: .29, title: "ABOUT.TXT", data: { heading: "HELLO, WORLD!", body: "좋아하는 것과 나에 대한 이야기를 자유롭게 적어주세요.\n문장은 여러 줄로 입력할 수 있어요." } },
    music: { w: .35, h: .21, title: "MUSIC PLAYER", data: { song: "A SONG FOR YOU", artist: "YOUR ARTIST" } },
    tags: { w: .30, h: .16, title: "TAGS", data: { slot: "likes", tags: "태그를 입력해 주세요", sections: [{ heading: "LIKES", tags: "태그를 입력해 주세요" }, { heading: "HATES", tags: "쉼표로 구분해 주세요" }] } },
    recent: { w: .32, h: .18, title: "RECENT LOG", data: { slot: "recent", entries: "요즘 듣는 음악\n사진 정리\n프로필 업데이트" } },
    messenger: { w: .30, h: .24, title: "MESSENGER", data: { contact: "MY FAVORITE", status: "online now", messageCount: 4, messages: [{ side: "incoming", text: "이곳에 대화를 입력해 주세요." }, { side: "outgoing", text: "이곳에 대화를 입력해 주세요." }, { side: "incoming", text: "이곳에 대화를 입력해 주세요." }, { side: "outgoing", text: "이곳에 대화를 입력해 주세요." }], avatar: "", avatarTransform: defaultImageTransform() } },
    video: { w: .32, h: .25, title: "VIDEO CALL", data: { caller: "MY FAVORITE", status: "connected", duration: "00:00", mainImage: "", mainImageTransform: defaultImageTransform(), selfImage: "", selfImageTransform: defaultImageTransform(), selfPosition: "top" } },
    rack: { w: .14, h: .24, title: "APP DOCK", data: { count: 3, direction: "vertical", frame: "dock", items: [{ kind: "folder", label: "folder", image: "" }, { kind: "file", label: "document", image: "" }, { kind: "memory", label: "memory", image: "" }] } },
    folder: { w: .10, h: .10, title: "FOLDER", data: { label: "my files" } },
    file: { w: .10, h: .10, title: "FILE", data: { label: "profile.txt" } },
    notification: { w: .10, h: .10, title: "NOTIFICATION", data: { heading: "unread emails", detail: "199 emails" } },
    dialog: { w: .18, h: .12, title: "Error", data: { message: "Fail", button: "OK" } },
    warning: { w: .10, h: .10, title: "WARNING", data: {} },
    cursor: { w: .10, h: .10, title: "CURSOR", data: {} },
    imageapp: { w: .10, h: .10, title: "IMAGE", data: { label: "image" } },
    videoapp: { w: .10, h: .10, title: "VIDEO", data: { label: "video" } },
    chat: { w: .10, h: .10, title: "CHAT", data: { label: "chat" } },
    camera: { w: .10, h: .10, title: "CAMERA", data: { label: "camera" } },
    appmusic: { w: .10, h: .10, title: "MUSIC APP", data: { label: "music" } },
    paint: { w: .10, h: .10, title: "PAINT", data: { label: "paint" } },
    internet: { w: .10, h: .10, title: "INTERNET", data: { label: "internet" } },
    memory: { w: .10, h: .10, title: "MEMORY", data: { label: "memory" } },
    trash: { w: .10, h: .10, title: "TRASH", data: { label: "trash" } },
  };
  return { ...base, ...(presets[type] || {}) };
}

function itemSlot(item) {
  if (item.type === "tags") return "likes";
  if (item.type === "rack") return "rack";
  return item.data?.slot || item.type;
}
function boxFromArray(values) { return { x: values[0], y: values[1], w: values[2], h: values[3] }; }
function fallbackBox(item, ratio, index = 0) {
  const dimensions = RATIO_DIMENSIONS[ratio];
  if (item.type === "rack") {
    const vertical = item.data?.direction !== "horizontal";
    return vertical ? { x: .78, y: .18, w: .16, h: .48 } : { x: .22, y: .79, w: .58, h: .14 };
  }
  if (SYSTEM_DECORATION_TYPE_SET.has(item.type)) {
    const size = SYSTEM_DECORATION_PIXELS[item.type];
    return { x: .08 + (index % 4) * .035, y: .12 + (index % 6) * .045, w: size.width / dimensions.width, h: size.height / dimensions.height };
  }
  if (DECORATION_TYPES.has(item.type)) {
    const w = DECORATION_WIDTHS[item.type];
    const h = w / decorationNormalizedAspect(item.type, ratio);
    return { x: .08 + (index % 4) * .035, y: .12 + (index % 6) * .045, w, h };
  }
  const width = ratio === "3:4" ? .42 : .30;
  const height = Math.min(.22, width * dimensions.width / dimensions.height * .72);
  return { x: .08 + (index % 3) * .045, y: .12 + (index % 5) * .05, w: width, h: height };
}
function recommendedBox(item, ratio, index = 0) {
  const values = HOME_LAYOUTS[ratio]?.[itemSlot(item)];
  const box = values ? boxFromArray(values) : fallbackBox(item, ratio, index);
  if (item.type === "tags") {
    const count = clamp(item.data?.sections?.length || 1, 1, 4);
    const minimumHeight = clamp((45 + count * 48) / RATIO_DIMENSIONS[ratio].height, .10, .45);
    if (box.h < minimumHeight) {
      box.h = minimumHeight;
      box.y = clamp(box.y, 0, 1 - box.h);
    }
  }
  if (item.type === "messenger") return fitMessengerBoxToMessages(item, box, ratio);
  return box;
}
function initializeItemLayouts(item, index = 0) {
  item.layouts ||= {};
  Object.keys(RATIO_DIMENSIONS).forEach((ratio) => {
    item.layouts[ratio] = fitItemBoxAspect(item, item.layouts[ratio] || recommendedBox(item, ratio, index), ratio);
  });
  return item;
}
function syncCurrentLayout(page = currentPage(), ratio = state?.ratio || "4:3") {
  page?.items?.forEach((item) => {
    item.layouts ||= {};
    item.layouts[ratio] = fitItemBoxAspect(item, { x: item.x, y: item.y, w: item.w, h: item.h }, ratio);
  });
}
function applyRatioLayout(page = currentPage(), ratio = state.ratio) {
  page.items.forEach((item, index) => {
    initializeItemLayouts(item, index);
    let box = clone(item.layouts[ratio] || recommendedBox(item, ratio, index));
    if (item.type === "messenger") {
      box = fitMessengerBoxToMessages(item, box, ratio);
      item.layouts[ratio] = clone(box);
    }
    Object.assign(item, clone(box));
  });
}

function defaultPage(index = 1) {
  const profile = itemPreset("profile"); profile.data.slot = "profile";
  const gallery = itemPreset("gallery"); gallery.data.slot = "gallery";
  const music = itemPreset("music"); music.data.slot = "music";
  const likes = itemPreset("tags"); likes.data.slot = "likes"; likes.title = "TAGS";
  const messenger = itemPreset("messenger"); messenger.data.slot = "messenger";
  const rack = itemPreset("rack"); rack.data.slot = "rack";
  const items = [profile, gallery, likes, rack, music, messenger];
  items.forEach((item) => { if (DEFAULT_WINDOW_STYLE_BY_TYPE[item.type]) item.windowStyle = DEFAULT_WINDOW_STYLE_BY_TYPE[item.type]; });
  items.forEach(initializeItemLayouts);
  items.forEach((item) => Object.assign(item, clone(item.layouts["1:1"])));
  return {
    id: makeId("page"), name: `PAGE ${String(index).padStart(2, "0")}`,
    background: backgroundPreset("alley"), paletteId: "theme-alley", palette: clone(BACKGROUND_THEMES.find((theme) => theme.id === "alley").palette),
    frame: { enabled: true, preset: "web", topText: "hey welcome to my page! hope you have a lovely day", menuText: "home / profile / gallery / archive", bottomText: `made with PROFILE.ZIP · page ${String(index).padStart(2, "0")}`, textColor: "#173b39" },
    defaultWindowStyle: "slim",
    recommendedLayoutRevision: RECOMMENDED_LAYOUT_REVISION,
    contentStructureRevision: CONTENT_STRUCTURE_REVISION,
    arrangementMode: "aligned",
    items,
  };
}

function freshState() { const page = defaultPage(); return { version: 3, ratio: "1:1", zoom: 70, currentPageId: page.id, selectedItemId: null, pages: [page] }; }

function beginTransaction() { if (!transactionSnapshot) transactionSnapshot = clone(state); }
function commitTransaction() {
  if (!transactionSnapshot) return;
  if (JSON.stringify(transactionSnapshot) !== JSON.stringify(state)) {
    undoStack.push(transactionSnapshot); if (undoStack.length > MAX_HISTORY) undoStack.shift(); redoStack = []; scheduleAutosave();
  }
  transactionSnapshot = null; updateUndoButtons();
}
function mutate(fn) { beginTransaction(); fn(); commitTransaction(); renderAll(); }
function undo() { if (!undoStack.length) return; redoStack.push(clone(state)); state = undoStack.pop(); transactionSnapshot = null; renderAll(); scheduleAutosave(); }
function redo() { if (!redoStack.length) return; undoStack.push(clone(state)); state = redoStack.pop(); transactionSnapshot = null; renderAll(); scheduleAutosave(); }
function updateUndoButtons() { dom.undoBtn.disabled = !undoStack.length; dom.redoBtn.disabled = !redoStack.length; }

function showToast(message) { clearTimeout(toastTimer); dom.toast.textContent = message; dom.toast.classList.add("is-visible"); toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2200); }

let autosaveTimer;
let autosaveFailureShown = false;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    try {
      syncCurrentLayout();
      await saveAutosave(clone(state), STORAGE_KEY);
      autosaveFailureShown = false;
    } catch (error) {
      console.warn("Autosave skipped", error);
      if (!autosaveFailureShown) {
        autosaveFailureShown = true;
        showToast("자동 저장에 실패했습니다. 프로젝트 파일로 저장해 주세요.");
      }
    }
  }, 400);
}

function tagSectionsFromItem(item) {
  const legacyHeading = String(item.title || "TAGS").toUpperCase().replace(/S$/, "") || "TAGS";
  if (Array.isArray(item.data?.sections) && item.data.sections.length) {
    return item.data.sections.map((section, index) => ({
      heading: String(section?.heading || `SECTION ${index + 1}`),
      tags: String(section?.tags || ""),
    }));
  }
  return [{ heading: legacyHeading, tags: String(item.data?.tags || "") }];
}

function isUntouchedDefaultNote(item) {
  return item.type === "note"
    && item.data?.heading === "HELLO, WORLD!"
    && item.data?.body === "좋아하는 것과 나에 대한 이야기를 자유롭게 적어주세요.\n문장은 여러 줄로 입력할 수 있어요.";
}

function isUntouchedDefaultVideo(item) {
  return item.type === "video"
    && !item.data?.mainImage
    && !item.data?.selfImage
    && (item.data?.caller || "MY FAVORITE") === "MY FAVORITE"
    && (item.data?.status || "connected") === "connected"
    && (item.data?.duration || "00:00") === "00:00";
}

function migrateRecommendedCoreContent(page) {
  const coreTypes = ["profile", "gallery", "tags", "messenger", "music", "rack"];
  const hasRecommendedCore = coreTypes.every((type) => page.items.some((item) => item.type === type));
  if (!hasRecommendedCore) return;

  // The former starter page included both of these placeholder windows. Keep any
  // window the user has actually edited, but remove untouched starter copies.
  page.items = page.items.filter((item) => !isUntouchedDefaultNote(item) && !isUntouchedDefaultVideo(item));
  page.items.filter((item) => item.type === "tags").forEach((item) => {
    if (!Array.isArray(item.data?.sections) || item.data.sections.length <= 2) return;
    const extrasAreGeneratedAndEmpty = item.data.sections.slice(2).every((section, index) => {
      const heading = String(section?.heading || "").trim();
      const tags = String(section?.tags || "").trim();
      return !tags && (!heading || heading.toUpperCase() === `SECTION ${index + 3}`);
    });
    if (extrasAreGeneratedAndEmpty) item.data.sections = item.data.sections.slice(0, 2);
  });
}

function migrateLegacyContentStructure(page) {
  page.items ||= [];
  if ((page.contentStructureRevision || 0) >= CONTENT_STRUCTURE_REVISION) return;

  const legacyTypes = new Set(page.items.map((item) => item.type === "photo" ? "gallery" : item.type));
  const looksLikeDefaultHome = ["profile", "gallery", "note", "music", "tags", "recent"]
    .filter((type) => legacyTypes.has(type)).length >= 5;

  const photoLikeItems = page.items.filter((item) => item.type === "photo" || (item.type === "gallery" && item.data?.slot === "photo"));
  let mainGallery = page.items.find((item) => item.type === "gallery" && item.data?.slot !== "photo");
  photoLikeItems.forEach((legacyItem) => {
    const incomingImages = legacyItem.type === "photo"
      ? [legacyItem.data?.image].filter(Boolean)
      : (Array.isArray(legacyItem.data?.images) ? legacyItem.data.images : []);
    if (!mainGallery) {
      legacyItem.type = "gallery";
      legacyItem.title = legacyItem.title === "PHOTO VIEWER" ? "MY PICTURES" : legacyItem.title;
      legacyItem.data = {
        slot: "gallery", images: incomingImages.slice(0, 6), count: clamp(incomingImages.length || 1, 1, 6),
        layout: incomingImages.length > 1 ? "grid" : "single", filenames: legacyItem.data?.filenames || "photo.jpg",
      };
      mainGallery = legacyItem;
    } else if (legacyItem !== mainGallery) {
      mainGallery.data ||= {};
      mainGallery.data.images = [...incomingImages, ...(mainGallery.data.images || [])].filter(Boolean).slice(0, 6);
      mainGallery.data.count = clamp(Math.max(Number(mainGallery.data.count) || 1, mainGallery.data.images.length || 1), 1, 6);
      page.items = page.items.filter((item) => item !== legacyItem);
    }
  });

  const tagItems = page.items.filter((item) => item.type === "tags");
  if (tagItems.length) {
    const primaryTags = tagItems.find((item) => item.data?.slot === "likes") || tagItems[0];
    const mergedSections = tagItems.flatMap(tagSectionsFromItem).slice(0, 4);
    primaryTags.data ||= {};
    primaryTags.data.slot = "likes";
    primaryTags.data.sections = mergedSections.length ? mergedSections : [{ heading: "LIKE", tags: "" }];
    primaryTags.data.tags = primaryTags.data.sections[0].tags;
    page.items = page.items.filter((item) => item.type !== "tags" || item === primaryTags);
  }

  if (looksLikeDefaultHome) {
    ["video", "messenger"].forEach((type) => {
      if (page.items.some((item) => item.type === type)) return;
      const item = itemPreset(type);
      item.data.slot = type;
      item.windowStyle = DEFAULT_WINDOW_STYLE_BY_TYPE[type];
      page.items.push(item);
    });
  }

  migrateRecommendedCoreContent(page);

  page.contentStructureRevision = CONTENT_STRUCTURE_REVISION;
}

function normalizeState(saved) {
  saved.version = 3;
  saved.pages.forEach((page) => {
    let migratedProfileCard = false;
    migrateLegacyContentStructure(page);
    const theme = BACKGROUND_THEMES.find((entry) => entry.id === page.background?.themeId) || BACKGROUND_THEMES.find((entry) => entry.id === "alley");
    page.background ||= backgroundPreset(theme.id);
    page.background.themeId ||= theme.id;
    page.background.overlayOpacity = clamp(Number(page.background.overlayOpacity) || 0, 0, 100);
    if (!["mono-light", "mono-dark", "custom"].includes(page.paletteId)) {
      page.paletteId = `theme-${theme.id}`;
      page.palette = clone(theme.palette);
    }
    if (!WINDOW_STYLES.some((style) => style.id === page.defaultWindowStyle)) page.defaultWindowStyle = "slim";
    if (!["free", "aligned"].includes(page.arrangementMode)) page.arrangementMode = "aligned";
    page.frame.textColor ||= page.palette?.border || "#222222";
    page.items.forEach((item, index) => {
      const legacyDecorationTypes = {
        heart: { type: "memory", title: "MEMORY", label: "memory" }, settings: { type: "memory", title: "MEMORY", label: "memory" },
        movie: { type: "videoapp", title: "VIDEO", label: "video" }, call: { type: "videoapp", title: "VIDEO", label: "video" },
        globe: { type: "internet", title: "INTERNET", label: "internet" }, appnote: { type: "paint", title: "PAINT", label: "paint" },
      };
      if (legacyDecorationTypes[item.type]) {
        const migrated = legacyDecorationTypes[item.type];
        item.type = migrated.type;
        item.title = migrated.title;
        item.data ||= {};
        item.data.label = migrated.label;
      }
      item.data ||= {};
      if (!item.layouts) {
        item.layouts = {};
        Object.keys(RATIO_DIMENSIONS).forEach((ratio) => { item.layouts[ratio] = ratio === saved.ratio ? { x: item.x, y: item.y, w: item.w, h: item.h } : recommendedBox(item, ratio, index); });
      }
      initializeItemLayouts(item, index);
      if (WINDOWED_TYPES.has(item.type) && !["inherit", ...WINDOW_STYLES.map((style) => style.id)].includes(item.windowStyle)) item.windowStyle = "inherit";
      if (item.textColor == null || (["folder", "file", "notification"].includes(item.type) && item.textColor.toLowerCase() === "#ffffff") || (item.type === "dialog" && item.textColor.toLowerCase() === "#222222")) item.textColor = "";
      ["paperColor", "accentColor", "borderColor", "highlightColor"].forEach((key) => { if (item[key] == null) item[key] = ""; });
      if (item.type === "profile") {
        const legacyProfile = !item.data.cardLayouts;
        item.data.imageTransform = normalizeImageTransform(item.data.imageTransform);
        item.data.cardLayouts ||= clone(DEFAULT_PROFILE_CARD_LAYOUTS);
        Object.keys(RATIO_DIMENSIONS).forEach((ratio) => {
          if (!PROFILE_CARD_LAYOUTS.includes(item.data.cardLayouts[ratio])) item.data.cardLayouts[ratio] = DEFAULT_PROFILE_CARD_LAYOUTS[ratio];
          item.layouts[ratio] = fitProfileBoxAspect(item.layouts[ratio], item.data.cardLayouts[ratio], ratio);
        });
        if (legacyProfile) {
          migratedProfileCard = true;
          if (item.title === "MY PROFILE") item.title = "MY ID CARD";
        }
      }
      if (item.type === "gallery") {
        item.data.count = clamp(Number(item.data.count) || 4, 1, 6);
        item.data.images = Array.from({ length: item.data.count }, (_, imageIndex) => String(item.data.images?.[imageIndex] || ""));
        item.data.imageTransforms = Array.from({ length: item.data.count }, (_, imageIndex) => normalizeImageTransform(item.data.imageTransforms?.[imageIndex]));
        item.data.filenames = galleryFilenames(item.data, item.data.count).join(", ");
        const allowed = galleryLayouts(item.data.count);
        if (!allowed.includes(item.data.layout)) item.data.layout = allowed[0];
      }
      if (item.type === "tags") {
        const legacyHeading = String(item.title || "TAGS").toUpperCase().replace(/S$/, "") || "TAGS";
        if (!Array.isArray(item.data.sections) || !item.data.sections.length) item.data.sections = [{ heading: legacyHeading, tags: String(item.data.tags || "") }];
        item.data.sections = item.data.sections.slice(0, 4).map((section, sectionIndex) => ({
          heading: String(section?.heading || `SECTION ${sectionIndex + 1}`),
          tags: String(section?.tags || ""),
        }));
        item.data.tags = item.data.sections[0].tags;
      }
      if (item.type === "messenger") {
        const legacyMessages = [
          { side: "incoming", text: item.data.incoming1 || "" },
          { side: "outgoing", text: item.data.outgoing1 || "" },
          { side: "incoming", text: item.data.incoming2 || "" },
          { side: "outgoing", text: item.data.outgoing2 || "" },
        ];
        const sourceMessages = Array.isArray(item.data.messages) && item.data.messages.length ? item.data.messages : legacyMessages;
        item.data.messageCount = clamp(Number(item.data.messageCount) || sourceMessages.length || 4, 2, 8);
        item.data.messages = sourceMessages.slice(0, item.data.messageCount).map((message, messageIndex) => ({
          side: message?.side === "outgoing" ? "outgoing" : "incoming",
          text: String(message?.text || ""),
        }));
        while (item.data.messages.length < item.data.messageCount) item.data.messages.push({ side: item.data.messages.length % 2 ? "outgoing" : "incoming", text: "" });
        Object.assign(item.data, {
          contact: item.data.contact || "MY FAVORITE", status: item.data.status || "online now",
          avatar: item.data.avatar || "", avatarTransform: normalizeImageTransform(item.data.avatarTransform),
        });
      }
      if (item.type === "video") {
        Object.assign(item.data, {
          caller: item.data.caller || "MY FAVORITE", status: item.data.status || "connected",
          duration: item.data.duration || "00:00", mainImage: item.data.mainImage || "", mainImageTransform: normalizeImageTransform(item.data.mainImageTransform),
          selfImage: item.data.selfImage || "", selfImageTransform: normalizeImageTransform(item.data.selfImageTransform),
          selfPosition: item.data.selfPosition === "bottom" ? "bottom" : "top",
        });
      }
      if (item.type === "rack") {
        item.data.slot = "rack";
        item.data.count = clamp(Number(item.data.count) || 4, 2, 6);
        if (!["vertical", "horizontal"].includes(item.data.direction)) item.data.direction = "vertical";
        if (!["window", "transparent", "dock"].includes(item.data.frame)) item.data.frame = "window";
        item.data.items = Array.isArray(item.data.items) ? item.data.items.slice(0, item.data.count) : [];
        while (item.data.items.length < item.data.count) item.data.items.push({ kind: "custom", label: `icon${String(item.data.items.length + 1).padStart(2, "0")}`, image: "" });
        item.data.items = item.data.items.map((entry, rackIndex) => {
          const legacyKinds = { heart: "memory", settings: "memory", movie: "videoapp", call: "videoapp", globe: "internet", appnote: "paint" };
          const legacyKind = legacyKinds[entry?.kind] || entry?.kind;
          const legacyLabel = legacyKinds[entry?.kind] || entry?.label;
          return {
            kind: RACK_ITEM_KINDS.includes(legacyKind) ? legacyKind : "custom",
            label: String(legacyLabel || `icon${String(rackIndex + 1).padStart(2, "0")}`), image: String(entry?.image || ""),
          };
        });
      }
      if (item.type === "dialog" && (!item.title || item.title === "SYSTEM MESSAGE")) item.title = "Error";
    });
    if (migratedProfileCard) {
      const recentIndex = page.items.findIndex((item) => itemSlot(item) === "recent");
      if (recentIndex >= 0) page.items[recentIndex].layouts["3:4"] = recommendedBox(page.items[recentIndex], "3:4", recentIndex);
    }
  });
  const activePage = saved.pages.find((page) => page.id === saved.currentPageId) || saved.pages[0];
  activePage.items.forEach((item, index) => Object.assign(item, clone(item.layouts[saved.ratio] || recommendedBox(item, saved.ratio, index))));
  return saved;
}

function renderThemeGrid() {
  dom.themeGrid.innerHTML = ""; dom.themeCount.textContent = BACKGROUND_THEMES.length;
  const page = currentPage();
  for (const theme of BACKGROUND_THEMES) {
    const button = document.createElement("button"); button.className = `theme-card${page.background.source === "theme" && page.background.themeId === theme.id ? " is-active" : ""}`;
    button.innerHTML = `<img src="${theme.variants[state.ratio]}" alt=""><span>${escapeHtml(theme.name)}</span>`;
    button.addEventListener("click", () => mutate(() => { page.background = backgroundPreset(theme.id); page.paletteId = `theme-${theme.id}`; page.palette = clone(theme.palette); }));
    dom.themeGrid.append(button);
  }
}

function renderPaletteGrid() {
  dom.paletteGrid.innerHTML = ""; const page = currentPage();
  const kits = [{ id: `theme-${currentTheme().id}`, name: "테마 색상", palette: currentTheme().palette }, ...PALETTE_KITS];
  for (const kit of kits) {
    const customizedFromKit = page.paletteId === "custom" && page.paletteSourceId === kit.id;
    const displayedPalette = page.paletteId === kit.id || customizedFromKit ? page.palette : kit.palette;
    const card = document.createElement("div"); card.className = `palette-card${page.paletteId === kit.id || customizedFromKit ? " is-active" : ""}`; card.title = `${kit.name} · 색상 칸을 눌러 직접 조정`;
    const swatches = [
      ["window", "창 바탕"], ["titleBar", "제목 표시줄"], ["accent", "포인트"],
    ].map(([key, label]) => `<label class="palette-swatch" title="${label}"><input type="color" data-palette-color="${key}" aria-label="${escapeHtml(`${kit.name} ${label}`)}" value="${displayedPalette[key]}"></label>`).join("");
    card.innerHTML = `<span class="palette-swatches">${swatches}</span><button type="button" class="palette-apply" data-palette-apply>${escapeHtml(kit.name)}</button>`;
    card.querySelector("[data-palette-apply]").addEventListener("click", () => mutate(() => { page.paletteId = kit.id; page.paletteSourceId = ""; page.palette = clone(kit.palette); }));
    card.querySelectorAll("[data-palette-color]").forEach((input) => {
      input.addEventListener("pointerdown", beginTransaction);
      input.addEventListener("focus", beginTransaction);
      input.addEventListener("input", () => {
        if (page.paletteId !== "custom" || page.paletteSourceId !== kit.id) page.palette = clone(kit.palette);
        page.paletteId = "custom"; page.paletteSourceId = kit.id; page.palette[input.dataset.paletteColor] = input.value;
        dom.paletteGrid.querySelectorAll(".palette-card").forEach((entry) => entry.classList.toggle("is-active", entry === card));
        renderControls(); renderCanvas();
      });
      input.addEventListener("change", () => { commitTransaction(); renderAll(); });
    });
    dom.paletteGrid.append(card);
  }
}

function windowStylePreview(style, selected = false, dataAttribute = "data-window-style") {
  const classicMenu = style.id === "classic" ? `<i class="style-menu"></i>` : "";
  const bar = ["slim", "y2k", "classic"].includes(style.id) ? `<i class="style-bar"></i>${classicMenu}` : "";
  return `<button type="button" class="window-style-option style-${style.id}${selected ? " is-active" : ""}" ${dataAttribute}="${style.id}"><span class="style-window">${bar}<i class="style-content"></i></span><b>${style.name}</b><small>${style.hint}</small></button>`;
}

function renderDefaultWindowStyles() {
  const selected = currentPage().defaultWindowStyle || "slim";
  dom.defaultWindowStyleGrid.innerHTML = WINDOW_STYLES.map((style) => windowStylePreview(style, style.id === selected, "data-default-window-style")).join("");
  dom.defaultWindowStyleGrid.querySelectorAll("[data-default-window-style]").forEach((button) => button.addEventListener("click", () => mutate(() => { currentPage().defaultWindowStyle = button.dataset.defaultWindowStyle; })));
}

function applyDecorationPickerPalette(palette) {
  const roles = {
    "--item-paper": palette.window,
    "--item-accent": palette.titleBar,
    "--item-border": palette.border,
    "--item-ink": palette.text,
    "--item-highlight": palette.accent,
    "--item-shadow": palette.shadow,
  };
  document.querySelectorAll(".primary-decoration-grid, .rack-preset-card").forEach((surface) => {
    Object.entries(roles).forEach(([property, value]) => surface.style.setProperty(property, value));
  });
}

function renderControls() {
  const page = currentPage(), bg = page.background, frame = page.frame;
  applyDecorationPickerPalette(page.palette);
  dom.ratioSelect.value = state.ratio; dom.zoomRange.value = state.zoom; dom.zoomOutput.value = `${state.zoom}%`;
  dom.backgroundFit.value = bg.fit; dom.backgroundBlur.value = bg.blur; dom.blurOutput.value = `${bg.blur}px`;
  dom.backgroundBrightness.value = bg.brightness; dom.brightnessOutput.value = `${bg.brightness}%`; dom.overlayColor.value = bg.overlayColor; dom.overlayOpacity.value = bg.overlayOpacity; dom.overlayOutput.value = `${bg.overlayOpacity}%`;
  dom.backgroundFitRow.hidden = bg.source !== "custom";
  dom.customThemePanel.hidden = bg.source !== "custom" && page.paletteId !== "custom";
  if (!dom.customThemePanel.hidden) {
    dom.customPaletteWindow.value = page.palette.window;
    dom.customPaletteTitleBar.value = page.palette.titleBar;
    dom.customPaletteBorder.value = page.palette.border;
    dom.customPaletteText.value = page.palette.text;
    dom.customPaletteAccent.value = page.palette.accent;
    dom.customPaletteShadow.value = page.palette.shadow;
  }
  dom.frameEnabled.checked = frame.enabled; dom.frameTopText.value = frame.topText; dom.frameMenuText.value = frame.menuText; dom.frameBottomText.value = frame.bottomText; dom.frameTextColor.value = frame.textColor || page.palette.border;
  document.querySelectorAll("[data-frame-preset]").forEach((button) => button.classList.toggle("is-active", button.dataset.framePreset === frame.preset));
  document.querySelectorAll("[data-ratio]").forEach((button) => button.classList.toggle("is-active", button.dataset.ratio === state.ratio));
  dom.selectionBreadcrumb.textContent = `${page.name} · ${state.ratio}`;
  updateUndoButtons();
}

function renderPageTabs() {
  dom.pageTabs.innerHTML = "";
  state.pages.forEach((page) => {
    if (editingPageId === page.id) {
      const input = document.createElement("input");
      input.className = "page-name-input";
      input.value = page.name;
      input.maxLength = MAX_PAGE_NAME_LENGTH;
      input.setAttribute("aria-label", "페이지명 입력");
      const finish = (save) => {
        if (editingPageId !== page.id) return;
        const nextName = String(input.value || "").trim().replace(/\s+/g, " ").slice(0, MAX_PAGE_NAME_LENGTH);
        editingPageId = null;
        if (save && nextName && nextName !== page.name) {
          mutate(() => { page.name = nextName; });
          showToast(`페이지명을 ${nextName}(으)로 변경했습니다.`);
        } else renderAll();
      };
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); finish(true); }
        if (event.key === "Escape") { event.preventDefault(); finish(false); }
      });
      input.addEventListener("blur", () => finish(true));
      dom.pageTabs.append(input);
      queueMicrotask(() => { input.focus(); input.select(); });
      return;
    }
    const button = document.createElement("button");
    button.textContent = page.name;
    button.classList.toggle("is-active", page.id === state.currentPageId);
    button.title = page.id === state.currentPageId ? "더블클릭하여 페이지명 변경" : "페이지 선택";
    button.addEventListener("click", () => {
      if (page.id === state.currentPageId) return;
      syncCurrentLayout();
      state.currentPageId = page.id;
      applyRatioLayout(page, state.ratio);
      state.selectedItemId = null;
      toolboxEditMode = false;
      renderAll();
    });
    button.addEventListener("dblclick", () => {
      if (page.id !== state.currentPageId) return;
      editingPageId = page.id;
      renderPageTabs();
    });
    dom.pageTabs.append(button);
  });
}

function designPhotoVerticalInset(item) {
  if (item.type !== "profile" || profileCardLayout(item) !== "design") return 0;
  const dimensions = RATIO_DIMENSIONS[state.ratio];
  const cardWidth = item.w * dimensions.width;
  const cardHeight = item.h * dimensions.height;
  const chromeInset = 19; // 8px padding on each side + 1.5px border on each side.
  const contentWidth = Math.max(0, cardWidth - chromeInset);
  const contentHeight = Math.max(0, cardHeight - chromeInset);
  const photoWidth = Math.min(170, contentWidth * .28);
  const photoHeight = photoWidth * 9 / 7;
  return Math.max(0, (contentHeight - photoHeight) / 2);
}

function itemCssVariables(item, page) {
  const palette = page.palette;
  return `--item-paper:${item.paperColor || palette.window};--item-accent:${item.accentColor || palette.titleBar};--item-border:${item.borderColor || palette.border};--item-ink:${item.textColor || palette.text};--item-highlight:${item.highlightColor || palette.accent};--item-shadow:${palette.shadow};--design-photo-inset:${designPhotoVerticalInset(item)}px;left:${item.x * 100}%;top:${item.y * 100}%;width:${item.w * 100}%;height:${item.h * 100}%`;
}

function resolvedWindowStyle(item) {
  const style = item.windowStyle && item.windowStyle !== "inherit" ? item.windowStyle : currentPage().defaultWindowStyle;
  return WINDOW_STYLES.some((entry) => entry.id === style) ? style : "slim";
}

function windowShell(item, bodyClass, body, bodyStyle = "") {
  const style = resolvedWindowStyle(item);
  const controls = (kinds) => `<span class="window-controls" aria-hidden="true">${kinds.map((kind) => `<i class="control-${kind}">${kind === "min" ? "−" : kind === "max" ? "□" : "×"}</i>`).join("")}</span>`;
  const titlebars = {
    slim: `<div class="window-titlebar"><span>${escapeHtml(item.title)}</span>${controls(["close"])}</div>`,
    y2k: `<div class="window-titlebar"><span>${escapeHtml(item.title)}</span><span class="window-charms">♡ ♡ ♡</span>${controls(["close"])}</div>`,
    classic: `<div class="window-titlebar"><span>${escapeHtml(item.title)}</span>${controls(["min", "max", "close"])}</div><div class="window-menu">File Edit View Help</div>`,
  };
  return `<div class="retro-window chrome-${style}">${titlebars[style] || ""}<div class="window-body ${bodyClass}"${bodyStyle ? ` style="${bodyStyle}"` : ""}>${body}</div></div>`;
}

function galleryLayouts(count) {
  if (count === 1) return ["single"];
  if (count === 4 || count === 6) return ["grid", "row", "column"];
  return ["row", "column"];
}

function galleryGridStyle(count, layout) {
  if (layout === "column") return `grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(${count},minmax(0,1fr))`;
  if (layout === "row") return `grid-template-columns:repeat(${count},minmax(0,1fr));grid-template-rows:minmax(0,1fr)`;
  if (count === 6) return "grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))";
  if (count === 4) return "grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))";
  return "grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr)";
}

function defaultImageTransform() { return { zoom: 100, x: 50, y: 50 }; }
function normalizeImageTransform(transform) {
  const zoom = Number(transform?.zoom), x = Number(transform?.x), y = Number(transform?.y);
  return {
    zoom: clamp(Number.isFinite(zoom) ? zoom : 100, 70, 250),
    x: clamp(Number.isFinite(x) ? x : 50, 0, 100),
    y: clamp(Number.isFinite(y) ? y : 50, 0, 100),
  };
}
function imageTransformStyle(transform) {
  const normalized = normalizeImageTransform(transform);
  return `--image-zoom:${normalized.zoom / 100};--image-x:${normalized.x}%;--image-y:${normalized.y}%`;
}
function imageOrPlaceholder(url, className, label, transform) {
  return url
    ? `<img class="${className} crop-adjustable-image" src="${url}" alt="" style="${imageTransformStyle(transform)}">`
    : `<div class="${className} placeholder">${escapeHtml(label)}</div>`;
}
function defaultGalleryFilename(index) { return `mypictures${String(index + 1).padStart(2, "0")}.jpg`; }
function galleryFilenames(data, count = clamp(Number(data?.count) || 2, 1, 6)) {
  const names = String(data?.filenames || "").split(",").map((name) => name.trim());
  return Array.from({ length: count }, (_, index) => names[index] || defaultGalleryFilename(index));
}
function ensureGallerySlots(item) {
  const count = clamp(Number(item.data.count) || 2, 1, 6);
  item.data.images = Array.from({ length: count }, (_, index) => String(item.data.images?.[index] || ""));
  item.data.imageTransforms = Array.from({ length: count }, (_, index) => normalizeImageTransform(item.data.imageTransforms?.[index]));
  item.data.filenames = galleryFilenames(item.data, count).join(", ");
  return count;
}
function setGalleryFilename(item, index, value) {
  const names = galleryFilenames(item.data, ensureGallerySlots(item));
  names[index] = String(value || "").trim() || defaultGalleryFilename(index);
  item.data.filenames = names.join(", ");
}
function findItemById(itemId) {
  for (const page of state.pages) {
    const item = page.items.find((entry) => entry.id === itemId);
    if (item) return item;
  }
  return null;
}
async function setGallerySlotFile(itemId, index, file) {
  if (!file) return;
  const url = await fileToDataUrl(file);
  mutate(() => {
    const item = findItemById(itemId);
    if (!item || item.type !== "gallery") return;
    const count = ensureGallerySlots(item);
    if (index < 0 || index >= count) return;
    item.data.images[index] = url;
    item.data.imageTransforms[index] = defaultImageTransform();
    setGalleryFilename(item, index, file.name || defaultGalleryFilename(index));
    state.selectedItemId = item.id;
    toolboxEditMode = true;
  });
}
function profileCardLayout(item, ratio = state.ratio) {
  const selected = item.data.cardLayouts?.[ratio];
  return PROFILE_CARD_LAYOUTS.includes(selected) ? selected : DEFAULT_PROFILE_CARD_LAYOUTS[ratio];
}
function profileCardNormalizedAspect(layout, ratio) {
  const dimensions = RATIO_DIMENSIONS[ratio];
  return PROFILE_CARD_ASPECTS[layout] * dimensions.height / dimensions.width;
}
function decorationNormalizedAspect(type, ratio) {
  const dimensions = RATIO_DIMENSIONS[ratio];
  return DECORATION_ASPECTS[type] * dimensions.height / dimensions.width;
}
function fitBoxAspect(box, normalizedAspect) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  let w = clamp(Number(box.w) || .20, .05, .92);
  let h = w / normalizedAspect;
  if (h > .92) { h = .92; w = h * normalizedAspect; }
  return {
    x: clamp(centerX - w / 2, 0, 1 - w),
    y: clamp(centerY - h / 2, 0, 1 - h),
    w,
    h,
  };
}
function fitProfileBoxAspect(box, layout, ratio) { return fitBoxAspect(box, profileCardNormalizedAspect(layout, ratio)); }
function fitDecorationBoxAspect(box, type, ratio) { return fitBoxAspect(box, decorationNormalizedAspect(type, ratio)); }
function fitFreeDialogBox(box, ratio) {
  const dimensions = RATIO_DIMENSIONS[ratio];
  const minimumWidth = 170 / dimensions.width;
  const minimumHeight = 96 / dimensions.height;
  const sourceWidth = Number(box?.w);
  const sourceHeight = Number(box?.h);
  const width = clamp(Number.isFinite(sourceWidth) ? sourceWidth : SYSTEM_DECORATION_PIXELS.dialog.width / dimensions.width, minimumWidth, .92);
  const height = clamp(Number.isFinite(sourceHeight) ? sourceHeight : SYSTEM_DECORATION_PIXELS.dialog.height / dimensions.height, minimumHeight, .92);
  const centerX = (Number(box?.x) || 0) + width / 2;
  const centerY = (Number(box?.y) || 0) + height / 2;
  return {
    x: clamp(centerX - width / 2, 0, 1 - width),
    y: clamp(centerY - height / 2, 0, 1 - height),
    w: width,
    h: height,
  };
}
function fitItemBoxAspect(item, box, ratio) {
  if (item.type === "profile") return fitProfileBoxAspect(box, profileCardLayout(item, ratio), ratio);
  if (item.type === "dialog") return fitFreeDialogBox(box, ratio);
  if (DECORATION_TYPES.has(item.type)) return fitDecorationBoxAspect(box, item.type, ratio);
  return clone(box);
}
function resizeRackToContents(item, force = false) {
  const dimensions = RATIO_DIMENSIONS[state.ratio], count = clamp(Number(item.data.count) || 4, 2, 6);
  const vertical = item.data.direction !== "horizontal";
  const minimumWidth = (vertical ? 132 : 44 + count * 72) / dimensions.width;
  const minimumHeight = (vertical ? 44 + count * 68 : item.data.frame === "dock" ? 112 : 116) / dimensions.height;
  item.w = clamp(force ? minimumWidth : Math.max(item.w, minimumWidth), .08, 1 - item.x);
  item.h = clamp(force ? minimumHeight : Math.max(item.h, minimumHeight), .08, 1 - item.y);
  item.x = clamp(item.x, 0, 1 - item.w);
  item.y = clamp(item.y, 0, 1 - item.h);
  item.layouts[state.ratio] = { x: item.x, y: item.y, w: item.w, h: item.h };
}
function profileCardDensity(item) {
  const dimensions = RATIO_DIMENSIONS[state.ratio];
  const width = item.w * dimensions.width;
  const height = item.h * dimensions.height;
  return height < 150 || width < 245 ? "compact" : height < 245 || width < 390 ? "cozy" : "roomy";
}
function profileCardNumber(item) {
  let value = 0;
  for (const character of item.id) value = (value * 31 + character.charCodeAt(0)) % 10000;
  return `PZ-${String(value).padStart(4, "0")}`;
}
function decorationShell(type, content) { return `<div class="decoration-element decoration-${type}">${content}</div>`; }
function vectorIconMarkup(type, extraClass = "") { return `<svg class="vector-icon vector-icon-${type}${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true"><use href="#decor-icon-${type}"></use></svg>`; }
function vectorDecorationMarkup(type, label = "") { return `<div class="vector-decoration vector-decoration-${type}">${vectorIconMarkup(type)}${label ? `<span class="vector-decoration-label">${escapeHtml(label)}</span>` : ""}</div>`; }
function dialogDecorationMarkup(item) {
  const title = String(item.title || "Error");
  const message = String(item.data?.message || "Fail");
  const button = String(item.data?.button || "OK");
  return `<div class="dialog-card" role="img" aria-label="${escapeHtml(title)}: ${escapeHtml(message)}"><div class="dialog-bar"><strong>${escapeHtml(title)}</strong><span class="dialog-close" aria-hidden="true">×</span></div><div class="dialog-content"><p>${escapeHtml(message)}</p><button type="button" tabindex="-1">${escapeHtml(button)}</button></div></div>`;
}
function pixelIconMarkup(type, extraClass = "") {
  const icon = window.PROFILE_ZIP_PIXEL_ICONS?.[type];
  if (!icon) return "";
  const paths = ["shadow", "outline", "paper", "main", "point"]
    .filter((role) => icon[role])
    .map((role) => `<path class="pixel-role-${role}" d="${icon[role]}"></path>`)
    .join("");
  return `<svg class="pixel-icon pixel-icon-${type}${extraClass ? ` ${extraClass}` : ""}" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${paths}</svg>`;
}
function hydratePixelIcons(root = document) {
  root.querySelectorAll("[data-pixel-icon]").forEach((node) => {
    const type = node.dataset.pixelIcon;
    node.innerHTML = pixelIconMarkup(type, "pixel-icon-preview");
  });
}
function rackEntryMarkup(entry, index) {
  const kind = RACK_ITEM_KINDS.includes(entry.kind) ? entry.kind : "custom";
  const icon = kind === "custom" && entry.image
    ? `<img src="${entry.image}" alt="">`
    : PIXEL_DECORATION_TYPES.includes(kind) ? pixelIconMarkup(kind, "rack-pixel-icon") : `<i class="rack-symbol rack-symbol-custom" aria-hidden="true">+</i>`;
  return `<div class="rack-slot${PIXEL_DECORATION_TYPES.includes(kind) ? " rack-slot-pixel" : ""}">${icon}<small>${escapeHtml(entry.label || `icon${String(index + 1).padStart(2, "0")}`)}</small></div>`;
}
function itemMarkup(item) {
  const d = item.data;
  if (item.type === "profile") {
    const layout = profileCardLayout(item);
    const density = profileCardDensity(item);
    const serial = profileCardNumber(item);
    const photo = `<div class="id-card-photo">${imageOrPlaceholder(d.image, "profile-photo", "3.5 × 4.5", d.imageTransform)}<span>ID PHOTO</span></div>`;
    const info = `<section class="id-card-info"><div class="id-card-name"><small>NAME</small><h3>${escapeHtml(d.nickname)}</h3></div><dl><div><dt>ACCOUNT</dt><dd>${escapeHtml(d.handle)}</dd></div><div class="id-card-message"><dt>PROFILE</dt><dd>${escapeHtml(d.bio)}</dd></div></dl></section>`;
    const card = `<article class="profile-id-card profile-card-${layout} profile-card-${density}"><header class="id-card-header"><strong>PROFILE.ZIP</strong><span>IDENTITY CARD</span><b>${serial}</b></header><div class="id-card-design-name"><small>NICKNAME</small><strong>${escapeHtml(d.nickname)}</strong></div>${photo}${info}</article>`;
    return card;
  }
  if (item.type === "gallery") {
    const count = clamp(Number(d.count) || 4, 1, 6);
    const allowedLayouts = galleryLayouts(count);
    const layout = allowedLayouts.includes(d.layout) ? d.layout : allowedLayouts[0];
    const names = galleryFilenames(d, count);
    const tiles = Array.from({ length: count }, (_, index) => `<div class="gallery-file"><div class="gallery-image-frame">${imageOrPlaceholder(d.images?.[index], "gallery-image", "▧", d.imageTransforms?.[index])}</div><small>${escapeHtml(names[index])}</small></div>`).join("");
    return windowShell(item, `gallery-body layout-${layout}`, tiles, galleryGridStyle(count, layout));
  }
  if (item.type === "note") return windowShell(item, "note-body", `<h3>${escapeHtml(d.heading)}</h3><p>${escapeHtml(d.body)}</p>`);
  if (item.type === "music") return windowShell(item, "music-body", `<div class="album-cover">♫</div><div><div class="track-title">${escapeHtml(d.song)}</div><div class="track-artist">${escapeHtml(d.artist)}</div><div class="track-line"></div><div class="player-controls">◀ ▶ ▷</div></div>`);
  if (item.type === "tags") {
    const sections = (Array.isArray(d.sections) && d.sections.length ? d.sections : [{ heading: item.title || "TAGS", tags: d.tags || "" }]).slice(0, 4);
    const content = sections.map((section, sectionIndex) => {
      const tags = String(section.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
      return `<section class="tag-section"><h3>${escapeHtml(section.heading || `SECTION ${sectionIndex + 1}`)}</h3><div class="tag-row">${tags}</div></section>`;
    }).join("");
    return windowShell(item, "tag-window-body", `<div class="tag-sections" style="--tag-section-count:${sections.length}">${content}</div>`);
  }
  if (item.type === "recent") {
    const entries = String(d.entries || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [label, ...contentParts] = line.split("|");
      const content = contentParts.join("|").trim();
      if (!content) return `<li class="recent-entry-single"><span>${escapeHtml(label.trim())}</span></li>`;
      return `<li><small>${escapeHtml(label.trim())}</small><span>${escapeHtml(content)}</span></li>`;
    }).join("");
    return windowShell(item, "recent-body", `<ul>${entries}</ul>`);
  }
  if (item.type === "messenger") {
    const count = clamp(Number(d.messageCount) || d.messages?.length || 4, 2, 8);
    const messages = (Array.isArray(d.messages) ? d.messages : []).slice(0, count)
      .filter((message) => String(message?.text || "").trim())
      .map((message) => `<p class="message-bubble ${message.side === "outgoing" ? "outgoing" : "incoming"}">${escapeHtml(message.text)}</p>`).join("");
    const avatar = `<div class="messenger-avatar-frame">${imageOrPlaceholder(d.avatar, "messenger-avatar", "●", d.avatarTransform)}</div>`;
    return windowShell(item, "messenger-body", `<header class="messenger-contact">${avatar}<div><b>${escapeHtml(d.contact)}</b><small><i></i>${escapeHtml(d.status)}</small></div></header><div class="message-thread" style="--message-count:${count}">${messages || `<p class="message-empty">START A NEW CHAT...</p>`}</div><div class="message-input"><span>message...</span><b>→</b></div>`);
  }
  if (item.type === "video") {
    const mainView = imageOrPlaceholder(d.mainImage, "video-call-image", "CONNECTING...", d.mainImageTransform);
    const selfView = imageOrPlaceholder(d.selfImage, "video-self-image", "YOU", d.selfImageTransform);
    const selfPosition = d.selfPosition === "bottom" ? "bottom" : "top";
    return windowShell(item, "video-call-body", `<div class="video-scene">${mainView}<div class="video-vignette"></div><div class="video-person"><b>${escapeHtml(d.caller)}</b><span><i></i>${escapeHtml(d.status)} · ${escapeHtml(d.duration)}</span></div><div class="video-self-view is-${selfPosition}">${selfView}</div><div class="video-controls" aria-hidden="true"><span>◼</span><span>●</span><span class="hangup">×</span></div></div>`);
  }
  if (item.type === "rack") {
    const count = clamp(Number(d.count) || 4, 2, 6);
    const direction = d.direction === "horizontal" ? "horizontal" : "vertical";
    const frame = ["window", "transparent", "dock"].includes(d.frame) ? d.frame : "window";
    const entries = (d.items || []).slice(0, count).map(rackEntryMarkup).join("");
    const rack = `<div class="decoration-rack-items direction-${direction}" style="--rack-count:${count}">${entries}</div>`;
    if (frame === "window") return windowShell(item, "decoration-rack-body", rack);
    return `<div class="decoration-rack-surface rack-frame-${frame}">${rack}</div>`;
  }
  if (DECORATION_TYPES.has(item.type)) {
    const labels = {
      folder: d.label,
      file: d.label,
      notification: [d.heading, d.detail].filter(Boolean).join(" · "),
      dialog: [d.message, d.button].filter(Boolean).join(" · "),
      warning: item.title,
      cursor: item.title,
      imageapp: d.label,
      videoapp: d.label,
      camera: d.label,
      chat: d.label,
      appmusic: d.label,
      paint: d.label,
      internet: d.label,
      memory: d.label,
      trash: d.label,
    };
    if (PIXEL_DECORATION_TYPES.includes(item.type)) return decorationShell(item.type, `<div class="pixel-decoration">${pixelIconMarkup(item.type)}<span>${escapeHtml(labels[item.type] || "")}</span></div>`);
    if (item.type === "dialog") return decorationShell(item.type, dialogDecorationMarkup(item));
    return decorationShell(item.type, vectorDecorationMarkup(item.type));
  }
  return "";
}

function renderFrame(stage, page) {
  if (!page.frame.enabled) return;
  const frame = document.createElement("div"); frame.className = `page-frame ${page.frame.preset}`;
  frame.style.cssText = `--frame-paper:${page.palette.window};--frame-ink:${page.frame.textColor || page.palette.border}`;
  const menuItems = page.frame.menuText.split("/").map((item) => `<span>${escapeHtml(item.trim())}</span>`).join("");
  frame.innerHTML = `<div class="frame-topline"><span>${escapeHtml(page.frame.topText)}</span></div><div class="frame-menu">${menuItems}</div><div class="frame-bottomline"><span>${escapeHtml(page.frame.bottomText)}</span><span>${escapeHtml(page.name)}</span></div>`;
  stage.append(frame);
}

function frameContentBounds(stageRect = dom.canvasStage.getBoundingClientRect()) {
  const page = currentPage();
  const bounds = { left: 0, right: 1, top: 0, bottom: 1 };
  if (!page.frame.enabled || !stageRect.width || !stageRect.height) return bounds;

  // Read the rendered frame instead of duplicating its CSS dimensions here.
  // This keeps smart guides accurate for WEB, TICKER, STATUS and MINIMAL.
  const topParts = [dom.canvasStage.querySelector(".frame-topline"), dom.canvasStage.querySelector(".frame-menu")]
    .filter((element) => element && getComputedStyle(element).display !== "none");
  const bottomPart = dom.canvasStage.querySelector(".frame-bottomline");
  if (topParts.length) {
    bounds.top = clamp(Math.max(...topParts.map((element) => element.getBoundingClientRect().bottom - stageRect.top)) / stageRect.height, 0, 1);
  }
  if (bottomPart) {
    bounds.bottom = clamp((bottomPart.getBoundingClientRect().top - stageRect.top) / stageRect.height, 0, 1);
  }
  return bounds;
}

function alignmentTargets(axis, excludedId, bounds = { left: 0, right: 1, top: 0, bottom: 1 }) {
  const targets = axis === "x"
    ? [0, bounds.left, (bounds.left + bounds.right) / 2, bounds.right, 1]
    : [0, bounds.top, (bounds.top + bounds.bottom) / 2, bounds.bottom, 1];
  currentPage().items.forEach((item) => {
    if (item.id === excludedId) return;
    if (axis === "x") targets.push(item.x, item.x + item.w / 2, item.x + item.w);
    else targets.push(item.y, item.y + item.h / 2, item.y + item.h);
  });
  return [...new Set(targets.map((value) => Number(value.toFixed(5))))];
}

function nearestAlignment(anchors, targets, threshold) {
  let best = null;
  anchors.forEach((anchor) => targets.forEach((target) => {
    const delta = target - anchor;
    if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target };
  }));
  return best;
}

function measureLabel(value, axis) {
  const dimensions = RATIO_DIMENSIONS[state.ratio];
  return `${Math.round(value * (axis === "x" ? dimensions.width : dimensions.height))} px`;
}

function equalGapSnap(item, x, y, axis, threshold) {
  const others = currentPage().items.filter((entry) => entry.id !== item.id);
  if (axis === "x") {
    const overlaps = others.filter((entry) => entry.y < y + item.h && entry.y + entry.h > y);
    const left = overlaps.filter((entry) => entry.x + entry.w <= x + threshold).sort((a, b) => (b.x + b.w) - (a.x + a.w))[0];
    const right = overlaps.filter((entry) => entry.x >= x + item.w - threshold).sort((a, b) => a.x - b.x)[0];
    if (!left || !right) return null;
    const target = (left.x + left.w + right.x - item.w) / 2;
    if (Math.abs(target - x) > threshold * 1.5) return null;
    const gap = target - (left.x + left.w);
    if (gap < 0) return null;
    return { value: target, guides: [
      { kind: "gap-x", start: left.x + left.w, end: target, cross: y + item.h / 2, label: measureLabel(gap, "x") },
      { kind: "gap-x", start: target + item.w, end: right.x, cross: y + item.h / 2, label: measureLabel(gap, "x") },
    ] };
  }
  const overlaps = others.filter((entry) => entry.x < x + item.w && entry.x + entry.w > x);
  const above = overlaps.filter((entry) => entry.y + entry.h <= y + threshold).sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
  const below = overlaps.filter((entry) => entry.y >= y + item.h - threshold).sort((a, b) => a.y - b.y)[0];
  if (!above || !below) return null;
  const target = (above.y + above.h + below.y - item.h) / 2;
  if (Math.abs(target - y) > threshold * 1.5) return null;
  const gap = target - (above.y + above.h);
  if (gap < 0) return null;
  return { value: target, guides: [
    { kind: "gap-y", start: above.y + above.h, end: target, cross: x + item.w / 2, label: measureLabel(gap, "y") },
    { kind: "gap-y", start: target + item.h, end: below.y, cross: x + item.w / 2, label: measureLabel(gap, "y") },
  ] };
}

function edgeGapGuides(item, x, y, bounds) {
  const horizontalCandidates = [
    { distance: x - bounds.left, start: bounds.left, end: x },
    { distance: bounds.right - (x + item.w), start: x + item.w, end: bounds.right },
  ].filter((candidate) => candidate.distance >= 0);
  const verticalCandidates = [
    { distance: y - bounds.top, start: bounds.top, end: y },
    { distance: bounds.bottom - (y + item.h), start: y + item.h, end: bounds.bottom },
  ].filter((candidate) => candidate.distance >= 0);

  // If an object deliberately overlaps a frame (or Alt is used), keep the
  // measurement useful by falling back to the physical canvas edge.
  if (!horizontalCandidates.length) {
    horizontalCandidates.push(
      { distance: Math.max(0, x), start: 0, end: x },
      { distance: Math.max(0, 1 - (x + item.w)), start: x + item.w, end: 1 },
    );
  }
  if (!verticalCandidates.length) {
    verticalCandidates.push(
      { distance: Math.max(0, y), start: 0, end: y },
      { distance: Math.max(0, 1 - (y + item.h)), start: y + item.h, end: 1 },
    );
  }

  const horizontal = horizontalCandidates.sort((a, b) => a.distance - b.distance)[0];
  const vertical = verticalCandidates.sort((a, b) => a.distance - b.distance)[0];
  return [
    { kind: "gap-x", start: horizontal.start, end: horizontal.end, cross: clamp(y - .016, .012, .988), label: measureLabel(horizontal.distance, "x") },
    { kind: "gap-y", start: vertical.start, end: vertical.end, cross: clamp(x - .012, .012, .988), label: measureLabel(vertical.distance, "y") },
  ];
}

function snapMatchingFrameMargins(item, x, y, bounds, stageRect, dominantAxis) {
  const horizontal = [
    { edge: "left", px: (x - bounds.left) * stageRect.width },
    { edge: "right", px: (bounds.right - (x + item.w)) * stageRect.width },
  ].filter((gap) => gap.px >= 0).sort((a, b) => a.px - b.px)[0];
  const vertical = [
    { edge: "top", px: (y - bounds.top) * stageRect.height },
    { edge: "bottom", px: (bounds.bottom - (y + item.h)) * stageRect.height },
  ].filter((gap) => gap.px >= 0).sort((a, b) => a.px - b.px)[0];
  if (!horizontal || !vertical || Math.abs(horizontal.px - vertical.px) > SMART_MARGIN_SNAP_PX) return { x, y, matched: false };

  if (dominantAxis === "x") {
    const gap = vertical.px / stageRect.width;
    x = horizontal.edge === "left" ? bounds.left + gap : bounds.right - item.w - gap;
  } else {
    const gap = horizontal.px / stageRect.height;
    y = vertical.edge === "top" ? bounds.top + gap : bounds.bottom - item.h - gap;
  }
  return { x: clamp(x, 0, 1 - item.w), y: clamp(y, 0, 1 - item.h), matched: true };
}

function snapMatchingResizeMargins(item, w, h, bounds, stageRect, dominantAxis) {
  const rightPx = (bounds.right - (item.x + w)) * stageRect.width;
  const bottomPx = (bounds.bottom - (item.y + h)) * stageRect.height;
  if (rightPx < 0 || bottomPx < 0 || Math.abs(rightPx - bottomPx) > SMART_MARGIN_SNAP_PX) return { w, h, matched: false };

  if (dominantAxis === "x") w = bounds.right - item.x - (bottomPx / stageRect.width);
  else h = bounds.bottom - item.y - (rightPx / stageRect.height);
  return {
    w: clamp(w, .07, 1 - item.x),
    h: clamp(h, .07, 1 - item.y),
    matched: true,
  };
}

function messengerMinimumHeight(item) {
  return 82 + clamp(Number(item.data?.messageCount) || item.data?.messages?.length || 4, 2, 8) * 29;
}

function fitMessengerBoxToMessages(item, box, ratio) {
  const minimumHeight = messengerMinimumHeight(item) / RATIO_DIMENSIONS[ratio].height;
  if (box.h >= minimumHeight) return box;
  const bottom = box.y + box.h;
  return { ...box, y: clamp(bottom - minimumHeight, 0, 1 - minimumHeight), h: minimumHeight };
}

function minimumItemSize(item) {
  const dimensions = RATIO_DIMENSIONS[state.ratio];
  if (item.type !== "profile") {
    if (item.type === "dialog") return { w: 170 / dimensions.width, h: 96 / dimensions.height };
    const base = CONTENT_MINIMUM_PIXELS[item.type];
    if (!base) return { w: .07, h: .07 };
    let height = base.height;
    if (item.type === "tags") height = Math.max(height, 45 + clamp(item.data?.sections?.length || 1, 1, 4) * 48);
    if (item.type === "gallery" && Number(item.data?.count) >= 5) height = Math.max(height, 200);
    if (item.type === "messenger") height = Math.max(height, messengerMinimumHeight(item));
    if (item.type === "rack") {
      const count = clamp(Number(item.data?.count) || 4, 2, 6), vertical = item.data?.direction !== "horizontal";
      return {
        w: (vertical ? 132 : 44 + count * 72) / dimensions.width,
        h: (vertical ? 44 + count * 68 : item.data?.frame === "dock" ? 90 : 116) / dimensions.height,
      };
    }
    return { w: base.width / dimensions.width, h: height / dimensions.height };
  }
  const layout = profileCardLayout(item);
  const minimumPixels = layout === "vertical" ? { width: 190, height: 255 } : layout === "design" ? { width: 290, height: 175 } : { width: 270, height: 165 };
  return {
    w: Math.min(.34, minimumPixels.width / dimensions.width),
    h: Math.min(.34, minimumPixels.height / dimensions.height),
  };
}

function smartDragPosition(item, proposedX, proposedY, stageRect, bypassSnap = false, dominantAxis = "y") {
  const snapThresholdX = SMART_SNAP_PX / stageRect.width;
  const snapThresholdY = SMART_SNAP_PX / stageRect.height;
  const guideThresholdX = SMART_GUIDE_PX / stageRect.width;
  const guideThresholdY = SMART_GUIDE_PX / stageRect.height;
  let x = clamp(proposedX, 0, 1 - item.w);
  let y = clamp(proposedY, 0, 1 - item.h);
  const bounds = frameContentBounds(stageRect);
  const guides = [];
  if (!bypassSnap) {
    const xSnap = nearestAlignment([x, x + item.w / 2, x + item.w], alignmentTargets("x", item.id, bounds), snapThresholdX);
    const ySnap = nearestAlignment([y, y + item.h / 2, y + item.h], alignmentTargets("y", item.id, bounds), snapThresholdY);
    if (xSnap) x = clamp(x + xSnap.delta, 0, 1 - item.w);
    if (ySnap) y = clamp(y + ySnap.delta, 0, 1 - item.h);
    const equalX = equalGapSnap(item, x, y, "x", snapThresholdX);
    const equalY = equalGapSnap(item, x, y, "y", snapThresholdY);
    if (!xSnap && equalX) { x = clamp(equalX.value, 0, 1 - item.w); guides.push(...equalX.guides); }
    if (!ySnap && equalY) { y = clamp(equalY.value, 0, 1 - item.h); guides.push(...equalY.guides); }
    ({ x, y } = snapMatchingFrameMargins(item, x, y, bounds, stageRect, dominantAxis));
  }
  const xGuide = nearestAlignment([x, x + item.w / 2, x + item.w], alignmentTargets("x", item.id, bounds), guideThresholdX);
  const yGuide = nearestAlignment([y, y + item.h / 2, y + item.h], alignmentTargets("y", item.id, bounds), guideThresholdY);
  if (xGuide) guides.push({ kind: "line-x", value: xGuide.target });
  if (yGuide) guides.push({ kind: "line-y", value: yGuide.target });
  guides.push(...edgeGapGuides(item, x, y, bounds));
  return { x, y, guides };
}

function fixedAspectResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis, normalizedAspect, minimumWidth) {
  const minimumHeight = minimumWidth / normalizedAspect;
  const maxW = 1 - item.x;
  const maxH = 1 - item.y;
  let w;
  let h;

  if (dominantAxis === "x") {
    w = Math.max(proposedW, minimumWidth);
    h = w / normalizedAspect;
  } else {
    h = Math.max(proposedH, minimumHeight);
    w = h * normalizedAspect;
  }

  if (!bypassSnap) {
    if (dominantAxis === "x") {
      const snap = nearestAlignment([item.x + w], alignmentTargets("x", item.id, frameContentBounds(stageRect)), SMART_SNAP_PX / stageRect.width);
      if (snap) { w += snap.delta; h = w / normalizedAspect; }
    } else {
      const snap = nearestAlignment([item.y + h], alignmentTargets("y", item.id, frameContentBounds(stageRect)), SMART_SNAP_PX / stageRect.height);
      if (snap) { h += snap.delta; w = h * normalizedAspect; }
    }
  }

  const scale = Math.min(1, maxW / w, maxH / h);
  w *= scale;
  h *= scale;
  const guides = [];
  const bounds = frameContentBounds(stageRect);
  const xGuide = nearestAlignment([item.x + w], alignmentTargets("x", item.id, bounds), SMART_GUIDE_PX / stageRect.width);
  const yGuide = nearestAlignment([item.y + h], alignmentTargets("y", item.id, bounds), SMART_GUIDE_PX / stageRect.height);
  if (xGuide) guides.push({ kind: "line-x", value: xGuide.target });
  if (yGuide) guides.push({ kind: "line-y", value: yGuide.target });
  guides.push(...edgeGapGuides({ ...item, w, h }, item.x, item.y, bounds));
  return { w, h, guides };
}

function fixedProfileResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis) {
  const dimensions = RATIO_DIMENSIONS[state.ratio];
  const layout = profileCardLayout(item);
  const normalizedAspect = profileCardNormalizedAspect(layout, state.ratio);
  const minimumWidth = (layout === "vertical" ? 170 : layout === "design" ? 300 : 270) / dimensions.width;
  return fixedAspectResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis, normalizedAspect, minimumWidth);
}

function fixedDecorationResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis) {
  const dimensions = RATIO_DIMENSIONS[state.ratio];
  const normalizedAspect = decorationNormalizedAspect(item.type, state.ratio);
  const minimumPixels = ["notification", "dialog"].includes(item.type) ? 92 : 54;
  return fixedAspectResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis, normalizedAspect, minimumPixels / dimensions.width);
}

function smartResizeSize(item, proposedW, proposedH, stageRect, bypassSnap = false, dominantAxis = "y") {
  if (item.type === "profile") return fixedProfileResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis);
  if (DECORATION_TYPES.has(item.type) && item.type !== "dialog") return fixedDecorationResizeSize(item, proposedW, proposedH, stageRect, bypassSnap, dominantAxis);
  const snapThresholdX = SMART_SNAP_PX / stageRect.width;
  const snapThresholdY = SMART_SNAP_PX / stageRect.height;
  const guideThresholdX = SMART_GUIDE_PX / stageRect.width;
  const guideThresholdY = SMART_GUIDE_PX / stageRect.height;
  const minimum = minimumItemSize(item);
  let w = clamp(proposedW, minimum.w, 1 - item.x);
  let h = clamp(proposedH, minimum.h, 1 - item.y);
  const bounds = frameContentBounds(stageRect);
  const guides = [];
  if (!bypassSnap) {
    const xSnap = nearestAlignment([item.x + w], alignmentTargets("x", item.id, bounds), snapThresholdX);
    const ySnap = nearestAlignment([item.y + h], alignmentTargets("y", item.id, bounds), snapThresholdY);
    if (xSnap) w = clamp(w + xSnap.delta, minimum.w, 1 - item.x);
    if (ySnap) h = clamp(h + ySnap.delta, minimum.h, 1 - item.y);
    ({ w, h } = snapMatchingResizeMargins(item, w, h, bounds, stageRect, dominantAxis));
    w = clamp(w, minimum.w, 1 - item.x);
    h = clamp(h, minimum.h, 1 - item.y);
  }
  const xGuide = nearestAlignment([item.x + w], alignmentTargets("x", item.id, bounds), guideThresholdX);
  const yGuide = nearestAlignment([item.y + h], alignmentTargets("y", item.id, bounds), guideThresholdY);
  if (xGuide) guides.push({ kind: "line-x", value: xGuide.target });
  if (yGuide) guides.push({ kind: "line-y", value: yGuide.target });
  guides.push(...edgeGapGuides({ ...item, w, h }, item.x, item.y, bounds));
  return { w, h, guides };
}

function renderSmartGuides(stage) {
  activeGuides.forEach((guide) => {
    const node = document.createElement("div");
    node.className = `smart-guide ${guide.kind}`;
    if (guide.kind === "line-x") node.style.left = `${guide.value * 100}%`;
    if (guide.kind === "line-y") node.style.top = `${guide.value * 100}%`;
    if (guide.kind === "gap-x") {
      node.style.left = `${guide.start * 100}%`; node.style.width = `${Math.max(0, guide.end - guide.start) * 100}%`; node.style.top = `${guide.cross * 100}%`;
    }
    if (guide.kind === "gap-y") {
      node.style.top = `${guide.start * 100}%`; node.style.height = `${Math.max(0, guide.end - guide.start) * 100}%`; node.style.left = `${guide.cross * 100}%`;
    }
    if (guide.label) node.innerHTML = `<span>${escapeHtml(guide.label)}</span>`;
    stage.append(node);
  });
}

function renderCanvas() {
  const page = currentPage(), dimensions = RATIO_DIMENSIONS[state.ratio], stage = dom.canvasStage;
  stage.innerHTML = ""; stage.dataset.ratio = state.ratio; stage.style.width = `${dimensions.width}px`; stage.style.height = `${dimensions.height}px`; stage.style.zoom = state.zoom / 100;
  if (page.background.source !== "color") {
    const img = document.createElement("img"); img.className = "canvas-background"; img.src = page.background.source === "custom" ? page.background.customUrl : currentTheme().variants[state.ratio]; img.style.objectFit = page.background.fit; img.style.filter = `blur(${page.background.blur}px) brightness(${page.background.brightness}%)`; stage.append(img);
  } else { stage.style.background = page.background.color; }
  const overlay = document.createElement("div"); overlay.className = "canvas-overlay"; overlay.style.background = page.background.overlayColor; overlay.style.opacity = page.background.overlayOpacity / 100; stage.append(overlay);
  renderFrame(stage, page);
  page.items.forEach((item, index) => {
    const element = document.createElement("div"); element.className = `canvas-item item-${item.type}${item.id === state.selectedItemId ? " is-selected" : ""}`; element.dataset.itemId = item.id; element.dataset.label = item.title; element.style.cssText = `${itemCssVariables(item, page)};z-index:${10 + index}`; element.innerHTML = itemMarkup(item);
    element.addEventListener("pointerdown", (event) => { if (event.target.closest(".resize-handle")) return; startDrag(event, item.id); });
    if (item.id === state.selectedItemId) { const handle = document.createElement("span"); handle.className = "resize-handle"; handle.addEventListener("pointerdown", (event) => startResize(event, item.id)); element.append(handle); }
    stage.append(element);
  });
  renderSmartGuides(stage);
  dom.selectionBreadcrumb.textContent = selectedItem() ? `${page.name} · ${state.ratio} > ${selectedItem().title}` : `${page.name} · ${state.ratio}`;
}

function startDrag(event, itemId) {
  event.preventDefault(); activeGuides = []; state.selectedItemId = itemId; toolboxEditMode = true; renderCanvas(); renderQuickEditor(); beginTransaction();
  const item = selectedItem(), stageRect = dom.canvasStage.getBoundingClientRect(), startX = event.clientX, startY = event.clientY, originalX = item.x, originalY = item.y;
  const move = (moveEvent) => { const deltaX = moveEvent.clientX - startX, deltaY = moveEvent.clientY - startY; const freeMovement = currentPage().arrangementMode === "free" || moveEvent.altKey; const result = smartDragPosition(item, originalX + deltaX / stageRect.width, originalY + deltaY / stageRect.height, stageRect, freeMovement, Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y"); item.x = result.x; item.y = result.y; activeGuides = freeMovement ? [] : result.guides; renderCanvas(); };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); activeGuides = []; commitTransaction(); renderAll(); };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
}

function startResize(event, itemId) {
  event.preventDefault(); event.stopPropagation(); activeGuides = []; beginTransaction(); const item = currentPage().items.find((entry) => entry.id === itemId), stageRect = dom.canvasStage.getBoundingClientRect();
  const startX = event.clientX, startY = event.clientY, originalW = item.w, originalH = item.h;
  const move = (moveEvent) => { const deltaX = moveEvent.clientX - startX, deltaY = moveEvent.clientY - startY; const freeMovement = currentPage().arrangementMode === "free" || moveEvent.altKey; const result = smartResizeSize(item, originalW + deltaX / stageRect.width, originalH + deltaY / stageRect.height, stageRect, freeMovement, Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y"); item.w = result.w; item.h = result.h; activeGuides = freeMovement ? [] : result.guides; renderCanvas(); };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); activeGuides = []; commitTransaction(); renderAll(); };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
}

const ITEM_NAMES = { profile: "프로필", gallery: "사진첩", note: "소개 메모", music: "음악 플레이어", tags: "태그 창", recent: "최근 글", messenger: "메신저", video: "영상 통화", rack: "장식 배열", folder: "폴더", file: "문서 파일", imageapp: "이미지", videoapp: "비디오", camera: "카메라", notification: "알림", chat: "채팅", appmusic: "음악", paint: "그림판", internet: "인터넷", memory: "메모리", trash: "쓰레기통", dialog: "확인 창", warning: "경고", cursor: "마우스 커서" };
function textField(label, key, value, options = {}) { const wide = options.wide ? " wide" : ""; const tag = options.textarea ? `<textarea data-data-field="${key}">${escapeHtml(value)}</textarea>` : `<input data-data-field="${key}" type="text" value="${escapeHtml(value)}">`; return `<label class="${wide}">${label}${tag}</label>`; }
function titleField(item) { return `<label>창 제목<input data-item-field="title" type="text" value="${escapeHtml(item.title)}"></label>`; }
function textColorField(item) { return `<label>글자색<input data-item-field="textColor" type="color" value="${item.textColor || currentPage().palette.text}"></label>`; }
function imageTransformEditor(label, key, transform, index = null) {
  const value = normalizeImageTransform(transform);
  const indexAttribute = index == null ? "" : ` data-image-transform-index="${index}"`;
  const range = (field, name, min, max, suffix) => `<label><span>${name}<output>${value[field]}${suffix}</output></span><input data-image-transform="${key}" data-image-transform-field="${field}"${indexAttribute} type="range" min="${min}" max="${max}" step="1" value="${value[field]}"></label>`;
  return `<fieldset class="image-transform-editor wide"><legend>${escapeHtml(label)}</legend>${range("zoom", "크기", 70, 250, "%")}${range("x", "가로 위치", 0, 100, "%")}${range("y", "세로 위치", 0, 100, "%")}<button type="button" data-reset-image-transform="${key}"${indexAttribute}>가운데로 초기화</button></fieldset>`;
}
function itemColorFields(item) {
  const palette = currentPage().palette;
  const fields = [
    ["paperColor", "바탕색", palette.window], ["accentColor", "강조색", palette.titleBar],
    ["borderColor", "테두리색", palette.border], ["highlightColor", "보조색", palette.accent],
  ];
  return `<div class="item-color-editor wide"><div class="field-heading"><b>요소 색상</b><button type="button" data-reset-item-colors>테마 색으로</button></div><div class="color-field-grid">${fields.map(([key, label, fallback]) => `<label>${label}<input data-item-color-field="${key}" type="color" value="${item[key] || fallback}"></label>`).join("")}</div></div>`;
}
function galleryLayoutOptions(count, selected) {
  const labels = { single: "한 칸", row: "가로 한 줄", column: "세로 한 줄", grid: count === 6 ? "3 × 2 격자" : "2 × 2 격자" };
  return galleryLayouts(count).map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${labels[value]}</option>`).join("");
}
function rackKindOptions(selected) {
  const labels = { folder: "폴더", file: "문서 파일", imageapp: "이미지", videoapp: "비디오", camera: "카메라", notification: "알림", chat: "채팅", appmusic: "음악", paint: "그림판", internet: "인터넷", memory: "메모리", trash: "쓰레기통", custom: "사용자 이미지" };
  return RACK_ITEM_KINDS.map((kind) => `<option value="${kind}"${kind === selected ? " selected" : ""}>${labels[kind]}</option>`).join("");
}

function itemWindowStylePicker(item) {
  if (!WINDOWED_TYPES.has(item.type)) return "";
  const current = item.windowStyle || "inherit";
  const inherited = currentPage().defaultWindowStyle || "slim";
  const effective = current === "inherit" ? inherited : current;
  return `<div class="window-style-editor"><div class="field-heading"><b>창 모양</b></div><div class="window-style-grid">${WINDOW_STYLES.map((style) => windowStylePreview(style, style.id === effective, "data-item-window-style")).join("")}</div></div>`;
}

function profileCardLayoutPicker(item) {
  const selected = profileCardLayout(item);
  const labels = { design: "디자인형", horizontal: "가로형", vertical: "세로형" };
  return `<div class="profile-layout-editor"><div class="field-heading"><b>ID 카드 디자인</b><span>${state.ratio} 화면에 적용</span></div><div class="profile-layout-grid">${PROFILE_CARD_LAYOUTS.map((layout) => `<button type="button" class="profile-layout-option${layout === selected ? " is-active" : ""}" data-profile-card-layout="${layout}" aria-pressed="${layout === selected}"><span class="profile-layout-mini mini-${layout}" aria-hidden="true"><i></i><b></b><em></em></span><strong>${labels[layout]}</strong></button>`).join("")}</div></div>`;
}

function renderQuickEditor() {
  const item = selectedItem();
  const editing = Boolean(item && toolboxEditMode);
  dom.toolbox.classList.toggle("is-editing", editing);
  dom.contextualEditor.hidden = !editing;
  dom.toolboxTitle.textContent = editing ? (item.type === "profile" ? "EDIT ID CARD" : "EDIT WINDOW") : "CUSTOMIZE HOME";
  dom.toolboxChrome.innerHTML = editing
    ? `<span class="selected-mark">SELECTED</span>`
    : `<span class="panel-controls" aria-hidden="true"><i>−</i><i>□</i><i>×</i></span>`;
  if (!editing) return;
  let fields = ""; const d = item.data;
  if (["gallery", "note", "music", "tags", "recent", "messenger", "video", "rack", "dialog"].includes(item.type)) fields += titleField(item);
  if (item.type === "profile") fields += profileCardLayoutPicker(item) + `<p class="profile-editor-hint">카드 자체의 고유 비율은 유지됩니다. 사진은 모든 디자인에서 증명사진 규격 3.5 × 4.5cm로 동일하게 들어갑니다.</p>` + textField("닉네임", "nickname", d.nickname) + textField("아이디", "handle", d.handle) + textField("소개", "bio", d.bio, { textarea: true, wide: true }) + `<label>증명사진 (3.5 × 4.5cm)<label class="image-upload-inline">이미지 교체<input data-image-field="profile" type="file" accept="image/*" hidden></label></label>${d.image ? imageTransformEditor("증명사진 위치 조정", "imageTransform", d.imageTransform) : ""}`;
  if (item.type === "gallery") {
    const count = clamp(Number(d.count) || 4, 1, 6), allowedLayouts = galleryLayouts(count), layout = allowedLayouts.includes(d.layout) ? d.layout : allowedLayouts[0];
    const names = galleryFilenames(d, count);
    fields += `<label>사진 칸 수<select data-gallery-count>${Array.from({ length: 6 }, (_, index) => `<option value="${index + 1}"${index + 1 === count ? " selected" : ""}>${index + 1}칸</option>`).join("")}</select></label>`;
    fields += `<label>배치 방향<select data-data-field="layout">${galleryLayoutOptions(count, layout)}</select></label>`;
    fields += `<div class="gallery-slot-editors wide">${Array.from({ length: count }, (_, imageIndex) => {
      const image = d.images?.[imageIndex] || "";
      return `<section class="gallery-slot-editor${image ? " has-image" : ""}"><header><b>PHOTO ${String(imageIndex + 1).padStart(2, "0")}</b><small>${image ? "사진 있음" : "빈 칸"}</small></header><label>사진 제목<input data-gallery-filename-index="${imageIndex}" type="text" value="${escapeHtml(names[imageIndex])}"></label><div class="gallery-slot-actions"><label class="image-upload-inline">${image ? "사진 교체" : "사진 선택"}<input data-image-field="gallery-slot" data-gallery-index="${imageIndex}" type="file" accept="image/*" hidden></label><button type="button" data-gallery-move="-1" data-gallery-index="${imageIndex}"${imageIndex === 0 ? " disabled" : ""}>이전 칸</button><button type="button" data-gallery-move="1" data-gallery-index="${imageIndex}"${imageIndex === count - 1 ? " disabled" : ""}>다음 칸</button>${image ? `<button type="button" class="gallery-remove-btn" data-gallery-remove="${imageIndex}">사진 삭제</button>` : ""}</div>${image ? imageTransformEditor(`사진 ${imageIndex + 1} 위치 조정`, "imageTransforms", d.imageTransforms?.[imageIndex], imageIndex) : `<p>위의 사진 선택 버튼으로 이 칸에 사진을 넣을 수 있어요.</p>`}</section>`;
    }).join("")}</div>`;
    if (count === 1) fields += `<div class="wide helper-copy">1칸은 캡션 없이 대표 사진처럼 크게 표시됩니다.</div>`;
  }
  if (item.type === "note") fields += textField("본문 제목", "heading", d.heading) + textField("본문", "body", d.body, { textarea: true, wide: true });
  if (item.type === "music") fields += textField("곡명", "song", d.song) + textField("아티스트", "artist", d.artist);
  if (item.type === "tags") {
    const sections = Array.isArray(d.sections) && d.sections.length ? d.sections.slice(0, 4) : [{ heading: "LIKE", tags: d.tags || "" }];
    fields += `<label>섹션 수<select data-tag-section-count>${Array.from({ length: 4 }, (_, index) => `<option value="${index + 1}"${index + 1 === sections.length ? " selected" : ""}>${index + 1}개</option>`).join("")}</select></label>`;
    fields += `<div class="tag-section-editors wide">${sections.map((section, index) => `<div class="tag-section-editor"><div><b>SECTION ${String(index + 1).padStart(2, "0")}</b><small>${index === 0 ? "기본 섹션" : "추가 섹션"}</small></div><label>소제목<input data-tag-section-index="${index}" data-tag-section-field="heading" type="text" value="${escapeHtml(section.heading)}"></label><label>태그<textarea data-tag-section-index="${index}" data-tag-section-field="tags">${escapeHtml(section.tags)}</textarea></label></div>`).join("")}</div>`;
    fields += `<div class="wide helper-copy">LIKE, HATE, DREAM처럼 소제목을 나누고 태그는 쉼표로 구분하세요. 섹션을 늘리면 현재 창 높이도 함께 확보됩니다.</div>`;
  }
  if (item.type === "recent") fields += textField("최근 글", "entries", d.entries, { textarea: true, wide: true }) + `<div class="wide helper-copy">항목은 한 줄에 하나씩 입력하세요.</div>`;
  if (item.type === "messenger") {
    const count = clamp(Number(d.messageCount) || d.messages?.length || 4, 2, 8);
    const messages = Array.isArray(d.messages) ? d.messages.slice(0, count) : [];
    fields += textField("상대 이름", "contact", d.contact) + textField("접속 상태", "status", d.status);
    fields += `<label>대화 개수<select data-message-count>${Array.from({ length: 7 }, (_, index) => `<option value="${index + 2}"${index + 2 === count ? " selected" : ""}>${index + 2}개</option>`).join("")}</select></label>`;
    fields += `<div class="message-editors wide">${messages.map((message, index) => `<div class="message-editor"><div><b>MESSAGE ${String(index + 1).padStart(2, "0")}</b><small>${message.side === "outgoing" ? "내 메시지" : "상대 메시지"}</small></div><label>말한 사람<select data-message-index="${index}" data-message-field="side"><option value="incoming"${message.side !== "outgoing" ? " selected" : ""}>상대</option><option value="outgoing"${message.side === "outgoing" ? " selected" : ""}>나</option></select></label><label>내용<textarea data-message-index="${index}" data-message-field="text">${escapeHtml(message.text)}</textarea></label></div>`).join("")}</div>`;
    fields += `<div class="wide helper-copy">대화는 최대 8개까지 추가할 수 있어요. 개수가 늘어나면 창 높이도 함께 늘어납니다.</div>`;
    fields += `<label>상대 프로필 사진<label class="image-upload-inline">이미지 교체<input data-image-field="messenger-avatar" type="file" accept="image/*" hidden></label></label>${d.avatar ? imageTransformEditor("프로필 사진 위치 조정", "avatarTransform", d.avatarTransform) : ""}`;
  }
  if (item.type === "video") {
    fields += textField("상대 이름", "caller", d.caller) + textField("통화 상태", "status", d.status) + textField("통화 시간", "duration", d.duration);
    fields += `<label>내 화면 위치<select data-data-field="selfPosition"><option value="top"${d.selfPosition !== "bottom" ? " selected" : ""}>오른쪽 위</option><option value="bottom"${d.selfPosition === "bottom" ? " selected" : ""}>오른쪽 아래</option></select></label>`;
    fields += `<label>통화 메인 사진<label class="image-upload-inline">이미지 교체<input data-image-field="video-main" type="file" accept="image/*" hidden></label></label>`;
    fields += `<label>내 화면 사진<label class="image-upload-inline">이미지 교체<input data-image-field="video-self" type="file" accept="image/*" hidden></label></label>`;
    if (d.mainImage) fields += imageTransformEditor("통화 메인 사진 위치 조정", "mainImageTransform", d.mainImageTransform);
    if (d.selfImage) fields += imageTransformEditor("내 화면 사진 위치 조정", "selfImageTransform", d.selfImageTransform);
  }
  if (item.type === "rack") {
    const count = clamp(Number(d.count) || 4, 2, 6), entries = Array.isArray(d.items) ? d.items.slice(0, count) : [];
    fields += `<label>아이콘 수<select data-rack-count>${Array.from({ length: 5 }, (_, index) => `<option value="${index + 2}"${index + 2 === count ? " selected" : ""}>${index + 2}개</option>`).join("")}</select></label>`;
    fields += `<label>배열 방향<select data-rack-direction><option value="vertical"${d.direction !== "horizontal" ? " selected" : ""}>세로</option><option value="horizontal"${d.direction === "horizontal" ? " selected" : ""}>가로</option></select></label>`;
    fields += `<label>배경 방식<select data-rack-frame><option value="window"${d.frame === "window" ? " selected" : ""}>창 안에 배치</option><option value="transparent"${d.frame === "transparent" ? " selected" : ""}>투명 배경</option><option value="dock"${d.frame === "dock" ? " selected" : ""}>독 받침</option></select></label>`;
    fields += `<div class="rack-item-editors wide">${entries.map((entry, index) => `<div class="rack-item-editor"><div><b>ICON ${String(index + 1).padStart(2, "0")}</b><small>${escapeHtml(entry.label)}</small></div><label>모양<select data-rack-index="${index}" data-rack-field="kind">${rackKindOptions(entry.kind)}</select></label><label>이름<input data-rack-index="${index}" data-rack-field="label" type="text" value="${escapeHtml(entry.label)}"></label><label>사용자 이미지<label class="image-upload-inline">이미지 선택<input data-image-field="rack-item" data-rack-index="${index}" type="file" accept="image/*" hidden></label></label></div>`).join("")}</div>`;
    fields += `<div class="wide helper-copy">창·투명·독 중 배경을 고르고, 사용자 이미지를 올리면 해당 칸이 이미지 아이콘으로 바뀝니다.</div>`;
  }
  if (["folder", "file"].includes(item.type)) fields += textField("이름", "label", d.label);
  if (item.type === "notification") fields += textField("알림 제목", "heading", d.heading) + textField("보조 문구", "detail", d.detail);
  if (item.type === "dialog") fields += textField("메시지", "message", d.message, { textarea: true, wide: true }) + textField("버튼 문구", "button", d.button);
  if (["warning", "cursor"].includes(item.type)) fields += `<div class="wide helper-copy">이 요소는 글자 없이 모양만 사용하는 장식입니다.</div>`;
  const colorFields = `${itemColorFields(item)}${!["warning", "cursor"].includes(item.type) ? textColorField(item) : ""}`;
  const hasWindowDesign = WINDOWED_TYPES.has(item.type);
  const advanced = `<details class="advanced-details editor-advanced"${hasWindowDesign && windowDesignEditorOpen ? " open" : ""}><summary>${hasWindowDesign ? "창 디자인과 색상" : "요소 색상"}</summary>${itemWindowStylePicker(item)}<div class="editor-fields">${colorFields}</div></details>`;
  const summaryLabel = item.type === "profile" ? "SELECTED ID CARD" : DECORATION_TYPES.has(item.type) ? "SELECTED DECORATION" : "SELECTED WINDOW";
  const summaryCopy = item.type === "profile"
    ? "카드를 옮기고 모서리를 잡아 같은 비율로 크기를 조절하세요."
    : item.type === "dialog"
      ? "작은 윈도우처럼 가로와 세로를 자유롭게 조절하세요. 제목줄과 OK 버튼 크기는 그대로 유지됩니다."
      : DECORATION_TYPES.has(item.type)
        ? "장식의 고유 비율을 유지한 채 크기와 위치를 조절하세요."
        : "내용을 바꾸고, 캔버스에서 창을 옮기거나 크기를 조절하세요.";
  dom.quickEditor.innerHTML = `<div class="editor-form"><div class="editor-summary"><small>${summaryLabel}</small><h3>${ITEM_NAMES[item.type] || item.type}</h3><p>${summaryCopy}</p></div><div class="editor-fields">${fields}</div>${advanced}<div class="editor-actions"><button data-action="front">맨 앞으로</button><button data-action="duplicate">복제</button><button data-action="delete" class="delete-btn">삭제</button></div></div>`;
  bindQuickEditor();
}

function bindQuickEditor() {
  const advancedDetails = dom.quickEditor.querySelector("details.editor-advanced");
  if (advancedDetails && WINDOWED_TYPES.has(selectedItem()?.type)) {
    advancedDetails.addEventListener("toggle", () => {
      windowDesignEditorOpen = advancedDetails.open;
    });
  }
  dom.quickEditor.querySelectorAll("[data-profile-card-layout]").forEach((button) => button.addEventListener("click", () => mutate(() => {
    const item = selectedItem();
    item.data.cardLayouts ||= clone(DEFAULT_PROFILE_CARD_LAYOUTS);
    const layout = button.dataset.profileCardLayout;
    item.data.cardLayouts[state.ratio] = layout;
    const fitted = fitProfileBoxAspect(item, layout, state.ratio);
    Object.assign(item, fitted);
    item.layouts[state.ratio] = clone(fitted);
  })));
  dom.quickEditor.querySelector("select[data-gallery-count]")?.addEventListener("change", (event) => {
    beginTransaction(); const item = selectedItem(), count = Number(event.target.value); item.data.count = count;
    const allowedLayouts = galleryLayouts(count); if (!allowedLayouts.includes(item.data.layout)) item.data.layout = allowedLayouts[0];
    ensureGallerySlots(item); commitTransaction(); renderCanvas(); renderQuickEditor(); updateUndoButtons();
  });
  dom.quickEditor.querySelector("select[data-tag-section-count]")?.addEventListener("change", (event) => {
    beginTransaction();
    const item = selectedItem(), count = Number(event.target.value), sections = Array.isArray(item.data.sections) ? item.data.sections : [];
    while (sections.length < count) sections.push({ heading: sections.length === 1 ? "HATE" : `SECTION ${sections.length + 1}`, tags: "" });
    item.data.sections = sections.slice(0, count);
    item.data.tags = item.data.sections[0]?.tags || "";
    const minimumHeight = clamp((45 + count * 48) / RATIO_DIMENSIONS[state.ratio].height, .10, .45);
    if (item.h < minimumHeight) {
      item.h = minimumHeight;
      item.y = clamp(item.y, 0, 1 - item.h);
      item.layouts[state.ratio] = { x: item.x, y: item.y, w: item.w, h: item.h };
    }
    commitTransaction(); renderCanvas(); renderQuickEditor(); updateUndoButtons();
  });
  dom.quickEditor.querySelector("select[data-message-count]")?.addEventListener("change", (event) => {
    beginTransaction();
    const item = selectedItem(), count = Number(event.target.value), messages = Array.isArray(item.data.messages) ? item.data.messages : [];
    while (messages.length < count) messages.push({ side: messages.length % 2 ? "outgoing" : "incoming", text: "" });
    item.data.messageCount = count;
    item.data.messages = messages.slice(0, count);
    const dimensions = RATIO_DIMENSIONS[state.ratio], minimumHeight = messengerMinimumHeight(item) / dimensions.height;
    if (item.h < minimumHeight) {
      const bottom = item.y + item.h;
      item.h = minimumHeight;
      item.y = clamp(bottom - item.h, 0, 1 - item.h);
      item.layouts[state.ratio] = { x: item.x, y: item.y, w: item.w, h: item.h };
    }
    commitTransaction(); renderCanvas(); renderQuickEditor(); updateUndoButtons();
  });
  dom.quickEditor.querySelector("select[data-rack-count]")?.addEventListener("change", (event) => {
    beginTransaction();
    const item = selectedItem(), count = Number(event.target.value), entries = Array.isArray(item.data.items) ? item.data.items : [];
    while (entries.length < count) entries.push({ kind: "custom", label: `icon${String(entries.length + 1).padStart(2, "0")}`, image: "" });
    item.data.count = count; item.data.items = entries.slice(0, count); resizeRackToContents(item);
    commitTransaction(); renderCanvas(); renderQuickEditor(); updateUndoButtons();
  });
  dom.quickEditor.querySelector("select[data-rack-direction]")?.addEventListener("change", (event) => mutate(() => {
    const item = selectedItem(); item.data.direction = event.target.value; resizeRackToContents(item, true);
  }));
  dom.quickEditor.querySelector("select[data-rack-frame]")?.addEventListener("change", (event) => mutate(() => {
    const item = selectedItem(); item.data.frame = event.target.value;
    if (item.data.frame === "dock") item.data.direction = "horizontal";
    resizeRackToContents(item, item.data.frame === "dock");
  }));
  dom.quickEditor.querySelectorAll("[data-rack-field]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    const update = () => {
      const item = selectedItem(), index = Number(input.dataset.rackIndex);
      item.data.items[index][input.dataset.rackField] = input.value;
      renderCanvas();
    };
    input.addEventListener(input.tagName === "SELECT" ? "change" : "input", update);
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelectorAll("[data-tag-section-field]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    input.addEventListener("input", () => {
      const item = selectedItem(), index = Number(input.dataset.tagSectionIndex);
      item.data.sections[index][input.dataset.tagSectionField] = input.value;
      item.data.tags = item.data.sections[0]?.tags || "";
      renderCanvas();
    });
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelectorAll("[data-message-field]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    const update = () => {
      const item = selectedItem(), index = Number(input.dataset.messageIndex);
      item.data.messages[index][input.dataset.messageField] = input.value;
      renderCanvas();
    };
    input.addEventListener(input.tagName === "SELECT" ? "change" : "input", update);
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelectorAll("[data-gallery-filename-index]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    input.addEventListener("input", () => {
      const item = selectedItem();
      setGalleryFilename(item, Number(input.dataset.galleryFilenameIndex), input.value);
      renderCanvas();
    });
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelectorAll("[data-gallery-move]").forEach((button) => button.addEventListener("click", () => mutate(() => {
    const item = selectedItem(), count = ensureGallerySlots(item), from = Number(button.dataset.galleryIndex), to = from + Number(button.dataset.galleryMove);
    if (to < 0 || to >= count) return;
    const names = galleryFilenames(item.data, count);
    [item.data.images[from], item.data.images[to]] = [item.data.images[to], item.data.images[from]];
    [item.data.imageTransforms[from], item.data.imageTransforms[to]] = [item.data.imageTransforms[to], item.data.imageTransforms[from]];
    [names[from], names[to]] = [names[to], names[from]];
    if (!item.data.images[from]) names[from] = defaultGalleryFilename(from);
    if (!item.data.images[to]) names[to] = defaultGalleryFilename(to);
    item.data.filenames = names.join(", ");
  })));
  dom.quickEditor.querySelectorAll("[data-gallery-remove]").forEach((button) => button.addEventListener("click", () => mutate(() => {
    const item = selectedItem(), index = Number(button.dataset.galleryRemove);
    ensureGallerySlots(item);
    item.data.images[index] = "";
    item.data.imageTransforms[index] = defaultImageTransform();
    setGalleryFilename(item, index, defaultGalleryFilename(index));
  })));
  dom.quickEditor.querySelectorAll("input[data-data-field], textarea[data-data-field], select[data-data-field], input[data-item-field]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    const update = () => { const item = selectedItem(); if (input.dataset.itemField) item[input.dataset.itemField] = input.value; else item.data[input.dataset.dataField] = input.value; renderCanvas(); };
    input.addEventListener(input.tagName === "SELECT" ? "change" : "input", update);
    // Keep the editor DOM in place while the user moves between fields.
    // Rebuilding it on blur invalidates the next input just as it receives focus.
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelectorAll("input[data-image-transform]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    input.addEventListener("input", () => {
      const item = selectedItem(), key = input.dataset.imageTransform, field = input.dataset.imageTransformField;
      const imageIndex = input.dataset.imageTransformIndex == null ? null : Number(input.dataset.imageTransformIndex);
      if (imageIndex == null) item.data[key] = normalizeImageTransform(item.data[key]);
      else {
        item.data[key] ||= [];
        item.data[key][imageIndex] = normalizeImageTransform(item.data[key][imageIndex]);
      }
      const transform = imageIndex == null ? item.data[key] : item.data[key][imageIndex];
      transform[field] = Number(input.value);
      const output = input.closest("label")?.querySelector("output");
      if (output) output.textContent = `${input.value}%`;
      renderCanvas();
    });
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelectorAll("[data-reset-image-transform]").forEach((button) => button.addEventListener("click", () => mutate(() => {
    const item = selectedItem(), key = button.dataset.resetImageTransform;
    const imageIndex = button.dataset.imageTransformIndex == null ? null : Number(button.dataset.imageTransformIndex);
    if (imageIndex == null) item.data[key] = defaultImageTransform();
    else {
      item.data[key] ||= [];
      item.data[key][imageIndex] = defaultImageTransform();
    }
  })));
  dom.quickEditor.querySelectorAll("input[data-item-color-field]").forEach((input) => {
    input.addEventListener("focus", beginTransaction);
    input.addEventListener("input", () => { selectedItem()[input.dataset.itemColorField] = input.value; renderCanvas(); });
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.quickEditor.querySelector("[data-reset-item-colors]")?.addEventListener("click", () => mutate(() => {
    const item = selectedItem(); ["paperColor", "accentColor", "borderColor", "highlightColor", "textColor"].forEach((key) => { item[key] = ""; });
  }));
  dom.quickEditor.querySelectorAll("input[data-image-field]").forEach((input) => input.addEventListener("change", async () => {
    const item = selectedItem(), field = input.dataset.imageField, itemId = item.id;
    const files = [...input.files].slice(0, field === "gallery" ? clamp(Number(item.data.count) || 4, 1, 6) : 1); if (!files.length) return;
    if (field === "gallery-slot") { await setGallerySlotFile(itemId, Number(input.dataset.galleryIndex), files[0]); return; }
    const urls = await Promise.all(files.map(fileToDataUrl)); mutate(() => {
      const target = selectedItem(), field = input.dataset.imageField;
      if (field === "gallery") {
        target.data.images = urls;
        target.data.imageTransforms = urls.map(() => defaultImageTransform());
      }
      else if (field === "video-main") { target.data.mainImage = urls[0]; target.data.mainImageTransform = defaultImageTransform(); }
      else if (field === "video-self") { target.data.selfImage = urls[0]; target.data.selfImageTransform = defaultImageTransform(); }
      else if (field === "messenger-avatar") { target.data.avatar = urls[0]; target.data.avatarTransform = defaultImageTransform(); }
      else if (field === "rack-item") {
        const index = Number(input.dataset.rackIndex);
        target.data.items[index].image = urls[0]; target.data.items[index].kind = "custom";
      }
      else { target.data.image = urls[0]; target.data.imageTransform = defaultImageTransform(); }
    });
  }));
  dom.quickEditor.querySelectorAll("[data-item-window-style]").forEach((button) => button.addEventListener("click", () => mutate(() => { selectedItem().windowStyle = button.dataset.itemWindowStyle; })));
  dom.quickEditor.querySelector("[data-action='front']")?.addEventListener("click", () => mutate(() => { const page = currentPage(), index = page.items.findIndex((item) => item.id === state.selectedItemId); page.items.push(page.items.splice(index, 1)[0]); }));
  dom.quickEditor.querySelector("[data-action='duplicate']")?.addEventListener("click", () => duplicateSelected());
  dom.quickEditor.querySelector("[data-action='delete']")?.addEventListener("click", () => deleteSelected());
}

function renderAll() { renderControls(); renderThemeGrid(); renderPaletteGrid(); renderDefaultWindowStyles(); renderPageTabs(); renderCanvas(); renderQuickEditor(); }
function addItem(type) { mutate(() => { const offset = (currentPage().items.length % 5) * .025; const item = itemPreset(type, offset); initializeItemLayouts(item, currentPage().items.length); Object.keys(item.layouts).forEach((ratio) => { item.layouts[ratio].x = clamp(item.layouts[ratio].x + offset, 0, 1 - item.layouts[ratio].w); item.layouts[ratio].y = clamp(item.layouts[ratio].y + offset, 0, 1 - item.layouts[ratio].h); }); Object.assign(item, clone(item.layouts[state.ratio])); currentPage().items.push(item); state.selectedItemId = item.id; toolboxEditMode = true; }); showToast(`${ITEM_NAMES[type]}을 추가했습니다.`); }
function deleteSelected() { if (!state.selectedItemId) return; mutate(() => { currentPage().items = currentPage().items.filter((item) => item.id !== state.selectedItemId); state.selectedItemId = null; toolboxEditMode = false; }); }
function duplicateSelected() { const item = selectedItem(); if (!item) return; mutate(() => { syncCurrentLayout(); const copy = clone(item); copy.id = makeId("item"); Object.values(copy.layouts).forEach((box) => { box.x = clamp(box.x + .035, 0, 1 - box.w); box.y = clamp(box.y + .035, 0, 1 - box.h); }); Object.assign(copy, clone(copy.layouts[state.ratio])); currentPage().items.push(copy); state.selectedItemId = copy.id; toolboxEditMode = true; }); }

function switchRatio(ratio) {
  if (!RATIO_DIMENSIONS[ratio] || ratio === state.ratio) return;
  mutate(() => { syncCurrentLayout(currentPage(), state.ratio); state.ratio = ratio; applyRatioLayout(currentPage(), ratio); state.selectedItemId = null; toolboxEditMode = false; });
}
function resetCurrentLayout() {
  mutate(() => {
    const page = currentPage();
    page.recommendedLayoutRevision = RECOMMENDED_LAYOUT_REVISION;
    const rack = page.items.find((item) => item.type === "rack" && item.data?.slot === "rack");
    if (rack) rack.data.direction = state.ratio === "1:1" ? "vertical" : "horizontal";
    page.items.forEach((item, index) => {
      const box = fitItemBoxAspect(item, recommendedBox(item, state.ratio, index), state.ratio);
      item.layouts[state.ratio] = clone(box);
      Object.assign(item, box);
      if (RECOMMENDED_WINDOW_STYLE_BY_TYPE[item.type]) item.windowStyle = RECOMMENDED_WINDOW_STYLE_BY_TYPE[item.type];
    });
    const messengerIndex = page.items.findIndex((item) => item.type === "messenger");
    if (messengerIndex >= 0) page.items.push(page.items.splice(messengerIndex, 1)[0]);
  });
  showToast(`${state.ratio} 추천 배치와 프레임을 적용했습니다.`);
}

function applyFrameChange(key, value) {
  mutate(() => { const pages = dom.frameScope.value === "all" ? state.pages : [currentPage()]; pages.forEach((page) => { page.frame[key] = value; }); });
}
function customPaletteFromControls() {
  return {
    window: dom.customPaletteWindow.value, titleBar: dom.customPaletteTitleBar.value,
    border: dom.customPaletteBorder.value, text: dom.customPaletteText.value,
    accent: dom.customPaletteAccent.value, shadow: dom.customPaletteShadow.value,
  };
}
function applyCustomPalette() {
  const palette = customPaletteFromControls();
  mutate(() => {
    const pages = dom.customPaletteScope.value === "all" ? state.pages : [currentPage()];
    pages.forEach((page) => {
      page.paletteId = "custom";
      page.paletteSourceId ||= `theme-${page.background.themeId || currentTheme().id}`;
      page.palette = clone(palette);
      page.frame.textColor = palette.border;
      page.items.forEach((item) => {
        item.textColor = "";
        item.paperColor = "";
        item.accentColor = "";
        item.borderColor = "";
        item.highlightColor = "";
      });
    });
  });
  showToast(dom.customPaletteScope.value === "all" ? "모든 페이지에 테마 색상을 적용했습니다." : "현재 페이지에 테마 색상을 적용했습니다.");
}
function applyFramePreset(preset) {
  mutate(() => { const pages = dom.frameScope.value === "all" ? state.pages : [currentPage()]; pages.forEach((page) => { page.frame.enabled = true; page.frame.preset = preset; if (preset === "ticker") { page.frame.topText ||= "welcome to my little corner of the internet"; page.frame.bottomText ||= "thanks for visiting · come back soon"; } if (preset === "status") page.frame.menuText = "ONLINE / PROFILE LOADED / 100%"; if (preset === "minimal") page.frame.textColor = "#ffffff"; }); });
}

function addPage(duplicate = false) {
  mutate(() => {
    syncCurrentLayout();
    const pageNumber = state.pages.length + 1;
    const page = duplicate ? clone(currentPage()) : defaultPage(pageNumber);
    page.id = makeId("page");
    page.name = `PAGE ${String(pageNumber).padStart(2, "0")}`;
    if (/^made with PROFILE\.ZIP · page \d+$/i.test(page.frame.bottomText)) page.frame.bottomText = `made with PROFILE.ZIP · page ${String(pageNumber).padStart(2, "0")}`;
    page.items.forEach((item) => { item.id = makeId("item"); });
    applyRatioLayout(page, state.ratio);
    state.pages.push(page);
    state.currentPageId = page.id;
    state.selectedItemId = null;
    toolboxEditMode = false;
  });
}
function deletePage() { if (state.pages.length === 1) return showToast("페이지는 하나 이상 필요합니다."); mutate(() => { const index = state.pages.findIndex((page) => page.id === state.currentPageId); state.pages.splice(index, 1); state.currentPageId = state.pages[Math.max(0, index - 1)].id; state.selectedItemId = null; toolboxEditMode = false; }); }

function saveProject() { syncCurrentLayout(); downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), "profile-zip-project.json"); showToast("프로젝트를 저장했습니다."); }
async function loadProject(file) { try { const parsed = JSON.parse(await file.text()); if (![2, 3].includes(parsed?.version) || !Array.isArray(parsed.pages)) throw new Error("format"); undoStack = []; redoStack = []; state = normalizeState(parsed); state.selectedItemId = null; toolboxEditMode = false; renderAll(); scheduleAutosave(); showToast("프로젝트를 불러왔습니다."); } catch { showToast("이 버전에서 만든 프로젝트 파일이 아닙니다."); } }

async function renderStageToBlob() {
  const oldSelection = state.selectedItemId;
  state.selectedItemId = null;
  renderCanvas();
  try {
    return await renderElementToPngBlob({
      element: dom.canvasStage,
      dimensions: RATIO_DIMENSIONS[state.ratio],
      scale: EXPORT_SCALE,
    });
  } finally {
    state.selectedItemId = oldSelection;
    renderCanvas();
  }
}
async function exportPng() { try { showToast("PNG를 만들고 있습니다…"); const blob = await renderStageToBlob(); if (!blob) throw new Error("empty"); downloadBlob(blob, `${currentPage().name.toLowerCase().replaceAll(" ", "-")}-${state.ratio.replace(":", "x")}.png`); showToast("PNG 저장을 시작했습니다."); } catch (error) { console.error(error); showToast("PNG 저장에 실패했습니다."); } }

let previewObjectUrl;
async function openPreview() {
  dom.previewOverlay.hidden = false;
  dom.previewOverlay.setAttribute("aria-busy", "true");
  dom.previewStatus.textContent = "고화질 미리보기를 만들고 있습니다…";
  dom.previewImage.hidden = true;
  document.body.classList.add("is-previewing");
  try {
    const blob = await renderStageToBlob();
    if (!blob) throw new Error("empty");
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(blob);
    dom.previewImage.src = previewObjectUrl;
    await dom.previewImage.decode();
    dom.previewImage.hidden = false;
    dom.previewStatus.textContent = `${currentPage().name} · ${state.ratio} · ${RATIO_DIMENSIONS[state.ratio].width * EXPORT_SCALE}×${RATIO_DIMENSIONS[state.ratio].height * EXPORT_SCALE}`;
  } catch (error) {
    console.error(error);
    dom.previewStatus.textContent = "미리보기를 만들지 못했습니다.";
  } finally {
    dom.previewOverlay.setAttribute("aria-busy", "false");
    dom.previewCloseBtn.focus();
  }
}

function closePreview() {
  dom.previewOverlay.hidden = true;
  document.body.classList.remove("is-previewing");
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
    dom.previewImage.removeAttribute("src");
  }
  dom.previewBtn.focus();
}

function setPreviewBackdrop(mode) {
  dom.previewOverlay.dataset.backdrop = mode;
  document.querySelectorAll("[data-preview-backdrop]").forEach((button) => {
    const active = button.dataset.previewBackdrop === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function bindEvents() {
  document.querySelectorAll("[data-ratio]").forEach((button) => button.addEventListener("click", () => switchRatio(button.dataset.ratio)));
  dom.resetLayoutBtn.addEventListener("click", resetCurrentLayout);
  document.querySelectorAll(".tool-tab").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".tool-tab").forEach((tab) => { const active = tab === button; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); }); document.querySelectorAll(".tool-panel").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === button.dataset.tab)); }));
  document.querySelectorAll("[data-add-item]").forEach((button) => button.addEventListener("click", () => addItem(button.dataset.addItem)));
  document.querySelectorAll("[data-frame-preset]").forEach((button) => button.addEventListener("click", () => applyFramePreset(button.dataset.framePreset)));
  dom.contextEditorBack.addEventListener("click", () => { toolboxEditMode = false; renderQuickEditor(); });
  dom.zoomRange.addEventListener("input", () => { state.zoom = Number(dom.zoomRange.value); dom.zoomOutput.value = `${state.zoom}%`; renderCanvas(); }); dom.zoomRange.addEventListener("change", scheduleAutosave);
  dom.undoBtn.addEventListener("click", undo); dom.redoBtn.addEventListener("click", redo); dom.saveProjectBtn.addEventListener("click", saveProject); dom.loadProjectBtn.addEventListener("click", () => dom.projectFileInput.click()); dom.projectFileInput.addEventListener("change", () => dom.projectFileInput.files?.[0] && loadProject(dom.projectFileInput.files[0])); dom.previewBtn.addEventListener("click", openPreview); dom.exportPngBtn.addEventListener("click", exportPng);
  dom.previewCloseBtn.addEventListener("click", closePreview);
  dom.previewOverlay.addEventListener("click", (event) => { if (event.target === dom.previewOverlay) closePreview(); });
  document.querySelectorAll("[data-preview-backdrop]").forEach((button) => button.addEventListener("click", () => setPreviewBackdrop(button.dataset.previewBackdrop)));
  dom.addPageBtn.addEventListener("click", () => addPage(false)); dom.duplicatePageBtn.addEventListener("click", () => addPage(true)); dom.deletePageBtn.addEventListener("click", deletePage);
  dom.backgroundUpload.addEventListener("change", async () => { const file = dom.backgroundUpload.files?.[0]; if (!file) return; const url = await fileToDataUrl(file); mutate(() => { currentPage().background.source = "custom"; currentPage().background.customUrl = url; }); });
  dom.applyCustomPalette.addEventListener("click", applyCustomPalette);
  dom.backgroundFit.addEventListener("change", () => mutate(() => { currentPage().background.fit = dom.backgroundFit.value; }));
  [dom.backgroundBlur, dom.backgroundBrightness, dom.overlayOpacity].forEach((input) => {
    input.addEventListener("pointerdown", beginTransaction);
    input.addEventListener("focus", beginTransaction);
  });
  dom.backgroundBlur.addEventListener("input", () => { currentPage().background.blur = Number(dom.backgroundBlur.value); dom.blurOutput.value = `${dom.backgroundBlur.value}px`; renderCanvas(); }); dom.backgroundBlur.addEventListener("change", () => { commitTransaction(); renderAll(); });
  dom.backgroundBrightness.addEventListener("input", () => { currentPage().background.brightness = Number(dom.backgroundBrightness.value); dom.brightnessOutput.value = `${dom.backgroundBrightness.value}%`; renderCanvas(); }); dom.backgroundBrightness.addEventListener("change", () => { commitTransaction(); renderAll(); });
  dom.overlayColor.addEventListener("change", () => mutate(() => { currentPage().background.overlayColor = dom.overlayColor.value; }));
  dom.overlayOpacity.addEventListener("input", () => { currentPage().background.overlayOpacity = Number(dom.overlayOpacity.value); dom.overlayOutput.value = `${dom.overlayOpacity.value}%`; renderCanvas(); }); dom.overlayOpacity.addEventListener("change", () => { commitTransaction(); renderAll(); });
  dom.frameEnabled.addEventListener("change", () => applyFrameChange("enabled", dom.frameEnabled.checked));
  [[dom.frameTopText, "topText"], [dom.frameMenuText, "menuText"], [dom.frameBottomText, "bottomText"], [dom.frameTextColor, "textColor"]].forEach(([input, key]) => {
    input.addEventListener("focus", beginTransaction);
    input.addEventListener("input", () => {
      const pages = dom.frameScope.value === "all" ? state.pages : [currentPage()];
      pages.forEach((page) => { page.frame[key] = input.value; });
      renderCanvas();
    });
    input.addEventListener("blur", () => { commitTransaction(); updateUndoButtons(); });
  });
  dom.canvasStage.addEventListener("pointerdown", (event) => { if (event.target === dom.canvasStage || event.target.classList.contains("canvas-overlay") || event.target.classList.contains("canvas-background")) { state.selectedItemId = null; toolboxEditMode = false; renderCanvas(); renderQuickEditor(); } });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !dom.previewOverlay.hidden) { event.preventDefault(); closePreview(); return; } const typing = document.activeElement?.matches("input,textarea,select"); if ((event.key === "Delete" || event.key === "Backspace") && !typing) { event.preventDefault(); deleteSelected(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && !typing) { event.preventDefault(); duplicateSelected(); } });
}

const launchParams = new URLSearchParams(location.search);
if (launchParams.get("fresh") === "1") {
  await clearAutosave(STORAGE_KEY);
  history.replaceState(null, "", location.pathname);
}
const restoredState = await restoreAutosave(STORAGE_KEY);
const validRestoredState = restoredState?.version === 3 && Array.isArray(restoredState.pages) && restoredState.pages.length ? restoredState : null;
state = normalizeState(validRestoredState || freshState());
hydratePixelIcons();
bindEvents();
setPreviewBackdrop("dark");
renderAll();
