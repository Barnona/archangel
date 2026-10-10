package com.archangelnative

import java.io.File
import java.util.zip.ZipFile

/** Lightweight container validation only; PackageManager performs manifest parsing afterward. */
object ApkContainerValidator {
  fun validate(file: File) {
    if (!file.isFile || !file.canRead()) {
      throw IllegalArgumentException("APK file does not exist or is not readable.")
    }
    if (file.length() <= 0L) {
      throw IllegalArgumentException("This file is empty (0 bytes). Select a complete APK file.")
    }
    try {
      ZipFile(file).use { zip ->
        val manifest = zip.getEntry("AndroidManifest.xml")
          ?: throw IllegalArgumentException("This ZIP archive has no AndroidManifest.xml; it is not a complete APK package.")
        if (manifest.isDirectory || manifest.size == 0L) {
          throw IllegalArgumentException("AndroidManifest.xml is empty or malformed.")
        }
      }
    } catch (error: IllegalArgumentException) {
      throw error
    } catch (error: Exception) {
      throw IllegalArgumentException("The file is not a readable APK/ZIP archive. It may be corrupted, incomplete, encrypted, or a different file type.")
    }
  }
}