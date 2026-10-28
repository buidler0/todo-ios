// iOS 27 refuses to launch apps without the UIScene life cycle, and the Expo SDK 57
// template still starts React Native from the app delegate. Hand the window to
// Expo's own ExpoAppSceneDelegate instead. Remove once the template adopts scenes.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_START = /\n#if os\(iOS\) \|\| os\(tvOS\)\n {4}window = UIWindow\(frame: UIScreen\.main\.bounds\)\n[\s\S]*?#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return c;
  });

  return withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return c;
    if (!WINDOW_START.test(src)) {
      throw new Error('withSceneLifecycle: the AppDelegate template changed; update the plugin.');
    }
    src = src
      .replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(WINDOW_START, '\n');
    c.modResults.contents = src;
    return c;
  });
};
