import os
import subprocess
import shutil
from pathlib import Path

BASE_DIR = Path(r"C:\Users\likhi\.gemini\antigravity\scratch\kaveri_member_club")
SDK_DIR = Path(r"C:\Users\likhi\AppData\Local\Android\Sdk")
BUILD_TOOLS = SDK_DIR / "build-tools" / "34.0.0"
PLATFORM_JAR = SDK_DIR / "platforms" / "android-34" / "android.jar"
AAPT2 = BUILD_TOOLS / "aapt2.exe"
D8 = BUILD_TOOLS / "d8.bat"
ZIPALIGN = BUILD_TOOLS / "zipalign.exe"
APKSIGNER = BUILD_TOOLS / "apksigner.bat"
KEYSTORE_PATH = BASE_DIR / "android_build" / "release.keystore"

def build_single_apk(app_name: str, package_name: str, target_url: str, output_filename: str):
    print(f"\n==========================================")
    print(f"Building {app_name} ({output_filename})...")
    print(f"Target URL: {target_url}")
    print(f"Package: {package_name}")
    print(f"==========================================")

    build_dir = BASE_DIR / f"android_build_{output_filename.replace('.apk', '').lower()}"
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True)

    # 1. Resources
    res_dir = build_dir / "res" / "drawable"
    res_dir.mkdir(parents=True)
    logo_src = BASE_DIR / "frontend" / "public" / "logo.png"
    if logo_src.exists():
        shutil.copy(logo_src, res_dir / "ic_launcher.png")

    # 2. AndroidManifest.xml
    manifest_content = f"""<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="{package_name}"
    android:versionCode="2"
    android:versionName="2.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="{app_name}"
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
    (build_dir / "AndroidManifest.xml").write_text(manifest_content, encoding="utf-8")

    # 3. Java Source Code
    package_path = package_name.replace(".", "/")
    src_dir = build_dir / "src" / package_path
    src_dir.mkdir(parents=True)

    java_code = f"""package {package_name};

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.KeyEvent;
import android.view.Window;

public class MainActivity extends Activity {{
    private WebView webView;
    private static final String APP_URL = "{target_url}";

    public static class AppWebViewClient extends WebViewClient {{
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {{
            view.loadUrl(url);
            return true;
        }}
    }}

    @Override
    protected void onCreate(Bundle savedInstanceState) {{
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
    }}

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {{
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {{
            webView.goBack();
            return true;
        }}
        return super.onKeyDown(keyCode, event);
    }}
}}
"""
    (src_dir / "MainActivity.java").write_text(java_code, encoding="utf-8")

    # 4. Compile resources with aapt2
    compiled_res = build_dir / "compiled_res.zip"
    subprocess.run([
        str(AAPT2), "compile", "--dir", str(build_dir / "res"), "-o", str(compiled_res)
    ], check=True)

    # 5. Link resources
    unaligned_apk = build_dir / "app-unaligned.apk"
    gen_src = build_dir / "gen"
    gen_src.mkdir(exist_ok=True)
    subprocess.run([
        str(AAPT2), "link",
        "-I", str(PLATFORM_JAR),
        "--manifest", str(build_dir / "AndroidManifest.xml"),
        "-o", str(unaligned_apk),
        "--java", str(gen_src),
        "--auto-add-overlay",
        str(compiled_res)
    ], check=True)

    # 6. Compile Java sources
    classes_dir = build_dir / "classes"
    classes_dir.mkdir(exist_ok=True)
    java_files = list(src_dir.glob("*.java")) + list(gen_src.rglob("*.java"))
    cmd_javac = [
        "javac",
        "--release", "8",
        "-cp", str(PLATFORM_JAR),
        "-d", str(classes_dir)
    ] + [str(f) for f in java_files]
    subprocess.run(cmd_javac, check=True)

    # 7. Package classes into jar and convert with d8
    classes_jar = build_dir / "app.jar"
    subprocess.run(["jar", "-cf", str(classes_jar), "-C", str(classes_dir), "."], check=True)

    cmd_d8 = [
        "java",
        "-cp", str(BUILD_TOOLS / "lib" / "d8.jar"),
        "com.android.tools.r8.D8",
        "--lib", str(PLATFORM_JAR),
        "--output", str(build_dir),
        str(classes_jar)
    ]
    subprocess.run(cmd_d8, check=True)

    # 8. Add classes.dex to APK
    subprocess.run(["jar", "-uf", str(unaligned_apk), "-C", str(build_dir), "classes.dex"], check=True)

    # 9. Zipalign
    aligned_apk = build_dir / "app-aligned.apk"
    subprocess.run([
        str(ZIPALIGN), "-f", "-p", "4",
        str(unaligned_apk), str(aligned_apk)
    ], check=True)

    # 10. Apksigner
    signed_apk = build_dir / output_filename
    shutil.copy(aligned_apk, signed_apk)
    subprocess.run([
        "cmd.exe", "/c", str(APKSIGNER), "sign",
        "--ks", str(KEYSTORE_PATH),
        "--ks-pass", "pass:KaveriClub@1987",
        "--ks-key-alias", "kavericlub",
        "--key-pass", "pass:KaveriClub@1987",
        str(signed_apk)
    ], check=True)

    # Verify
    subprocess.run([
        "cmd.exe", "/c", str(APKSIGNER), "verify",
        "-v", str(signed_apk)
    ], check=True)

    # 11. Copy to frontend public and dist
    target_public = BASE_DIR / "frontend" / "public" / output_filename
    target_dist = BASE_DIR / "frontend" / "dist" / output_filename
    shutil.copy(signed_apk, target_public)
    if (BASE_DIR / "frontend" / "dist").exists():
        shutil.copy(signed_apk, target_dist)

    print(f"SUCCESS! {output_filename} created at {target_public} ({target_public.stat().st_size} bytes)")

def main():
    if not KEYSTORE_PATH.exists():
        print("Keystore not found, running build_apk.py once to initialize keystore...")
        subprocess.run(["python", str(BASE_DIR / "build_apk.py")], check=True)

    # 1. Customer APK -> Points directly to Customer Portal on Render
    build_single_apk(
        app_name="Kaveri Club",
        package_name="com.kaverielectronic.kavericlub",
        target_url="https://kaveri-member-club-alje.onrender.com/",
        output_filename="KaveriClub.apk"
    )

    # 2. Admin APK -> Points directly to Admin Login Portal on Render
    build_single_apk(
        app_name="Kaveri Admin",
        package_name="com.kaverielectronic.kaveriadmin",
        target_url="https://kaveri-member-club-alje.onrender.com/admin/login",
        output_filename="KaveriAdmin.apk"
    )

if __name__ == "__main__":
    main()
