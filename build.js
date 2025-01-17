const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Add "fs" and "path" to the external modules list
const nativeExternals = ["@neptune", "@plugin", "electron", "fs", "path"];

const plugins = fs.readdirSync("./plugins");
for (const plugin of plugins) {
  let pluginPath = path.join("./plugins/", plugin);

  const pluginManifest = JSON.parse(
    fs.readFileSync(path.join(pluginPath, "plugin.json"))
  );

  const outfile = path.join(pluginPath, "dist/index.js");

  esbuild
    .build({
      loader: { ".ts": "ts" }, // Support TypeScript
      entryPoints: [
        "./" + path.join(pluginPath, pluginManifest.main ?? "index.js"),
      ],
      plugins: [
        {
          name: "resolve-alias",
          setup(build) {
            const libPath = path.resolve("_lib");
            build.onResolve({ filter: /^@inrixia\/lib\// }, (args) => {
              let resolvedPath = path.join(libPath, args.path.replace("@inrixia/lib/", ""));
              if (!fs.existsSync(resolvedPath)) {
                if (fs.existsSync(resolvedPath + ".ts")) {
                  resolvedPath += ".ts";
                } else if (fs.existsSync(resolvedPath + ".js")) {
                  resolvedPath += ".js";
                } else {
                  console.error("File not found:", resolvedPath);
                }
              }
              return { path: resolvedPath };
            });
          },
        },
        {
          name: "neptuneNativeImports",
          setup(build) {
            build.onLoad(
              { filter: /.*[\\/].+\\.native\\.[a-z]+/g },
              async (args) => {
                const result = await esbuild.build({
                  entryPoints: [args.path],
                  bundle: true,
                  minify: true,
                  platform: "node", // Ensure node platform for native imports
                  format: "iife",
                  globalName: "neptuneExports",
                  write: false,
                  external: nativeExternals, // Mark native modules as external
                });

                const outputCode = result.outputFiles[0].text;

                const { metafile } = await esbuild.build({
                  entryPoints: [args.path],
                  platform: "node", // Ensure node platform for metadata extraction
                  write: false,
                  metafile: true,
                  bundle: true,
                  format: "esm",
                  external: nativeExternals, // Mark native modules as external
                });

                const builtExports = Object.values(metafile.outputs)[0].exports;

                return {
                  contents: `import {addUnloadable} from "@plugin";const contextId=NeptuneNative.createEvalScope(${JSON.stringify(
                    outputCode
                  )});${builtExports
                    .map(
                      (e) =>
                        `export ${
                          e == "default" ? "default " : `const ${e} =`
                        } NeptuneNative.getNativeValue(contextId,${JSON.stringify(
                          e
                        )})`
                    )
                    .join(
                      ";"
                    )};addUnloadable(() => NeptuneNative.deleteEvalScope(contextId))`,
                };
              }
            );
          },
        },
      ],
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser", // Browser platform for plugin code
      external: nativeExternals, // Mark external modules
      outfile,
    })
    .then(() => {
      fs.createReadStream(outfile)
        .pipe(crypto.createHash("md5").setEncoding("hex"))
        .on("finish", function () {
          fs.writeFileSync(
            path.join(pluginPath, "dist/manifest.json"),
            JSON.stringify({
              name: pluginManifest.name,
              description: pluginManifest.description,
              author: pluginManifest.author,
              hash: this.read(),
            })
          );

          console.log("Built " + pluginManifest.name + "!");
        });
    })
    .catch((err) => {
      console.error("Build failed for", plugin, ":", err);
    });
}