package com.archangelnative

import org.junit.After
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class ApkContainerValidatorTest {
  private val files = mutableListOf<File>()

  private fun tempFile(name: String): File = File(
    System.getProperty("java.io.tmpdir"),
    "archangel-sentinel-${System.nanoTime()}-$name"
  ).also { files.add(it) }

  @After
  fun cleanUp() {
    files.forEach { it.delete() }
  }

  @Test
  fun rejectsEmptyFile() {
    val file = tempFile("empty.apk")
    file.createNewFile()
    val error = assertThrows(IllegalArgumentException::class.java) { ApkContainerValidator.validate(file) }
    assertTrue(error.message!!.contains("empty", ignoreCase = true))
  }

  @Test
  fun rejectsRandomTextRenamedAsApk() {
    val file = tempFile("not-really.apk")
    file.writeText("this is not a ZIP archive")
    val error = assertThrows(IllegalArgumentException::class.java) { ApkContainerValidator.validate(file) }
    assertTrue(error.message!!.contains("ZIP", ignoreCase = true))
  }

  @Test
  fun rejectsZipWithoutAndroidManifest() {
    val file = tempFile("missing-manifest.apk")
    writeZip(file, mapOf("readme.txt" to "not an APK".toByteArray()))
    val error = assertThrows(IllegalArgumentException::class.java) { ApkContainerValidator.validate(file) }
    assertTrue(error.message!!.contains("AndroidManifest.xml"))
  }

  @Test
  fun rejectsEmptyManifestEntry() {
    val file = tempFile("empty-manifest.apk")
    writeZip(file, mapOf("AndroidManifest.xml" to byteArrayOf()))
    val error = assertThrows(IllegalArgumentException::class.java) { ApkContainerValidator.validate(file) }
    assertTrue(error.message!!.contains("empty", ignoreCase = true))
  }

  @Test
  fun rejectsTruncatedZipArchive() {
    val file = tempFile("truncated.apk")
    writeZip(file, mapOf("AndroidManifest.xml" to "placeholder manifest bytes".toByteArray()))
    val complete = file.readBytes()
    file.writeBytes(complete.copyOf((complete.size - 8).coerceAtLeast(1)))
    assertThrows(IllegalArgumentException::class.java) { ApkContainerValidator.validate(file) }
  }

  @Test
  fun acceptsZipContainerWithNonEmptyManifestForAndroidParsingStage() {
    val file = tempFile("container-only.apk")
    writeZip(file, mapOf("AndroidManifest.xml" to "placeholder manifest bytes".toByteArray()))
    ApkContainerValidator.validate(file)
  }

  private fun writeZip(file: File, entries: Map<String, ByteArray>) {
    ZipOutputStream(FileOutputStream(file)).use { zip ->
      entries.forEach { (name, bytes) ->
        zip.putNextEntry(ZipEntry(name))
        zip.write(bytes)
        zip.closeEntry()
      }
    }
  }
}