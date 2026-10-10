package com.archangelnative

import android.app.Activity
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.io.FileOutputStream

class ApkInspectorModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), ActivityEventListener {
  private var pendingPromise: Promise? = null
  private val requestCode = 7412

  init { context.addActivityEventListener(this) }

  override fun getName() = "ApkInspector"

  @ReactMethod
  fun pickAndInspect(promise: Promise) {
    val activity = getCurrentActivity()
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No active Android screen is available.")
      return
    }
    if (pendingPromise != null) {
      promise.reject("PICKER_BUSY", "An APK selection is already in progress.")
      return
    }
    pendingPromise = promise
    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "*/*" // Android TV document providers may not advertise an APK-specific MIME type.
      }
      activity.startActivityForResult(intent, requestCode)
    } catch (error: Exception) {
      pendingPromise = null
      promise.reject("PICKER_FAILED", "Could not open the Android file picker.", error)
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != this.requestCode) return
    val promise = pendingPromise ?: return
    pendingPromise = null
    if (resultCode != Activity.RESULT_OK || data?.data == null) {
      promise.reject("PICKER_CANCELLED", "APK selection was cancelled.")
      return
    }
    try {
      promise.resolve(inspect(data.data!!))
    } catch (error: Exception) {
      promise.reject("APK_INSPECTION_FAILED", error.message ?: "Could not inspect this APK.", error)
    }
  }

  override fun onNewIntent(intent: Intent) {}

  private fun inspect(uri: Uri): WritableMap {
    val resolver = context.contentResolver
    var displayName = "selected.apk"
    var reportedSize: Long? = null
    val cursor: Cursor? = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
    cursor?.use {
      if (it.moveToFirst()) {
        val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        val sizeIndex = it.getColumnIndex(OpenableColumns.SIZE)
        if (nameIndex >= 0) displayName = it.getString(nameIndex) ?: displayName
        if (sizeIndex >= 0 && !it.isNull(sizeIndex)) reportedSize = it.getLong(sizeIndex)
      }
    }
    if (!displayName.lowercase().endsWith(".apk")) {
      throw IllegalArgumentException("The selected file does not have an .apk filename.")
    }

    val tempFile = File.createTempFile("archangel-apk-", ".apk", context.cacheDir)
    try {
      resolver.openInputStream(uri).use { input ->
        if (input == null) throw IllegalArgumentException("Android could not read the selected file.")
        FileOutputStream(tempFile).use { output -> input.copyTo(output) }
      }
      val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= 33) {
        context.packageManager.getPackageArchiveInfo(tempFile.absolutePath, PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong()))
      } else {
        @Suppress("DEPRECATION")
        context.packageManager.getPackageArchiveInfo(tempFile.absolutePath, PackageManager.GET_PERMISSIONS)
      } ?: throw IllegalArgumentException("Android could not parse this APK manifest.")

      val appInfo = packageInfo.applicationInfo
        ?: throw IllegalArgumentException("The APK does not contain readable application metadata.")
      val sizeBytes = reportedSize ?: tempFile.length()
      @Suppress("DEPRECATION")
      val versionCode = if (Build.VERSION.SDK_INT >= 28) packageInfo.longVersionCode.toString() else packageInfo.versionCode.toString()
      return Arguments.createMap().apply {
        putString("fileName", displayName)
        putString("packageName", packageInfo.packageName ?: "")
        putString("versionName", packageInfo.versionName ?: "Unknown")
        putString("versionCode", versionCode)
        putInt("minSdk", appInfo.minSdkVersion)
        putInt("targetSdk", appInfo.targetSdkVersion)
        putDouble("sizeMb", sizeBytes.toDouble() / (1024.0 * 1024.0))
        putInt("requestedPermissionCount", packageInfo.requestedPermissions?.size ?: 0)
        putString("inspectionMethod", "Android PackageManager archive metadata")
        putBoolean("signatureVerified", false)
      }
    } finally {
      tempFile.delete()
    }
  }
}

class ApkInspectorPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(ApkInspectorModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
