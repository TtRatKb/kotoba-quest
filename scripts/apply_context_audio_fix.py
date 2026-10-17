"""Apply a strictly scoped audio-only patch to cloud.html on an isolated CI branch."""
from pathlib import Path
import subprocess

path = Path("cloud.html")
expected_blob = "d61d7629b659fa5ccfef7289a2a286affc61e41e"
actual_blob = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()
source = path.read_text(encoding="utf-8")
if "let practiceAudioGeneration = 0;" in source:
    raise SystemExit("Context-practice audio patch is already present; nothing to change.")
if actual_blob != expected_blob:
    raise SystemExit(f"Refusing to patch unexpected cloud.html blob {actual_blob}")

changes = [
    (
        """      function stopAudio() {
        try { if (typeof stopAudioPlayback === "function") stopAudioPlayback(); } catch {}
        try { speechSynthesis.cancel(); } catch {}
        audioUtterance = null;
      }

      function playPracticeAudio(question) {
        stopAudio();
        const text = question?.spec?.jp || "";""",
        """      let practiceAutoplayTimer = null;
      let practiceAudioGeneration = 0;
      function stopAudio() {
        practiceAudioGeneration++;
        if (practiceAutoplayTimer !== null) {
          clearTimeout(practiceAutoplayTimer);
          practiceAutoplayTimer = null;
        }
        try { if (typeof stopAudioPlayback === "function") stopAudioPlayback(); } catch {}
        try { speechSynthesis.cancel(); } catch {}
        audioUtterance = null;
      }

      function playPracticeAudio(question) {
        // A stale delayed callback must never speak a previous sentence.
        if (!session || currentQuestion() !== question || !document.getElementById("vocabPractice")?.classList.contains("active")) return;
        stopAudio();
        const text = question?.spec?.jp || "";"""
    ),
    (
        """      function renderPractice() {
        const root = document.getElementById("kqContextPracticeRoot");""",
        """      function renderPractice() {
        stopAudio();
        const root = document.getElementById("kqContextPracticeRoot");"""
    ),
    (
        """        if (question.mode === "listening" && !question.answered && !question.selfRating && !question.pendingDecision) setTimeout(() => playPracticeAudio(question),180);""",
        """        if (question.mode === "listening" && !question.answered && !question.selfRating && !question.pendingDecision) {
          const generation = practiceAudioGeneration;
          practiceAutoplayTimer = setTimeout(() => {
            practiceAutoplayTimer = null;
            if (generation !== practiceAudioGeneration || currentQuestion() !== question) return;
            playPracticeAudio(question);
          },180);
        }"""
    )
]
for old, new in changes:
    if source.count(old) != 1:
        raise SystemExit("Refusing ambiguous source replacement: " + old[:60])
    source = source.replace(old, new, 1)
path.write_text(source, encoding="utf-8", newline="")
print("Applied three guarded, audio-only changes; no storage or SRS code altered.")
