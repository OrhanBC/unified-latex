/**
 * Autogenerate documentation for source files. This assumes a very specific format.
 *
 * run with
 * ```
 * npx esr scripts/build-docs.ts
 * ```
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { glob } from "glob";

async function getImportsInDir(dirname): Promise<string[]> {
    const files = glob.sync(`${dirname}/**/*.ts`);
    let ret: string[] = [];
    for (const f of files) {
        if (f.match(/test/)) {
            continue;
        }
        const contents = await fs.readFile(f, "utf-8");
        for (const m of contents.matchAll(/from "([^"]+)"/g)) {
            const imp = m[1];
            if (!imp.startsWith(".")) {
                ret.push(imp);
            }
        }
    }
    ret = ret.map((m) => m.match(/[^/]+\/[^/]+|[^/]+/)[0]);
    return Array.from(new Set(ret));
}

// We can only import ESM modules via async import, so all the action happens here.
(async function () {
    const chalk = await (await import("chalk")).default;

    // Find all the files we want to process. These have th form .../unified-latex.../index.ts,
    // however we only want the top-level index.ts files (no any that may be in subdirectories).
    const packageJsonFiles = glob.sync(
        "./packages/unified-latex*/package.json"
    );
    for (const packageJsonFile of packageJsonFiles) {
        const packageJson = JSON.parse(
            await fs.readFile(packageJsonFile, "utf-8")
        );
        const projectDir = path.dirname(packageJsonFile);
        const jsonImports = Object.keys(packageJson.dependencies);
        const trueImports = await getImportsInDir(projectDir);
        jsonImports.sort();
        trueImports.sort();

        const excessImport = jsonImports.filter(
            (i) => !trueImports.includes(i)
        );
        const missingImport = trueImports.filter(
            (i) => !jsonImports.includes(i)
        );

        console.log(packageJsonFile);

        const packageName = packageJson.name;
        const computedPackageName = `@unified-latex/${path.basename(
            projectDir
        )}`;
        if (packageName !== computedPackageName) {
            console.log(
                chalk.bgCyan.bold("Package-name/folder name mismatch"),
                "package is named",
                packageName,
                "but folder is named",
                path.basename(projectDir)
            );
        }

        if (missingImport.length > 0) {
            console.log(chalk.gray("   The following imports are *missing*"));
            console.log(chalk.red("     " + missingImport.join("\n     ")));
        }
        if (excessImport.length > 0) {
            console.log(
                chalk.gray(
                    "   The following imports are included in package.json but shouldn't be"
                )
            );
            console.log(chalk.blue("     " + excessImport.join("\n     ")));
        }

    }
})();