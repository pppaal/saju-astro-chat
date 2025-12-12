# decode_all_rules.py
import os

def deep_double_decode(raw: bytes) -> str:
    """UTF-8 → Latin-1 2~3회 꼬인 텍스트 복원"""
    txt = raw
    for _ in range(3):  # 두세 번 반복 시도
        try:
            txt = txt.decode("latin1")
        except AttributeError:
            txt = txt.encode("latin1", errors="ignore").decode("utf-8", errors="ignore")
            continue
        except Exception:
            break
        try:
            txt = txt.encode("latin1", errors="ignore").decode("utf-8", errors="ignore")
        except Exception:
            continue
    if isinstance(txt, bytes):
        try:
            return txt.decode("utf-8", errors="ignore")
        except Exception:
            return txt.decode("latin1", errors="ignore")
    return txt


def fix_folder(base_dir):
    total_files = 0
    fixed_count = 0
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".json"):
                total_files += 1
                path = os.path.join(root, file)
                with open(path, "rb") as f:
                    raw = f.read()

                fixed = deep_double_decode(raw)

                with open(path, "w", encoding="utf-8") as f:
                    f.write(fixed)

                fixed_count += 1
                print(f"✅ Fixed: {path}")

    print(f"\n총 {fixed_count}개 JSON 복원 완료 (대상 {total_files}개) ✅")


if __name__ == "__main__":
    # 👇 여기를 현재 실제 경로로 바꿉니다!
    fix_folder(r"C:\dev\saju-astro-chat\backend_ai\data\graph\rules")