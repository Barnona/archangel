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
import java.io.FileInputStream
import java.security.MessageDigest

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
      if (fileName.isBlank() || fileName.contains("/") || fileName.contains("\\") ||
        fileName == "." || fileName == ".." || !fileName.endsWith(".apk", true)) {
        throw IllegalArgumentException("Select a valid APK filename.")
      }
      val root = importDirectory()
      val file = File(root, fileName).canonicalFile
      if (file.parentFile != root || !file.isFile || !file.canRead()) {
        throw IllegalArgumentException("APK not found or not readable in ARCHANGEL's import folder.")
      }
      if (file.length() <= 0L) throw IllegalArgumentException("This file is empty.")
      promise.resolve(inspectFile(file))
    } catch (error: Exception) {
      promise.reject("APK_INSPECTION_FAILED", error.message ?: "Could not inspect this APK.", error)
    }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    FileInputStream(file).use { input ->
      val buffer = ByteArray(64 * 1024)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { "%02X".format(it) }
  }

  private fun certificateSha256(bytes: ByteArray): String {
    return MessageDigest.getInstance("SHA-256").digest(bytes)
      .joinToString("") { "%02X".format(it) }
  }

  private fun inspectFile(file: File): WritableMap {
    val flags = if (Build.VERSION.SDK_INT >= 28) {
      PackageManager.GET_PERMISSIONS or PackageManager.GET_SIGNING_CERTIFICATES
    } else {
      @Suppress("DEPRECATION")
      PackageManager.GET_PERMISSIONS or PackageManager.GET_SIGNATURES
    }
    val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= 33) {
      context.packageManager.getPackageArchiveInfo(
        file.absolutePath,
        PackageManager.PackageInfoFlags.of(flags.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      context.packageManager.getPackageArchiveInfo(file.absolutePath, flags)
    } ?: throw IllegalArgumentException("Android could not parse this APK manifest. The file may be corrupt, incomplete, or not an APK.")

    val appInfo = packageInfo.applicationInfo
      ?: throw IllegalArgumentException("The APK does not contain readable application metadata.")
    @Suppress("DEPRECATION")
    val versionCode = if (Build.VERSION.SDK_INT >= 28) packageInfo.longVersionCode.toString() else packageInfo.versionCode.toString()
    val permissions = packageInfo.requestedPermissions ?: emptyArray()
    val certBytes: List<ByteArray> = if (Build.VERSION.SDK_INT >= 28) {
      packageInfo.signingInfo?.apkContentsSigners?.map { it.toByteArray() } ?: emptyList()
    } else {
      @Suppress("DEPRECATION")
      packageInfo.signatures?.map { it.toByteArray() } ?: emptyList()
    }

    val permissionArray = Arguments.createArray()
    permissions.sorted().forEach { permissionArray.pushString(it) }
    val certificateArray = Arguments.createArray()
    certBytes.map { certificateSha256(it) }.distinct().forEach { certificateArray.pushString(it) }

    return Arguments.createMap().apply {
      putString("fileName", file.name)
      putString("packageName", packageInfo.packageName ?: "")
      putString("versionName", packageInfo.versionName ?: "Unknown")
      putString("versionCode", versionCode)
      putInt("minSdk", appInfo.minSdkVersion)
      putInt("targetSdk", appInfo.targetSdkVersion)
      putDouble("sizeMb", file.length().toDouble() / (1024.0 * 1024.0))
      putInt("requestedPermissionCount", permissions.size)
      putArray("requestedPermissions", permissionArray)
      putString("fileSha256", sha256(file))
      putArray("signerCertificateSha256", certificateArray)
      putString("signatureStatus", if (certificateArray.size() > 0) "CERTIFICATE_PRESENT_NOT_CRYPTOGRAPHICALLY_VERIFIED" else "NO_SIGNER_CERTIFICATE_EXTRACTED")
      putString("inspectionMethod", "Android PackageManager archive metadata")
      putBoolean("malwareScanPerformed", false)
    }
  }
}

class ApkInspectorPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(ApkInspectorModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
