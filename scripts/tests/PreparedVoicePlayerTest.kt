package com.ppegu.circledevice

private class Clock {
  private data class Task(val at: Long, val action: () -> Unit, var cancelled: Boolean = false)
  private var now = 0L
  private val tasks = mutableListOf<Task>()
  fun schedule(delay: Long, action: () -> Unit): () -> Unit {
    val task = Task(now + delay, action)
    tasks.add(task)
    return { task.cancelled = true }
  }
  fun advance(ms: Long) {
    val end = now + ms
    while (true) {
      val next = tasks.filter { !it.cancelled && it.at <= end }.minByOrNull { it.at } ?: break
      tasks.remove(next); now = next.at; next.action()
    }
    now = end
  }
}

private class FakePool : VoicePool {
  val loads = linkedMapOf<String, (Int?, String?) -> Unit>()
  val plays = mutableListOf<Pair<Int, Float>>()
  val stops = mutableListOf<Int>()
  val volumes = mutableListOf<Pair<Int, Float>>()
  var released = false
  var failPlay = false
  override fun load(uri: String, complete: (Int?, String?) -> Unit) { loads[uri] = complete }
  override fun play(sample: Int, volume: Float): Int { plays.add(sample to volume); return if (failPlay) 0 else plays.size }
  override fun stop(stream: Int) { stops.add(stream) }
  override fun setVolume(stream: Int, volume: Float) { volumes.add(stream to volume) }
  override fun release() { released = true }
  fun loaded(number: Int) { loads.getValue("voice_$number")(number, null) }
}

private class Fixture {
  val clock = Clock()
  val pools = mutableListOf<FakePool>()
  val bank = (1..90).map { VoiceSource("voice_$it", 1000) }
  val player = PreparedVoicePlayer({ FakePool().also { pools.add(it) } }, clock::schedule)
  val pool get() = pools.last()
  fun ready() { player.prepare(bank) { check(it == null) }; (90 downTo 1).forEach { pool.loaded(it) } }
}

fun main() {
  val tests = linkedMapOf<String, () -> Unit>(
    "one pool loads all 90 once and reuses them in random order" to {
      val f = Fixture(); var prepared = 0
      f.player.prepare(f.bank) { check(it == null); prepared++ }
      f.player.prepare(f.bank) { check(it == null); prepared++ }
      check(f.pools.size == 1 && f.pool.loads.size == 90)
      (90 downTo 2).forEach { f.pool.loaded(it) }; check(prepared == 0)
      f.pool.loaded(1); check(prepared == 2)
      f.player.prepare(f.bank) { check(it == null); prepared++ }; check(prepared == 3)
      for (number in listOf(47, 12, 83, 47)) {
        var ended = false
        f.player.play("call_$number", "voice_$number") { check(it == null); ended = true }
        check(f.pool.plays.last().first == number)
        f.clock.advance(1099); check(!ended)
        f.clock.advance(1); check(ended)
      }
      check(f.pools.size == 1 && f.pool.loads.size == 90 && f.pool.stops.isEmpty())
    },
    "unprepared calls cannot start" to {
      val f = Fixture(); val errors = mutableListOf<String?>()
      f.player.play("a", "voice_1") { errors.add(it) }
      f.player.prepare(f.bank) {}
      f.pool.loaded(1)
      f.player.play("b", "voice_1") { errors.add(it) }
      check(errors.size == 2 && errors.all { it != null } && f.pool.plays.isEmpty())
    },
    "replacing a call cancels it once and stale cancellation cannot stop the new one" to {
      val f = Fixture(); f.ready(); val first = mutableListOf<String?>(); val second = mutableListOf<String?>()
      f.player.play("old", "voice_47") { first.add(it) }
      f.clock.advance(300)
      f.player.play("new", "voice_12") { second.add(it) }
      f.player.stop("old")
      check(first.size == 1 && first[0] != null && f.pool.stops == listOf(1))
      f.clock.advance(800); check(second.isEmpty())
      f.clock.advance(300); check(second == listOf(null) && first.size == 1)
    },
    "pause cancels pending completion without unloading the bank" to {
      val f = Fixture(); f.ready(); val results = mutableListOf<String?>()
      f.player.play("a", "voice_1") { results.add(it) }
      f.player.stopAll(); f.clock.advance(5000)
      check(results.size == 1 && results[0] != null && !f.pool.released)
    },
    "load failure releases the pool and a retry can succeed" to {
      val f = Fixture(); val errors = mutableListOf<String?>()
      f.player.prepare(f.bank) { errors.add(it) }
      val old = f.pool
      old.loads.getValue("voice_5")(null, "bad sample")
      check(errors == listOf("bad sample") && old.released)
      f.ready(); old.loaded(1)
      check(f.pools.size == 2 && !f.pool.released)
    },
    "a missing load callback times out and permits retry" to {
      val f = Fixture(); var error: String? = null
      f.player.prepare(f.bank) { error = it }
      f.clock.advance(30_000)
      check(error?.contains("timed out") == true && f.pool.released)
      f.ready()
    },
    "release during loading settles waiters and ignores late callbacks" to {
      val f = Fixture(); val errors = mutableListOf<String?>()
      f.player.prepare(f.bank) { errors.add(it) }
      val old = f.pool
      f.player.release(); f.ready(); (1..90).forEach { old.loaded(it) }
      check(errors.size == 1 && errors[0] != null && !f.pool.released)
    },
    "live volume changes and playback failures settle correctly" to {
      val f = Fixture(); f.ready(); f.player.setVolume(.4f)
      f.pool.failPlay = true
      var failure: String? = null
      f.player.play("failed", "voice_1") { failure = it }
      check(failure != null)
      f.pool.failPlay = false
      f.player.play("ok", "voice_2") {}
      check(f.pool.plays.last().second == .4f)
      f.player.setVolume(.2f); check(f.pool.volumes.last().second == .2f)
      f.player.release(); check(f.pool.released && f.pool.stops.isNotEmpty())
    },
    "malformed banks never allocate a pool" to {
      val f = Fixture(); var failures = 0
      for (bank in listOf(emptyList(), listOf(VoiceSource("a", 0)), listOf(VoiceSource("a", 10001)), f.bank + f.bank[0])) {
        f.player.prepare(bank) { check(it != null); failures++ }
      }
      check(failures == 4 && f.pools.isEmpty())
    },
  )
  tests.forEach { (name, test) -> test(); println("PASS: $name") }
  println("${tests.size} native voice player tests passed")
}
