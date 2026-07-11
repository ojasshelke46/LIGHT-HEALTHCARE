// Expo + pnpm monorepo Metro config (D-46). watchFolders = repo root so Metro
// can resolve the hoisted workspace deps and @light/shared-types; NativeWind
// transform wraps the default config.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// NOTE (Rule 1 fix, 04-01 Task 3): disableHierarchicalLookup was originally
// `true` per the D-46 recipe (correct for a hoisted npm/yarn-workspace
// node_modules layout). This repo's pnpm store uses pnpm's default isolated
// layout, where a package's *own* transitive deps (e.g. expo-router's
// @expo/metro-runtime, nativewind's react-native-css-interop/jsx-runtime,
// @babel/runtime) only resolve by walking up from the requiring file via
// standard hierarchical lookup — disabling it broke `expo export` (verified:
// module-not-found errors for exactly those three packages). Hierarchical
// lookup stays enabled; nodeModulesPaths above remains as an explicit
// fallback for the hoisted workspace deps (@light/shared-types etc.).
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: "./global.css" });
