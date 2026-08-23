#!/bin/bash
# ================================================================
# Oracle Cloud A1.Flex 자동 확보 스크립트 (로컬 실행용)
# 실행: bash grab-a1.sh
#
# 사전 조건:
#   pip install oci-cli
#   oci setup config  (←  처음 한 번만)
# ================================================================

TENANCY="${OCI_TENANCY_OCID:-$(oci iam tenancy get --tenancy-id "$(oci iam tenancy get 2>/dev/null | jq -r '.data.id' 2>/dev/null)" 2>/dev/null | jq -r '.data.id' 2>/dev/null)}"

# ~/.oci/config 에서 tenancy 자동 읽기
if [ -z "$TENANCY" ]; then
  TENANCY=$(grep -m1 '^tenancy=' ~/.oci/config 2>/dev/null | cut -d= -f2)
fi

if [ -z "$TENANCY" ]; then
  echo "OCI 설정이 없습니다. 먼저 실행하세요:"
  echo "  pip install oci-cli"
  echo "  oci setup config"
  exit 1
fi

SSH_PUB_KEY="${1:-}"
if [ -z "$SSH_PUB_KEY" ]; then
  # 기본 SSH 공개키 위치
  for f in "$HOME/.ssh/id_rsa.pub" "$HOME/.ssh/id_ed25519.pub" "$HOME/Downloads/ssh-key-2026-08-02.pub"; do
    [ -f "$f" ] && { SSH_PUB_KEY="$(cat "$f")"; break; }
  done
fi

if [ -z "$SSH_PUB_KEY" ]; then
  echo "SSH 공개키가 없습니다."
  echo "사용법: bash grab-a1.sh '공개키내용'"
  echo "또는: ssh-keygen -t ed25519 후 재실행"
  exit 1
fi

REGION="ap-tokyo-1"
ATTEMPT=0

echo "================================================================"
echo "Oracle Cloud A1.Flex 자동 확보 시작"
echo "Tenancy: $TENANCY"
echo "Region:  $REGION"
echo "30초마다 재시도 | Ctrl+C 로 종료"
echo "================================================================"
echo ""

while true; do
  ATTEMPT=$((ATTEMPT + 1))
  NOW=$(date '+%H:%M:%S')
  echo "[$NOW] 시도 #$ATTEMPT"

  # 현재 사용량 확인
  INSTANCES=$(oci compute instance list \
    --compartment-id "$TENANCY" \
    --lifecycle-state RUNNING \
    --region "$REGION" \
    2>/dev/null | jq -r '.data // []' 2>/dev/null || echo "[]")
  TOTAL_OCPU=$(echo "$INSTANCES" | jq '[.[].["shape-config"].ocpus // 0] | add // 0' 2>/dev/null || echo "0")
  REMAIN=$((4 - ${TOTAL_OCPU%.*}))
  echo "  사용 중: ${TOTAL_OCPU}/4 OCPU  남은 할당: ${REMAIN}"

  if [ "$REMAIN" -le 0 ]; then
    echo "  Always Free 4 OCPU 전부 사용 중. 30초 후 재확인..."
    sleep 30
    continue
  fi

  # AD 조회
  AD=$(oci iam availability-domain list \
    --compartment-id "$TENANCY" --region "$REGION" \
    --query 'data[0].name' --raw-output 2>/dev/null || echo "")
  [ -z "$AD" ] && { echo "  AD 조회 실패"; sleep 30; continue; }

  # 서브넷 조회 (공개 IP 허용 우선)
  SUBNET=$(oci network subnet list \
    --compartment-id "$TENANCY" --region "$REGION" 2>/dev/null \
    | jq -r '.data // [] | map(select(."prohibit-public-ip-on-vnic" == false)) | .[0].id // ""' 2>/dev/null || echo "")
  [ -z "$SUBNET" ] && SUBNET=$(oci network subnet list \
    --compartment-id "$TENANCY" --region "$REGION" 2>/dev/null \
    | jq -r '.data // [] | .[0].id // ""' 2>/dev/null || echo "")
  [ -z "$SUBNET" ] && { echo "  서브넷 없음"; sleep 30; continue; }

  # 이미지 조회
  IMAGE=$(oci compute image list \
    --compartment-id "$TENANCY" --shape "VM.Standard.A1.Flex" --region "$REGION" 2>/dev/null \
    | jq -r '.data // [] | sort_by(."time-created") | reverse | .[0].id // ""' 2>/dev/null || echo "")
  [ -z "$IMAGE" ] && { echo "  이미지 없음"; sleep 30; continue; }

  # 스펙 결정 (큰 것부터)
  if   [ "$REMAIN" -ge 4 ]; then SPECS="4 2 1"
  elif [ "$REMAIN" -eq 3 ]; then SPECS="3 2 1"
  elif [ "$REMAIN" -eq 2 ]; then SPECS="2 1"
  else SPECS="1"; fi

  printf '%s' "$SSH_PUB_KEY" > /tmp/_grab_ssh.pub

  SUCCESS=0
  for OCPU in $SPECS; do
    MEM=$((OCPU * 6))
    echo "  생성 시도: ${OCPU}코어 / ${MEM}GB..."

    RESULT=$(oci compute instance launch \
      --compartment-id "$TENANCY" \
      --availability-domain "$AD" \
      --shape "VM.Standard.A1.Flex" \
      --shape-config "{\"ocpus\":${OCPU},\"memoryInGBs\":${MEM}}" \
      --image-id "$IMAGE" \
      --subnet-id "$SUBNET" \
      --display-name "filo-a1-${OCPU}c${MEM}g-$(date +%m%d%H%M)" \
      --boot-volume-size-in-gbs $((OCPU * 50)) \
      --assign-public-ip true \
      --ssh-authorized-keys-file /tmp/_grab_ssh.pub \
      --region "$REGION" \
      2>&1 || echo "")

    if echo "$RESULT" | grep -q '"lifecycle-state"'; then
      IP=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('public-ip','할당중'))" 2>/dev/null || echo "IP 확인 필요")
      echo ""
      echo "================================================================"
      echo "  인스턴스 생성 성공! (${OCPU}코어 / ${MEM}GB)"
      echo "  Public IP: $IP"
      echo "  SSH: ssh opc@$IP"
      echo "================================================================"
      SUCCESS=1
      break
    elif echo "$RESULT" | grep -qi "capacity\|InternalError"; then
      echo "  용량 부족 - 다음 스펙 시도"
    else
      echo "  오류 발생"
    fi
  done

  rm -f /tmp/_grab_ssh.pub
  [ "$SUCCESS" -eq 1 ] && break

  echo "  30초 후 재시도..."
  sleep 30
done
