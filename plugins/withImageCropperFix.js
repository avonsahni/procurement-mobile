const { withProjectBuildGradle } = require('@expo/config-plugins');

// expo-image-picker depends on `com.github.CanHub:Android-Image-Cropper`, which is
// published only on JitPack. JitPack now sits behind a Cloudflare bot challenge that
// returns HTTP 403 to Gradle, so the dependency fails to resolve and the Android build
// dies at dependency resolution. `com.vanniktech:android-image-cropper` is the maintained
// continuation of the same fork, published on Maven Central, and ships the identical
// `com.canhub.cropper` package/classes — so substituting it is source/binary compatible.
//
// The substitution is injected at the root (allprojects) so it applies to every
// subproject, including `:expo-image-picker` itself (not just `:app`).
const MARKER = '// withImageCropperFix';
const SUBSTITUTION = `
${MARKER}: resolve Android-Image-Cropper from Maven Central instead of the Cloudflare-gated JitPack.
allprojects {
    configurations.all {
        resolutionStrategy.dependencySubstitution {
            substitute module('com.github.CanHub:Android-Image-Cropper') using module('com.vanniktech:android-image-cropper:4.3.3')
        }
    }
}
`;

module.exports = function withImageCropperFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withImageCropperFix: expected android/build.gradle to be groovy');
    }
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += SUBSTITUTION;
    }
    return config;
  });
};
