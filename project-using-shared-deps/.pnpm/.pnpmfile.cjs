// config
const SHARED_DEPS_PACKAGE_NAME = "@my/shared-deps";
// end of config

const { execSync } = require("node:child_process");
console.log("✨ installing dependencies from SHARED_DEPS_PACKAGE_NAME", SHARED_DEPS_PACKAGE_NAME);

function getExternalDependencies(packageName, packageVersion) {
  // if the package version has a ":", character, it's full specifier and we can use it as is (e.g. "file:../shared-deps")
  // otherwise, we need to prefix it with the package name (e.g. "@my/shared-deps@1")
  const packageSpec = packageVersion.includes(":") ? packageVersion : `${packageName}@${packageVersion}`;
  try {
    const result = execSync(`npm view '${packageSpec}' dependencies --json`);
    return JSON.parse(result.toString());
  } catch (err) {
    console.error(
      `\n\n\nFATAL: Could not read shared dependencies from SHARED_DEPS_PACKAGE_NAME ${SHARED_DEPS_PACKAGE_NAME}!\n\n\n`,
      err.message
    );
    process.exit(1);
  }
}

function readPackage(pkg) {
  // Only modify packages that depend on the shared package
  const sharedPackageVersion = pkg.dependencies && pkg.dependencies[SHARED_DEPS_PACKAGE_NAME];
  if (!sharedPackageVersion) {
    return pkg;
  }

  const sharedDeps = getExternalDependencies(SHARED_DEPS_PACKAGE_NAME, sharedPackageVersion);

  // Merge the dependencies from shared package.
  // Dont remove the shared package from the dependencies, so it turns up when asking e.g. "pnpm why react".
  // it wont take up any space because pnpm uses symlinks.
  pkg.dependencies = {
    ...sharedDeps,
    ...pkg.dependencies,
  };

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
