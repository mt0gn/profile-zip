export const RATIO_DIMENSIONS = {
  "4:3": { width: 1200, height: 900 },
  "1:1": { width: 1000, height: 1000 },
  "3:4": { width: 900, height: 1200 },
};

export const EXPORT_SCALE = 2;

export const BACKGROUND_THEMES = [
  { id: "tomato", name: "Tomato Picnic", variants: { "4:3": "assets/backgrounds/tomato-4x3.png", "1:1": "assets/backgrounds/tomato-1x1.png", "3:4": "assets/backgrounds/tomato-3x4.png" }, defaults: { blur: 0, brightness: 95, overlayColor: "#f7e5c9", overlayOpacity: 6 }, palette: { window: "#fff1dc", titleBar: "#ee7968", border: "#304652", text: "#263c45", accent: "#afbd74", shadow: "#52697a" } },
  { id: "cake", name: "Cherry Cake", variants: { "4:3": "assets/backgrounds/cake-4x3.png", "1:1": "assets/backgrounds/cake-1x1.png", "3:4": "assets/backgrounds/cake-3x4.png" }, defaults: { blur: 0, brightness: 98, overlayColor: "#fff4f7", overlayOpacity: 8 }, palette: { window: "#fff7ee", titleBar: "#eaa3bb", border: "#36516b", text: "#263b58", accent: "#b34c57", shadow: "#527fa7" } },
  { id: "bathroom", name: "Pastel Bath", variants: { "4:3": "assets/backgrounds/bathroom-4x3.png", "1:1": "assets/backgrounds/bathroom-1x1.png", "3:4": "assets/backgrounds/bathroom-3x4.png" }, defaults: { blur: 0, brightness: 97, overlayColor: "#fff4ef", overlayOpacity: 5 }, palette: { window: "#fff7ee", titleBar: "#e9aeb6", border: "#426477", text: "#354b58", accent: "#a8d2d7", shadow: "#718b95" } },
  { id: "trumpet", name: "Trumpet Vine", variants: { "4:3": "assets/backgrounds/trumpet-4x3.png", "1:1": "assets/backgrounds/trumpet-1x1.png", "3:4": "assets/backgrounds/trumpet-3x4.png" }, defaults: { blur: 0, brightness: 94, overlayColor: "#f7c793", overlayOpacity: 5 }, palette: { window: "#fff0d5", titleBar: "#e98368", border: "#2f5152", text: "#294645", accent: "#cec177", shadow: "#5d6660" } },
  { id: "gas", name: "Orange Highway", variants: { "4:3": "assets/backgrounds/gas-4x3.png", "1:1": "assets/backgrounds/gas-1x1.png", "3:4": "assets/backgrounds/gas-3x4.png" }, defaults: { blur: 0, brightness: 98, overlayColor: "#d8d1b9", overlayOpacity: 5 }, palette: { window: "#f7ebd4", titleBar: "#e99b63", border: "#344754", text: "#28333a", accent: "#6da9bd", shadow: "#6b5b4a" } },
  { id: "deskbook", name: "Amber Bookshelf", variants: { "4:3": "assets/backgrounds/deskbook-4x3.png", "1:1": "assets/backgrounds/deskbook-1x1.png", "3:4": "assets/backgrounds/deskbook-3x4.png" }, defaults: { blur: 1, brightness: 87, overlayColor: "#2d160d", overlayOpacity: 12 }, palette: { window: "#f3e4ca", titleBar: "#c77c45", border: "#3d2a26", text: "#3a2924", accent: "#d2b897", shadow: "#20130e" } },
  { id: "vinyl", name: "Vinyl Afternoon", variants: { "4:3": "assets/backgrounds/vinyl-4x3.png", "1:1": "assets/backgrounds/vinyl-1x1.png", "3:4": "assets/backgrounds/vinyl-3x4.png" }, defaults: { blur: 0, brightness: 88, overlayColor: "#2b2119", overlayOpacity: 8 }, palette: { window: "#efe2c5", titleBar: "#b18c61", border: "#29251f", text: "#302a23", accent: "#8ba7ab", shadow: "#18130f" } },
  { id: "lemon", name: "Lemon Tea", variants: { "4:3": "assets/backgrounds/lemon-4x3.png", "1:1": "assets/backgrounds/lemon-1x1.png", "3:4": "assets/backgrounds/lemon-3x4.png" }, defaults: { blur: 0, brightness: 97, overlayColor: "#fff9db", overlayOpacity: 4 }, palette: { window: "#fffbea", titleBar: "#eacb67", border: "#3d5c67", text: "#304953", accent: "#a4dfd3", shadow: "#6b8b92" } },
  { id: "laundromat", name: "Sunny Laundromat", variants: { "4:3": "assets/backgrounds/laundromat-4x3.png", "1:1": "assets/backgrounds/laundromat-1x1.png", "3:4": "assets/backgrounds/laundromat-3x4.png" }, defaults: { blur: 0, brightness: 97, overlayColor: "#fff2c7", overlayOpacity: 4 }, palette: { window: "#fff8dc", titleBar: "#ecd083", border: "#3e696d", text: "#36565a", accent: "#a6c9f2", shadow: "#668b89" } },
  { id: "sofa", name: "Sunlit Sofa", variants: { "4:3": "assets/backgrounds/sofa-4x3.png", "1:1": "assets/backgrounds/sofa-1x1.png", "3:4": "assets/backgrounds/sofa-3x4.png" }, defaults: { blur: 0, brightness: 91, overlayColor: "#f4ead4", overlayOpacity: 7 }, palette: { window: "#f8f2e5", titleBar: "#e1dbe2", border: "#58666b", text: "#414d51", accent: "#f2e2a6", shadow: "#869093" } },
  { id: "tropical", name: "Glasshouse", variants: { "4:3": "assets/backgrounds/tropical-4x3.png", "1:1": "assets/backgrounds/tropical-1x1.png", "3:4": "assets/backgrounds/tropical-3x4.png" }, defaults: { blur: 1, brightness: 91, overlayColor: "#063c38", overlayOpacity: 10 }, palette: { window: "#edf4df", titleBar: "#80bca0", border: "#234845", text: "#173a32", accent: "#cbd993", shadow: "#07312d" } },
  { id: "lilypad", name: "Moonlit Lilypad", variants: { "4:3": "assets/backgrounds/lilypad-4x3.png", "1:1": "assets/backgrounds/lilypad-1x1.png", "3:4": "assets/backgrounds/lilypad-3x4.png" }, defaults: { blur: 1, brightness: 86, overlayColor: "#101936", overlayOpacity: 13 }, palette: { window: "#e9f0df", titleBar: "#779889", border: "#26384b", text: "#263d43", accent: "#737db0", shadow: "#12182b" } },
  { id: "mintsea", name: "Mint Sea", variants: { "4:3": "assets/backgrounds/mintsea-4x3.png", "1:1": "assets/backgrounds/mintsea-1x1.png", "3:4": "assets/backgrounds/mintsea-3x4.png" }, defaults: { blur: 0, brightness: 94, overlayColor: "#e6faf2", overlayOpacity: 4 }, palette: { window: "#f5f3e8", titleBar: "#8fc8c2", border: "#3d6168", text: "#315159", accent: "#b4e4cd", shadow: "#66868b" } },
  { id: "clifftown", name: "Blue Clifftown", variants: { "4:3": "assets/backgrounds/clifftown-4x3.png", "1:1": "assets/backgrounds/clifftown-1x1.png", "3:4": "assets/backgrounds/clifftown-3x4.png" }, defaults: { blur: 0, brightness: 95, overlayColor: "#e9eef8", overlayOpacity: 4 }, palette: { window: "#f8f3e5", titleBar: "#8ca9ee", border: "#304d75", text: "#2c4363", accent: "#d9c69d", shadow: "#55719a" } },
  { id: "alley", name: "Starlit Alley", variants: { "4:3": "assets/backgrounds/alley-4x3.png", "1:1": "assets/backgrounds/alley-1x1.png", "3:4": "assets/backgrounds/alley-3x4.png" }, defaults: { blur: 1, brightness: 86, overlayColor: "#07152d", overlayOpacity: 18 }, palette: { window: "#eef2ee", titleBar: "#79aaa8", border: "#203f45", text: "#173b2c", accent: "#d6b3cf", shadow: "#061326" } },
  { id: "winter", name: "Winter Window", variants: { "4:3": "assets/backgrounds/winter-4x3.png", "1:1": "assets/backgrounds/winter-1x1.png", "3:4": "assets/backgrounds/winter-3x4.png" }, defaults: { blur: 0, brightness: 93, overlayColor: "#172731", overlayOpacity: 9 }, palette: { window: "#eef3ee", titleBar: "#8baec7", border: "#2d3c40", text: "#243238", accent: "#c7cee1", shadow: "#12191c" } },
  { id: "flower", name: "Violet Meadow", variants: { "4:3": "assets/backgrounds/flower-4x3.png", "1:1": "assets/backgrounds/flower-1x1.png", "3:4": "assets/backgrounds/flower-3x4.png" }, defaults: { blur: 0, brightness: 91, overlayColor: "#323764", overlayOpacity: 8 }, palette: { window: "#f1eff7", titleBar: "#9da1cf", border: "#3d456b", text: "#333955", accent: "#d2c7e5", shadow: "#242948" } },
  { id: "library", name: "Midnight Library", variants: { "4:3": "assets/backgrounds/library-4x3.png", "1:1": "assets/backgrounds/library-1x1.png", "3:4": "assets/backgrounds/library-3x4.png" }, defaults: { blur: 1, brightness: 82, overlayColor: "#201712", overlayOpacity: 18 }, palette: { window: "#f1e4cc", titleBar: "#a47b60", border: "#352723", text: "#34241e", accent: "#86b5ca", shadow: "#130e0c" } },
  { id: "typewriter", name: "Silver Typewriter", variants: { "4:3": "assets/backgrounds/typewriter-4x3.png", "1:1": "assets/backgrounds/typewriter-1x1.png", "3:4": "assets/backgrounds/typewriter-3x4.png" }, defaults: { blur: 0, brightness: 90, overlayColor: "#e8ebee", overlayOpacity: 5 }, palette: { window: "#f5f3ed", titleBar: "#bec2c6", border: "#454b50", text: "#343a3e", accent: "#e9f0f1", shadow: "#72787c" } },
  { id: "audio", name: "Cassette Studio", variants: { "4:3": "assets/backgrounds/audio-4x3.png", "1:1": "assets/backgrounds/audio-1x1.png", "3:4": "assets/backgrounds/audio-3x4.png" }, defaults: { blur: 1, brightness: 84, overlayColor: "#171b18", overlayOpacity: 12 }, palette: { window: "#ece7d7", titleBar: "#7c8588", border: "#2c322f", text: "#2d332f", accent: "#d3c7ab", shadow: "#151816" } },
];

const BACKGROUND_THEME_ORDER = [
  "tomato", "cake", "bathroom", "flower", "alley", "winter", "clifftown",
  "mintsea", "tropical", "lilypad", "lemon", "laundromat", "gas", "trumpet",
  "deskbook", "vinyl", "library", "sofa", "typewriter", "audio",
];
BACKGROUND_THEMES.sort((a, b) => BACKGROUND_THEME_ORDER.indexOf(a.id) - BACKGROUND_THEME_ORDER.indexOf(b.id));

export const PALETTE_KITS = [
  { id: "mono-light", name: "모노 라이트", palette: { window: "#f5f4ef", titleBar: "#d5d6d4", border: "#292929", text: "#242424", accent: "#ffffff", shadow: "#777777" } },
  { id: "mono-dark", name: "모노 다크", palette: { window: "#29282c", titleBar: "#45434a", border: "#111114", text: "#f4f2ed", accent: "#8e949b", shadow: "#08080a" } },
];

export const STORAGE_KEY = "profile-zip-home-v3";
export const MAX_HISTORY = 40;
export const SMART_GUIDE_PX = 7;
export const SMART_SNAP_PX = 3;
export const SMART_MARGIN_SNAP_PX = 6;
export const WINDOW_STYLES = [
  { id: "clean", name: "클린 카드", hint: "둥근 카드" },
  { id: "slim", name: "슬림 바", hint: "얇은 제목줄" },
  { id: "y2k", name: "Y2K 바", hint: "픽셀 장식" },
  { id: "classic", name: "클래식 PC", hint: "메뉴 포함" },
  { id: "outline", name: "아웃라인", hint: "외곽선만" },
  { id: "frameless", name: "프레임리스", hint: "내용만" },
];
export const WINDOWED_TYPES = new Set(["gallery", "note", "music", "tags", "recent", "messenger", "video", "rack"]);
export const PIXEL_DECORATION_TYPES = ["folder", "file", "imageapp", "videoapp", "camera", "notification", "chat", "appmusic", "paint", "internet", "memory", "trash"];
export const SYSTEM_DECORATION_TYPES = ["dialog", "warning", "cursor"];
export const SYSTEM_DECORATION_PIXELS = Object.freeze({
  dialog: Object.freeze({ width: 210, height: 112 }),
  warning: Object.freeze({ width: 80, height: 80 }),
  cursor: Object.freeze({ width: 56, height: 56 }),
});
export const SYSTEM_DECORATION_TYPE_SET = new Set(SYSTEM_DECORATION_TYPES);
export const RACK_ITEM_KINDS = [...PIXEL_DECORATION_TYPES, "custom"];
export const VECTOR_DECORATION_TYPES = SYSTEM_DECORATION_TYPES;
export const DECORATION_ASPECTS = { ...Object.fromEntries([...PIXEL_DECORATION_TYPES, ...SYSTEM_DECORATION_TYPES].map((type) => [type, 1])), dialog: 1.2 };
export const DECORATION_WIDTHS = Object.fromEntries([...PIXEL_DECORATION_TYPES, ...SYSTEM_DECORATION_TYPES].map((type) => [type, .10]));
export const DECORATION_TYPES = new Set(Object.keys(DECORATION_ASPECTS));
export const RECOMMENDED_LAYOUT_REVISION = 21;
export const CONTENT_STRUCTURE_REVISION = 4;
export const CONTENT_MINIMUM_PIXELS = {
  gallery: { width: 240, height: 180 }, note: { width: 260, height: 150 }, music: { width: 280, height: 125 },
  tags: { width: 220, height: 110 }, recent: { width: 260, height: 105 }, messenger: { width: 240, height: 175 },
  video: { width: 280, height: 260 }, rack: { width: 132, height: 116 },
};
export const RECOMMENDED_WINDOW_STYLE_BY_TYPE = { gallery: "slim", note: "slim", music: "clean", tags: "y2k", recent: "outline", messenger: "frameless", video: "slim" };
export const DEFAULT_WINDOW_STYLE_BY_TYPE = RECOMMENDED_WINDOW_STYLE_BY_TYPE;
export const PROFILE_CARD_LAYOUTS = ["design", "horizontal", "vertical"];
export const DEFAULT_PROFILE_CARD_LAYOUTS = { "4:3": "design", "1:1": "horizontal", "3:4": "vertical" };
export const PROFILE_CARD_ASPECTS = { design: 2.5, horizontal: 1.68, vertical: 2 / 3 };
export const HOME_LAYOUTS = {
  "4:3": {
    profile: [.04, .11, .52, .277333], gallery: [.592, .12, .374, .44], likes: [.04, .42, .403, .52],
    messenger: [.462, .57, .208, .37], rack: [.698, .60, .241, .11], music: [.698, .75, .278, .14],
    note: [.59, .45, .37, .20], video: [.46, .43, .32, .39], recent: [.04, .80, .29, .13], photo: [.59, .07, .37, .36],
  },
  "1:1": {
    profile: [.05, .08, .48, .285714], gallery: [.55, .10, .41, .345], likes: [.05, .405, .45, .52],
    messenger: [.55, .47, .24, .273], rack: [.825, .485, .135, .24], music: [.54, .79, .42, .15],
    note: [.55, .08, .41, .215], video: [.15, .385, .41, .386], recent: [.05, .76, .27, .105], photo: [.55, .10, .41, .345],
  },
  "3:4": {
    profile: [.04, .085, .32, .36], likes: [.388, .082, .579, .34], gallery: [.441, .445, .523, .34],
    messenger: [.04, .482, .362, .326], rack: [.034, .838, .375, .102], music: [.449, .817, .497, .124],
    note: [.39, .055, .575, .24], video: [.04, .405, .485, .395], recent: [.04, .835, .335, .101], photo: [.54, .38, .42, .35],
  },
};
