import { readFileSync, writeFileSync } from "fs";

// Read the current version from package.json
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const currentVersion = packageJson.version;

// Read the current manifest
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

// Update manifest version
manifest.version = currentVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update versions.json
const lastVersion = Object.keys(versions)[0];
versions[currentVersion] = lastVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

console.log(`Updated to version ${currentVersion}`);
