const { execSync } = require("node:child_process");
const SHARED_DEPS_PACKAGE_PROP = "sharedDependencyPackages";

function getExternalDependencies(packageName, packageVersion) {
  // if the package version has a ":", character, it's full specifier and we can use it as is (e.g. "file:../shared-deps")
  // otherwise, we need to prefix it with the package name (e.g. "@my/shared-deps@1")
  const packageSpec = packageVersion.includes(":") ? packageVersion : `${packageName}@${packageVersion}`;
  try {
    const result = execSync(`pnpm view '${packageSpec}' dependencies --json`);
    return JSON.parse(result.toString());
  } catch (err) {
    console.error(`\n\n\nFATAL: Could not read shared dependencies from ${packageSpec}!\n\n\n`, err.message);
    process.exit(1);
  }
}

function readPackage(pkg, context) {
  // Only modify packages that have a SHARED_DEPS_PACKAGE_PROP property and depend on one of the shared dependencies.
  const sharedDependencyPackages = pkg[SHARED_DEPS_PACKAGE_PROP];

  if (
    !Array.isArray(sharedDependencyPackages) ||
    !sharedDependencyPackages.length ||
    !Object.keys(pkg.dependencies || {}).some((dep) => sharedDependencyPackages.includes(dep))
  ) {
    return pkg;
  }

  let sharedDeps = {};
  sharedDependencyPackages.forEach((sharedDepPkg) => {
    const sharedPackageVersion = pkg.dependencies && pkg.dependencies[sharedDepPkg];
    if (!sharedPackageVersion) {
      return;
    }

    context.log(
      `✨ installing dependencies from shared dependency package: ${sharedDepPkg} version ${sharedPackageVersion}`
    );
    sharedDeps = { ...sharedDeps, ...getExternalDependencies(sharedDepPkg, sharedPackageVersion) };
  });

  // Merge the dependencies from shared packages.
  // Dont remove the shared packages themselfes from the dependencies, so it turns up when asking e.g. "pnpm why react".
  // They and their dependencies wont take up any space, because pnpm uses symlinks.
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
