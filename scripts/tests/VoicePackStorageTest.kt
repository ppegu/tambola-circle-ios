package com.ppegu.circledevice

import java.io.File
import java.nio.file.Files
import java.security.MessageDigest

fun main() {
  val temporary = Files.createTempDirectory("circle-voice-storage-test").toFile()
  val root = File(temporary, "caller-voices")
  val storage = VoicePackStorage(root)
  val revision = "a".repeat(16)
  val data = ByteArray(100) { it.toByte() }
  val hash = MessageDigest.getInstance("SHA-256").digest(data).joinToString("") { "%02x".format(it.toInt() and 255) }
  val entries = (1..90).map { StoredVoiceFile(it, data.size.toLong(), hash) }
  try {
    check(storage.inspect("emma", revision, entries) == null)
    val directory = File(root, "emma/$revision").also { it.mkdirs() }
    for (n in 1..89) File(directory, "$n.wav").writeBytes(data)
    check(storage.inspect("emma", revision, entries) == null) { "Partial packs must not be available" }
    File(directory, "90.wav").writeBytes(data)
    val files = storage.inspect("emma", revision, entries)!!
    check(files.size == 90 && files.all { it.startsWith("file:") })
    check(VoicePackStorage(root).inspect("emma", revision, entries) == files) { "Files must survive a fresh storage instance" }
    check(storage.download("emma", revision, entries.first(), "https://tambola-circle-voices.ffegu0617.workers.dev/packs/emma/$revision/1.wav", "cached") == files.first())
    File(directory, "4.wav").writeBytes(data.copyOf().also { it[3] = 0 })
    check(storage.inspect("emma", revision, entries) == null) { "Same-sized corrupt audio must fail its hash" }
    check(runCatching { storage.inspect("../escape", revision, entries) }.isFailure)
    check(runCatching { storage.inspect("aria", revision, entries) }.isFailure)
    check(runCatching { storage.inspect("emma", "../escape", entries) }.isFailure)
    check(runCatching { storage.inspect("emma", revision, entries.dropLast(1) + entries.first()) }.isFailure)
    check(runCatching { storage.download("emma", revision, entries.first(), "https://untrusted.example/1.wav", "bad-url") }.isFailure)
    storage.cancel("cancelled")
    check(runCatching { storage.download("emma", revision, entries.first(), "https://tambola-circle-voices.ffegu0617.workers.dev/packs/emma/$revision/1.wav", "cancelled") }.isFailure)
    storage.finish("cancelled")
    check(runCatching { storage.remove("aria") }.isFailure)
    storage.remove("emma")
    check(!directory.exists())
    println("VoicePackStorage: persistence, partial/corrupt packs, cached retry, cancellation, URL/path guards and removal passed")
  } finally {
    storage.close()
    check(temporary.canonicalFile.parentFile == File(System.getProperty("java.io.tmpdir")).canonicalFile)
    temporary.deleteRecursively()
  }
}
