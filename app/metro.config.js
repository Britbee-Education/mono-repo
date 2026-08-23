const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

function pkgDir(name) {
  const fromApp = path.join(projectRoot, "node_modules", name);
  if (fs.existsSync(fromApp)) return fromApp;
  return path.join(workspaceRoot, "node_modules", name);
}

function pkgRealDir(name) {
  const dir = pkgDir(name);
  try {
    return fs.realpathSync(dir);
  } catch {
    return dir;
  }
}

const pnpmStore = path.join(workspaceRoot, "node_modules", ".pnpm");
const watch = new Set([
  projectRoot,
  workspaceRoot,
  path.join(workspaceRoot, "node_modules"),
]);
if (fs.existsSync(pnpmStore)) watch.add(pnpmStore);

for (const pkg of ["expo-av", "expo-document-picker", "expo-image-picker", "buffer", "punycode", "semver"]) {
  watch.add(pkgRealDir(pkg));
}

config.watchFolders = Array.from(watch);
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const bufferDir = pkgRealDir("buffer");
const punycodeDir = pkgRealDir("punycode");
const expoAvDir = pkgRealDir("expo-av");
const documentPickerDir = pkgRealDir("expo-document-picker");
const imagePickerDir = pkgRealDir("expo-image-picker");
const semverDir = pkgRealDir("semver");

const extraNodeModules = {
  "@britbee/config": path.resolve(workspaceRoot, "packages/config"),
  "@britbee/shared": path.resolve(workspaceRoot, "packages/shared"),
  "@expo-google-fonts/poppins": path.resolve(workspaceRoot, "node_modules/@expo-google-fonts/poppins"),
  "expo-av": expoAvDir,
  "expo-document-picker": documentPickerDir,
  "expo-image-picker": imagePickerDir,
  buffer: bufferDir,
  "buffer/": bufferDir,
  punycode: punycodeDir,
  "punycode/": punycodeDir,
};

config.resolver.extraNodeModules = new Proxy(extraNodeModules, {
  get(target, name) {
    if (typeof name !== "string") return undefined;
    const key = name.replace(/\/+$/, "") || name;
    if (target[name]) return target[name];
    if (target[key]) return target[key];
    const fromApp = path.join(projectRoot, "node_modules", key);
    if (fs.existsSync(fromApp)) return pkgRealDir(key);
    const fromRoot = path.join(workspaceRoot, "node_modules", key);
    if (fs.existsSync(fromRoot)) return pkgRealDir(key);
    return fromApp;
  },
  has(target, name) {
    if (typeof name !== "string") return name in target;
    if (name in target) return true;
    const key = name.replace(/\/+$/, "");
    if (key in target) return true;
    return fs.existsSync(path.join(projectRoot, "node_modules", key)) || fs.existsSync(path.join(workspaceRoot, "node_modules", key));
  },
});

const origResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const raw = String(moduleName || "");
  const name = raw.replace(/\/+$/, "");
  if (name === "buffer") {
    return { type: "sourceFile", filePath: path.join(bufferDir, "index.js") };
  }
  if (name === "punycode") {
    const file = fs.existsSync(path.join(punycodeDir, "punycode.js"))
      ? path.join(punycodeDir, "punycode.js")
      : path.join(punycodeDir, "index.js");
    if (fs.existsSync(file)) {
      return { type: "sourceFile", filePath: file };
    }
  }
  if (name === "expo-av") {
    return { type: "sourceFile", filePath: path.join(expoAvDir, "build/index.js") };
  }
  if (name === "expo-document-picker") {
    return { type: "sourceFile", filePath: path.join(documentPickerDir, "build/index.js") };
  }
  if (name === "expo-image-picker") {
    return { type: "sourceFile", filePath: path.join(imagePickerDir, "build/ImagePicker.js") };
  }
  if (name === "semver" || name.startsWith("semver/")) {
    const rel = name === "semver" ? "index.js" : `${name.slice("semver/".length)}.js`;
    const filePath = path.join(semverDir, rel);
    if (fs.existsSync(filePath)) {
      return { type: "sourceFile", filePath };
    }
  }
  try {
    if (origResolve) return origResolve(context, moduleName, platform);
    return context.resolveRequest(context, moduleName, platform);
  } catch (err) {
    if (raw.startsWith(".") || raw.startsWith("/")) throw err;
    try {
      return {
        type: "sourceFile",
        filePath: require.resolve(raw, { paths: [projectRoot, workspaceRoot] }),
      };
    } catch {
      throw err;
    }
  }
};

module.exports = config;
