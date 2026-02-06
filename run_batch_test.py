"""
Batch test runner with per-test timeout.
Usage: python run_batch_test.py [num_tests] [seed1 seed2 ...]
"""
import subprocess
import sys
import random
import os
import time

NUM_TESTS = int(sys.argv[1]) if len(sys.argv) > 1 else 20
TIMEOUT_SECONDS = 60  # Max 60 seconds per test

# If specific seeds provided, use them
seeds = []
if len(sys.argv) > 2:
    seeds = [int(s) for s in sys.argv[2:]]
else:
    seeds = [random.randint(1, 999999) for _ in range(NUM_TESTS)]

passed = 0
failed = 0
timeout_count = 0
fail_seeds = []
timeout_seeds = []

FAIL_DIR = "test_batch_fail"
os.makedirs(FAIL_DIR, exist_ok=True)

print(f"\n{'='*60}")
print(f"  BATCH TEST: {len(seeds)} tests, timeout={TIMEOUT_SECONDS}s each")
print(f"{'='*60}\n")

for i, seed in enumerate(seeds):
    out_file = os.path.join(FAIL_DIR, f"test_batch_{seed}.txt")
    
    try:
        start_time = time.time()
        popen_kwargs = dict(
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
        )
        # CREATE_NEW_PROCESS_GROUP is Windows-only
        if sys.platform == 'win32':
            popen_kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            popen_kwargs['start_new_session'] = True

        proc = subprocess.Popen(
            [sys.executable, "python/test/test_advanced_scheduler.py", str(seed)],
            **popen_kwargs
        )
        
        try:
            output, _ = proc.communicate(timeout=TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            # Kill the process tree
            import signal
            if sys.platform == 'win32':
                try:
                    proc.send_signal(signal.CTRL_BREAK_EVENT)
                except Exception:
                    pass
            else:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except Exception:
                    pass
            proc.kill()
            proc.wait(timeout=5)
            timeout_count += 1
            timeout_seeds.append(seed)
            elapsed = time.time() - start_time
            print(f"[{i+1}/{len(seeds)}] TIMEOUT seed={seed} ({elapsed:.0f}s)")
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write(f"TIMEOUT after {TIMEOUT_SECONDS}s")
            continue
        
        elapsed = time.time() - start_time
        
        if output and "TEST ZALICZONY" in output and "NIEZALICZONY" not in output:
            passed += 1
            print(f"[{i+1}/{len(seeds)}] PASS seed={seed} ({elapsed:.1f}s)")
        else:
            failed += 1
            fail_seeds.append(seed)
            # Save output only for failed tests
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write(output or '')
            # Extract failure details
            lines = (output or '').strip().split('\n')
            failures = [l for l in lines if any(kw in l for kw in ['BLEDY', 'NIEZALICZONY', 'R1:', 'R2:', 'R6:'])]
            print(f"[{i+1}/{len(seeds)}] FAIL seed={seed} ({elapsed:.1f}s)")
            for fl in failures[:5]:
                print(f"  {fl.strip()}")
                
    except Exception as e:
        failed += 1
        fail_seeds.append(seed)
        print(f"[{i+1}/{len(seeds)}] ERROR seed={seed}: {e}")

print(f"\n{'='*60}")
print(f"  RESULTS: {passed}/{len(seeds)} PASSED")
if failed > 0:
    print(f"  Failed ({failed}): {', '.join(str(s) for s in fail_seeds)}")
if timeout_count > 0:
    print(f"  Timeouts ({timeout_count}): {', '.join(str(s) for s in timeout_seeds)}")
print(f"{'='*60}")
