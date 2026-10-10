package com.archangelnative

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Environment
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ViewManager
import java.io.File

class ApkInspectorModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  override fun getName() = "ApkInspector"

  private fun importDirectory(): File {
    val dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
      ?: File(context.filesDir, "apk-imports")
    if (!dir.exists() && !dir.mkdirs()) {
      throw IllegalStateException("Could not create ARCHANGEL's APK import folder.")
    }
    return dir.canonicalFile
  }

  @ReactMethod
  fun listApks(promise: Promise) {
    try {
      val dir = importDirectory()
      val files = dir.listFiles()
        ?.filter { it.isFile && it.name.endsWith(".apk", ignoreCase = true) }
        ?.sortedBy { it.name.lowercase() }
        ?: emptyList()
      val result = Arguments.createArray()
      files.forEach { file ->
        result.pushMap(Arguments.createMap().apply {
          putString("fileName", file.name)
          putDouble("sizeMb", file.length().toDouble() / (1024.0 * 1024.0))
        })
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("APK_LIST_FAILED", error.message ?: "Could not list the APK import folder.", error)
    }
  }

  @ReactMethod
  fun inspectLocalApk(fileName: String, promise: Promise) {
    try {
      if (fileName.isBlank() || fileName.contains("/") || fileName.contains("\\\\") || !fileName.endsWith(".apk", true)) {
        throw IllegalArgumentException("Select a valid APK filename.")
      }
      val root = importDirectory()
      val file = File(root, fileName).canonicalFile
      if (file.parentFile != root || !file.isFile || !file.canRead()) {
        throw IllegalArgumentException("APK not found or not readable in ARCHANGEL's import folder.")
      }
      promise.resolve(inspectFile(file))
    } catch (error: Exception) {
      promise.reject("APK_INSPECTION_FAILED", error.message ?: "Could not inspect this APK.", error)
    }
  }

  private fun inspectFile(file: File): WritableMap {
    val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= 33) {
      context.packageManager.getPackageArchiveInfo(
        file.absolutePath,
        PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      context.packageManager.getPackageArchiveInfo(file.absolutePath, PackageManager.GET_PERMISSIONS)
    } ?: throw IllegalArgumentException("Android could not parse this APK manifest.")

    val appInfo = packageInfo.applicationInfo
      ?: throw IllegalArgumentException("The APK does not contain readable application metadata.")
    @Suppress("DEPRECATION")
    val versionCode = if (Build.VERSION.SDK_INT >= 28) packageInfo.longVersionCode.toString() else packageInfo.versionCode.toString()

    return Arguments.createMap().apply {
      putString("fileName", file.name)
      putString("packageName", packageInfo.packageName ?: "")
      putString("versionName", packageInfo.versionName ?: "Unknown")
      putString("versionCode", versionCode)
      putInt("minSdk", appInfo.minSdkVersion)
      putInt("targetSdk", appInfo.targetSdkVersion)
      putDouble("sizeMb", file.length().toDouble() / (1024.0 * 1024.0))
      putInt("requestedPermissionCount", packageInfo.requestedPermissions?.size ?: 0)
      putString("inspectionMethod", "Android PackageManager archive metadata")
      putBoolean("signatureVerified", false)
    }
  }
}

class ApkInspectorPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(ApkInspectorModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
