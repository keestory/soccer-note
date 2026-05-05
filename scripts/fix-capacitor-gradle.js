const fs = require('fs');
const path = require('path');

// Fix Capacitor plugins that use deprecated proguard-android.txt (incompatible with AGP 9.0+)
const pluginsToFix = [
  'node_modules/@capacitor/splash-screen/android/build.gradle',
  'node_modules/@capacitor/status-bar/android/build.gradle',
];

pluginsToFix.forEach((filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes("proguard-android.txt")) {
      content = content.replace(/proguard-android\.txt/g, 'proguard-android-optimize.txt');
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Patched: ${filePath}`);
    }
  }
});
