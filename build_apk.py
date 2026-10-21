import os
import subprocess
import shutil
from pathlib import Path

BASE_DIR = Path(r"C:\Users\likhi\.gemini\antigravity\scratch\kaveri_member_club")
BUILD_DIR = BASE_DIR / "android_build"
SDK_DIR = Path(r"C:\Users\likhi\AppData\Local\Android\Sdk")
BUILD_TOOLS = SDK_DIR / "build-tools" / "34.0.0"
PLATFORM_JAR = SDK_DIR / "platforms" / "android-34" / "android.jar"
AAPT2 = BUILD_TOOLS / "aapt2.exe"
D8 = BUILD_TOOLS / "d8.bat"
ZIPALIGN = BUILD_TOOLS / "zipalign.exe"
APKSIGNER = BUILD_TOOLS / "apksigner.bat"

if BUILD_DIR.exists():
    shutil.rmtree(BUILD_DIR)
BUILD_DIR.mkdir(parents=True)

res_dir = BUILD_DIR / "res" / "drawable"
res_dir.mkdir(parents=True)

# Copy logo as launcher icon
logo_src = BASE_DIR / "frontend" / "public" / "logo.png"
if logo_src.exists():
    shutil.copy(logo_src, res_dir / "ic_launcher.png")

# Create AndroidManifest.xml
manifest_content = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.kaverielectronic.kavericlub"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="Kaveri Club"
        android:icon="@drawable/ic_launcher"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.NoTitleBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""
(BUILD_DIR / "AndroidManifest.xml").write_text(manifest_content, encoding="utf-8")

# Create Java source code
src_dir = BUILD_DIR / "src" / "com" / "kaverielectronic" / "kavericlub"
src_dir.mkdir(parents=True)

java_code = """package com.kaverielectronic.kavericlub;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String APP_URL = "https://amenities-hollow-sufficient-jane.trycloudflare.com/";

    public static class AppWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            view.loadUrl(url);
            return true;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new AppWebViewClient());
        webView.loadUrl(APP_URL);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
"""
(src_dir / "MainActivity.java").write_text(java_code, encoding="utf-8")

print("1. Compiling resources with aapt2...")
compiled_res = BUILD_DIR / "compiled_res.zip"
subprocess.run([
    str(AAPT2), "compile", "--dir", str(BUILD_DIR / "res"), "-o", str(compiled_res)
], check=True)

print("2. Linking resources with aapt2 link...")
unaligned_apk = BUILD_DIR / "app-unaligned.apk"
gen_src = BUILD_DIR / "gen"
gen_src.mkdir(exist_ok=True)

subprocess.run([
    str(AAPT2), "link",
    "-I", str(PLATFORM_JAR),
    "--manifest", str(BUILD_DIR / "AndroidManifest.xml"),
    "-o", str(unaligned_apk),
    "--java", str(gen_src),
    "--auto-add-overlay",
    str(compiled_res)
], check=True)

print("3. Compiling Java sources with javac...")
classes_dir = BUILD_DIR / "classes"
if classes_dir.exists():
    shutil.rmtree(classes_dir)
classes_dir.mkdir(exist_ok=True)

java_files = list(src_dir.glob("*.java")) + list(gen_src.rglob("*.java"))
cmd_javac = [
    "javac",
    "--release", "8",
    "-cp", str(PLATFORM_JAR),
    "-d", str(classes_dir)
] + [str(f) for f in java_files]

subprocess.run(cmd_javac, check=True)

print("4. Packaging classes into jar and converting with d8...")
classes_jar = BUILD_DIR / "app.jar"
subprocess.run(["jar", "-cf", str(classes_jar), "-C", str(classes_dir), "."], check=True)

cmd_d8 = [
    "java",
    "-cp", str(BUILD_TOOLS / "lib" / "d8.jar"),
    "com.android.tools.r8.D8",
    "--lib", str(PLATFORM_JAR),
    "--output", str(BUILD_DIR),
    str(classes_jar)
]
subprocess.run(cmd_d8, check=True)

print("5. Adding classes.dex to APK...")
# Add classes.dex into unaligned apk using jar or zip
subprocess.run(["jar", "-uf", str(unaligned_apk), "-C", str(BUILD_DIR), "classes.dex"], check=True)

print("6. Aligning APK with zipalign...")
aligned_apk = BUILD_DIR / "app-aligned.apk"
subprocess.run([
    str(ZIPALIGN), "-f", "-p", "4",
    str(unaligned_apk), str(aligned_apk)
], check=True)

print("7. Generating release signing keystore if needed...")
keystore_path = BUILD_DIR / "release.keystore"
if not keystore_path.exists():
    subprocess.run([
        "keytool", "-genkeypair",
        "-v",
        "-keystore", str(keystore_path),
        "-alias", "kavericlub",
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-storepass", "KaveriClub@1987",
        "-keypass", "KaveriClub@1987",
        "-dname", "CN=Kaveri Electronic Halaguru, OU=Member Club, O=Kaveri, L=Halaguru, ST=Karnataka, C=IN"
    ], check=True)

print("8. Signing APK with apksigner...")
signed_apk = BUILD_DIR / "KaveriClub.apk"
shutil.copy(aligned_apk, signed_apk)

subprocess.run([
    "cmd.exe", "/c", str(APKSIGNER), "sign",
    "--ks", str(keystore_path),
    "--ks-pass", "pass:KaveriClub@1987",
    "--ks-key-alias", "kavericlub",
    "--key-pass", "pass:KaveriClub@1987",
    str(signed_apk)
], check=True)

print("9. Verifying signed APK...")
subprocess.run([
    "cmd.exe", "/c", str(APKSIGNER), "verify",
    "-v", str(signed_apk)
], check=True)

# Copy to frontend public and dist directories
target_public = BASE_DIR / "frontend" / "public" / "KaveriClub.apk"
target_dist = BASE_DIR / "frontend" / "dist" / "KaveriClub.apk"
shutil.copy(signed_apk, target_public)
if (BASE_DIR / "frontend" / "dist").exists():
    shutil.copy(signed_apk, target_dist)

print(f"SUCCESS! KaveriClub.apk created at {target_public} ({target_public.stat().st_size} bytes)")
