"""Kokoro narration: a JSON list of {text, out} on stdin -> one WAV per item.

Runs in its own Python environment (created by `kav setup`), so the host project
never needs onnxruntime. Called by tts.ts; not meant to be run by hand.

    python kokoro_tts.py <model.onnx> <voices.bin> <voice> <speed>
"""
import json
import sys

import soundfile as sf
from kokoro_onnx import Kokoro


def main() -> None:
    model, voices, voice, speed = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
    jobs = json.load(sys.stdin)
    kokoro = Kokoro(model, voices)
    for job in jobs:
        samples, rate = kokoro.create(job["text"], voice=voice, speed=speed, lang="en-us")
        sf.write(job["out"], samples, rate)
        print("wav", job["out"], flush=True)


if __name__ == "__main__":
    main()
