"""
Oracle Cloud A1.Flex 자동 확보 스크립트 (Windows/Mac/Linux 공통)
실행: python grab-a1.py

사전 조건: pip install oci-cli  (이미 설치됨)
OCI 설정:  C:\\Users\\82104\\.oci\\config  (이미 있음)
"""

import subprocess, json, time, sys, os, tempfile, datetime

REGION = "ap-tokyo-1"
RETRY_SECONDS = 30

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {}

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_tenancy():
    cfg = os.path.expanduser("~/.oci/config")
    if os.path.exists(cfg):
        for line in open(cfg):
            if line.startswith("tenancy="):
                return line.strip().split("=", 1)[1]
    return None

def get_ssh_pub():
    for p in [
        os.path.expanduser("~/Downloads/ssh-key-2026-08-02.pub"),
        os.path.expanduser("~/.ssh/id_rsa.pub"),
        os.path.expanduser("~/.ssh/id_ed25519.pub"),
    ]:
        if os.path.exists(p):
            return open(p).read().strip()
    return None

def main():
    tenancy = get_tenancy()
    if not tenancy:
        print("~/.oci/config 에 tenancy 설정이 없습니다.")
        print("oci setup config 를 다시 실행하세요.")
        sys.exit(1)

    ssh_pub = get_ssh_pub()
    if not ssh_pub:
        print("SSH 공개키를 찾을 수 없습니다.")
        print("아래 중 하나를 만드세요:")
        print("  ssh-keygen -t ed25519")
        print("  또는 Downloads/ssh-key-2026-08-02.pub 파일 위치 확인")
        sys.exit(1)

    print("=" * 60)
    print("Oracle Cloud A1.Flex 자동 확보 시작")
    print(f"Tenancy: {tenancy[:20]}...")
    print(f"Region:  {REGION}")
    print(f"SSH 공개키: 확인됨")
    print(f"{RETRY_SECONDS}초마다 재시도 | Ctrl+C 로 종료")
    print("=" * 60)

    attempt = 0
    while True:
        attempt += 1
        log(f"시도 #{attempt}")

        # 현재 사용량 확인
        result = run(["oci", "compute", "instance", "list",
                      "--compartment-id", tenancy,
                      "--lifecycle-state", "RUNNING",
                      "--region", REGION])
        instances = result.get("data", [])
        total_ocpu = sum(i.get("shape-config", {}).get("ocpus", 0) for i in instances)
        remain = int(4 - total_ocpu)
        log(f"  사용 중: {total_ocpu}/4 OCPU  남은 할당: {remain}")

        if remain <= 0:
            log(f"  Always Free 4 OCPU 전부 사용 중. {RETRY_SECONDS}초 후 재확인...")
            time.sleep(RETRY_SECONDS)
            continue

        # AD 조회
        r = run(["oci", "iam", "availability-domain", "list",
                 "--compartment-id", tenancy, "--region", REGION])
        ads = r.get("data", [])
        if not ads:
            log("  AD 조회 실패"); time.sleep(RETRY_SECONDS); continue
        ad = ads[0]["name"]

        # 서브넷 조회
        r = run(["oci", "network", "subnet", "list",
                 "--compartment-id", tenancy, "--region", REGION])
        subnets = r.get("data", [])
        subnet = next((s["id"] for s in subnets if not s.get("prohibit-public-ip-on-vnic")), None)
        if not subnet and subnets:
            subnet = subnets[0]["id"]
        if not subnet:
            log("  서브넷 없음"); time.sleep(RETRY_SECONDS); continue

        # 이미지 조회
        r = run(["oci", "compute", "image", "list",
                 "--compartment-id", tenancy,
                 "--shape", "VM.Standard.A1.Flex",
                 "--region", REGION])
        images = sorted(r.get("data", []), key=lambda x: x.get("time-created", ""), reverse=True)
        if not images:
            log("  이미지 없음"); time.sleep(RETRY_SECONDS); continue
        image_id = images[0]["id"]

        # 스펙 결정 (큰 것부터)
        specs = [s for s in [4, 2, 1] if s <= remain]

        # SSH 공개키 임시 파일
        tf = tempfile.NamedTemporaryFile(mode="w", suffix=".pub", delete=False)
        tf.write(ssh_pub); tf.close()

        success = False
        for ocpu in specs:
            mem = ocpu * 6
            log(f"  생성 시도: {ocpu}코어 / {mem}GB...")
            name = f"filo-a1-{ocpu}c{mem}g-{datetime.datetime.now().strftime('%m%d%H%M')}"

            r2 = subprocess.run([
                "oci", "compute", "instance", "launch",
                "--compartment-id", tenancy,
                "--availability-domain", ad,
                "--shape", "VM.Standard.A1.Flex",
                "--shape-config", json.dumps({"ocpus": ocpu, "memoryInGBs": mem}),
                "--image-id", image_id,
                "--subnet-id", subnet,
                "--display-name", name,
                "--boot-volume-size-in-gbs", str(ocpu * 50),
                "--assign-public-ip", "true",
                "--ssh-authorized-keys-file", tf.name,
                "--region", REGION,
            ], capture_output=True, text=True)

            out = r2.stdout + r2.stderr
            try:
                d = json.loads(r2.stdout)
                if d.get("data", {}).get("lifecycle-state"):
                    ip = d["data"].get("public-ip", "할당중")
                    print()
                    print("=" * 60)
                    print(f"  인스턴스 생성 성공! ({ocpu}코어 / {mem}GB)")
                    print(f"  Public IP: {ip}")
                    print(f"  SSH: ssh opc@{ip}")
                    print("=" * 60)
                    success = True
                    break
            except Exception:
                pass

            if "capacity" in out.lower() or "InternalError" in out:
                log("  용량 부족 - 다음 스펙 시도")
            else:
                log(f"  응답: {out[:100]}")

        os.unlink(tf.name)

        if success:
            break

        log(f"  {RETRY_SECONDS}초 후 재시도...")
        time.sleep(RETRY_SECONDS)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n종료")
